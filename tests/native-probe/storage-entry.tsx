/** Opt-in QA entry only; never imported by Expo Router or the production app. */
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { registerRootComponent } from 'expo';
import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import { Directory, File, Paths } from 'expo-file-system';
import { getRandomBytes, randomUUID } from 'expo-crypto';
import { openProtectedDatabase, type DatabaseProtectionPorts } from '../../src/offline/encryptedDatabase';
import { offlineNative } from '../../modules/roadguard-offline-crypto';
import { base64ToBytes } from '../../src/utils/base64';

function assert(value: unknown, category: string): asserts value { if (!value) throw Error(category); }
const base = SQLite.defaultDatabaseDirectory;
const uri = base.startsWith('/') ? 'file://' + base : base;
function ports(prefix: string): DatabaseProtectionPorts {
  return {
    open: name => SQLite.openDatabaseSync(name, {useNewConnection:true}, base + '/' + prefix),
    exists: name => new File(uri, prefix, name).exists,
    read: () => SecureStore.getItem(prefix + 'state'),
    save: value => SecureStore.setItem(prefix + 'state', value, {keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY}),
    randomHex: () => Array.from(getRandomBytes(32), b => b.toString(16).padStart(2,'0')).join(''),
  };
}
function initialize(p: DatabaseProtectionPorts) {
  if (p.read() !== null) return;
  const db = p.open('roadguard.db');
  db.execSync("CREATE TABLE specimen(id TEXT, value BLOB); INSERT INTO specimen VALUES('pending',x'00ff0102'),('duplicate',NULL),('duplicate',NULL); PRAGMA user_version=7");
  db.closeSync();
}
async function run() {
  const p = ports('rg.qa.storage.20261125.');
  initialize(p);
  const prior = p.read() !== null;
  const db = openProtectedDatabase(p);
  assert(db.getFirstSync<{n:number}>("SELECT count(*) n FROM specimen WHERE id='pending'")?.n === 1,'pending_missing');
  assert(db.getFirstSync<{n:number}>("SELECT count(*) n FROM specimen WHERE id='duplicate'")?.n === 2,'duplicate_multiset');
  await db.withExclusiveTransactionAsync(async tx => {
    await tx.runAsync("INSERT INTO specimen(id,value) SELECT 'committed',x'aa' WHERE NOT EXISTS(SELECT 1 FROM specimen WHERE id='committed')");
  });
  let rolledBack = false;
  try {
    await db.withExclusiveTransactionAsync(async tx => {
      await tx.runAsync("INSERT INTO specimen VALUES('rollback',x'bb')");
      throw Error('qa_expected_rollback');
    });
  } catch { rolledBack = true; }
  assert(rolledBack && db.getFirstSync<{n:number}>("SELECT count(*) n FROM specimen WHERE id='rollback'")?.n === 0,'rollback_failed');
  assert(db.getFirstSync<{n:number}>("SELECT count(*) n FROM specimen WHERE id='committed'")?.n === 1,'commit_failed');
  db.closeSync();
  const reopened = openProtectedDatabase(p);
  assert(reopened.getFirstSync<{hex:string}>("SELECT hex(value) hex FROM specimen WHERE id='pending'")?.hex === '00FF0102','blob_changed');
  reopened.closeSync();
  // Simulate termination after verified export but before ACTIVE metadata is persisted.
  const interrupted = ports('rg.qa.interruption.20261125.');
  initialize(interrupted);
  if (interrupted.read() === null) {
    const save = interrupted.save;
    let refused = false;
    try { openProtectedDatabase({...interrupted, save: value => {
      if (JSON.parse(value).phase === 'ACTIVE') throw Error('qa_interruption');
      save(value);
    }}); } catch { refused = true; }
    assert(refused && JSON.parse(interrupted.read()!).phase === 'COPYING','interruption_not_preserved');
  }
  const recovered = openProtectedDatabase(interrupted);
  assert(recovered.getFirstSync<{n:number}>('SELECT count(*) n FROM specimen')?.n === 3,'recovery_changed_rows');
  recovered.closeSync();
  // A wrong key must fail, without falling back to retained plaintext.
  const state = JSON.parse(p.read()!);
  let rejected = false;
  try { openProtectedDatabase({...p,read:() => JSON.stringify({...state,key:'11'.repeat(32)})}); } catch { rejected = true; }
  assert(rejected,'wrong_key_accepted');
  const media = await mediaBridge();
  return (prior ? 'PASS: restart, keyed transactions, rollback, blob, recovery, wrong key' : 'PASS: migration, keyed transactions, rollback, blob, recovery, wrong key') + '; ' + media;
}
async function mediaBridge() {
  assert(offlineNative,'media_native_missing');
  const directory = new Directory(Paths.document,'qa-media-vault-20261125');
  directory.create({intermediates:true,idempotent:true});
  const source = new File(directory,'js-source-v1');
  const expected = Uint8Array.from({length:131111},(_,i)=>i%251);
  if (!source.exists) source.write(expected);
  let restart = true;
  for (const role of ['REPAIR_CREW','DRONE_OPERATOR','REPORTER']) {
    const binding = JSON.stringify(['93939393-9393-4393-8393-939393939393','http://qa.invalid/api/v1',role]);
    const capability = await offlineNative.prepareMediaKey(binding);
    assert(capability.available,'media_key_missing');
    const name = 'rg.qa.media.bridge.20261125.' + role;
    let asset = SecureStore.getItem(name);
    if (!asset) {
      restart = false; asset = randomUUID();
      const saved = await offlineNative.sealMedia(binding,asset,source.uri);
      assert(saved.version===1 && saved.assetId===asset && saved.sizeBytes===expected.length && /^[a-f0-9]{64}$/.test(saved.checksumSha256),'media_metadata_invalid');
      SecureStore.setItem(name,asset,{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY});
    }
    const bytes = base64ToBytes(await offlineNative.readMediaRange(binding,asset,65530,65550));
    assert(bytes.length===65550 && bytes.every((b,i)=>b===expected[65530+i]),'media_bridge_range_changed');
    bytes.fill(0);
  }
  const original = await source.bytes();
  assert(original.length===expected.length && original.every((b,i)=>b===expected[i]),'media_original_changed');
  return restart ? 'three-role media bridge restart PASS' : 'three-role media bridge seal/read PASS';
}
function Probe() {
  const [result,setResult] = useState('Running isolated storage QA');
  useEffect(() => { void run().then(value => {
    console.info('STORAGE_ADAPTER_QA',value);setResult(value);
  }).catch(() => {console.error('STORAGE_ADAPTER_QA','FAIL');setResult('FAIL: inspect isolated probe');}); },[]);
  return <View style={{padding:30,paddingTop:80}}><Text accessibilityLabel="Storage QA result">{result}</Text></View>;
}
registerRootComponent(Probe);

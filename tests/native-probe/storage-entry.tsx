/** Opt-in QA entry only; never imported by Expo Router or the production app. */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { registerRootComponent } from 'expo';
import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import { Directory, File, Paths } from 'expo-file-system';
import { CryptoDigestAlgorithm, digest, getRandomBytes, randomUUID } from 'expo-crypto';
import { openProtectedDatabase, type DatabaseProtectionPorts } from '../../src/offline/encryptedDatabase';
import { offlineNative } from '../../modules/roadguard-offline-crypto';
import { base64ToBytes } from '../../src/utils/base64';
import { AppFontGate } from '../../src/components/AppFontGate';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { openMediaVaultAccess, type MediaVaultIdentity, type MediaVaultReference } from '../../src/offline/mediaVaultAccess';

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
  const version = Object.values(db.getFirstSync<Record<string,unknown>>('PRAGMA cipher_version') ?? {})[0];
  assert(typeof version === 'string' && /^4\./.test(version),'cipher_runtime_missing');
  const integrity = db.getAllSync<Record<string,unknown>>('PRAGMA integrity_check');
  assert(integrity.length === 1 && Object.values(integrity[0])[0] === 'ok','database_integrity_failed');
  // Bundled expo-sqlite/vendor/sqlcipher/sqlite3.c implements this PRAGMA in 4.17.
  // Do not interpret an unknown PRAGMA's empty result as an integrity proof.
  assert(version.startsWith('4.17.'),'cipher_integrity_runtime_unrecognized');
  assert(db.getAllSync('PRAGMA cipher_integrity_check').length === 0,'cipher_integrity_failed');
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
  // Stop after persisting COPYING but before ATTACH creates the candidate.
  // Dedicated QA storage only; no account data or existing probe is modified.
  const early = ports('rg.qa.pre-attach.20261125.');
  initialize(early);
  if (early.read() === null) {
    let stopped = false;
    try { openProtectedDatabase({...early, save: value => {
      early.save(value); throw Error('qa_before_candidate');
    }}); } catch { stopped = true; }
    assert(stopped && JSON.parse(early.read()!).phase === 'COPYING' &&
      !early.exists('roadguard.encrypted.v1.db'),'early_interruption_not_preserved');
  }
  const earlyKey = JSON.parse(early.read()!).key;
  const earlyRecovered = openProtectedDatabase(early);
  assert(JSON.parse(early.read()!).key === earlyKey,'early_recovery_key_changed');
  assert(earlyRecovered.getFirstSync<{n:number}>('SELECT count(*) n FROM specimen')?.n === 3,'early_recovery_changed_rows');
  assert(earlyRecovered.getFirstSync<{hex:string}>("SELECT hex(value) hex FROM specimen WHERE id='pending'")?.hex === '00FF0102','early_recovery_blob_changed');
  earlyRecovered.closeSync();
  // A wrong key must fail, without falling back to retained plaintext.
  const state = JSON.parse(p.read()!);
  let rejected = false;
  try { openProtectedDatabase({...p,read:() => JSON.stringify({...state,key:'11'.repeat(32)})}); } catch { rejected = true; }
  assert(rejected,'wrong_key_accepted');
  const media = await mediaBridge();
  return (prior ? 'PASS: restart, keyed transactions, integrity, rollback, blob, recovery, wrong key' : 'PASS: migration, keyed transactions, integrity, rollback, blob, recovery, wrong key') + '; ' + media;
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
  await mediaAccess(source.uri,expected);
  return (restart ? 'three-role media bridge restart PASS' : 'three-role media bridge seal/read PASS') + '; guarded media access PASS';
}
async function mediaAccess(sourceUri: string, expected: Uint8Array) {
  assert(offlineNative,'media_native_missing');
  const native = offlineNative;
  const hash = async (bytes: Uint8Array) => Array.from(new Uint8Array(await digest(CryptoDigestAlgorithm.SHA256,Uint8Array.from(bytes).buffer)),b=>b.toString(16).padStart(2,'0')).join('');
  const checksumSha256 = await hash(expected);
  for (const role of ['REPAIR_CREW','DRONE_OPERATOR','REPORTER'] as const) {
    let live: MediaVaultIdentity = {actor:'96969696-9696-4696-8696-969696969696',environment:'http://qa.invalid/api/v1',role,session:'isolated-session-1'};
    const first = openMediaVaultAccess(live,()=>live,{native,uuid:randomUUID,hash});
    const key = 'rg.qa.media.access.20261125.' + role;
    const saved = SecureStore.getItem(key);
    const ref: MediaVaultReference = saved ? JSON.parse(saved) : await first.seal(sourceUri,{sizeBytes:expected.length,checksumSha256});
    if (!saved) SecureStore.setItem(key,JSON.stringify(ref),{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY});
    for (const changed of [{actor:'97979797-9797-4797-8797-979797979797'}, {environment:'http://other-qa.invalid/api/v1'}, {role:role==='REPORTER'?'DRONE_OPERATOR' as const:'REPORTER' as const}]) {
      let denied = false;
      try { await first.readRange({...ref,...changed},0,10); } catch { denied = true; }
      assert(denied,'media_access_foreign_reference_accepted');
      // Independently exercise the native account/environment/role binding.
      const foreign = {...live,...changed};
      const binding = JSON.stringify([foreign.actor,foreign.environment,foreign.role]);
      denied = false;
      try { await native.readMediaRange(binding,ref.assetId,0,10); } catch { denied = true; }
      assert(denied,'media_native_foreign_binding_accepted');
    }
    const bytes = await first.readAll(ref,1024*1024);
    assert(bytes.length===expected.length && bytes.every((b,i)=>b===expected[i]),'media_access_bytes_changed');bytes.fill(0);
    live = {...live,session:'isolated-session-2'};
    let denied = false;
    try { await first.readRange(ref,0,10); } catch { denied = true; }
    assert(denied,'media_access_old_session_accepted');
    const reopened = openMediaVaultAccess(live,()=>live,{native,uuid:randomUUID,hash});
    const range = await reopened.readRange(ref,65530,65550);
    assert(range.every((b,i)=>b===expected[65530+i]),'media_access_reopen_changed');range.fill(0);
    const late = openMediaVaultAccess(live,()=>live,{uuid:randomUUID,hash,native:{
      prepareMediaKey:binding=>native.prepareMediaKey(binding),
      sealMedia:(binding,id,uri)=>native.sealMedia(binding,id,uri),
      readMediaRange:async(binding,id,offset,length)=>{
        const value = await native.readMediaRange(binding,id,offset,length);
        live = {...live,session:'isolated-session-3'};return value;
      },
    }});
    denied = false;
    try { await late.readRange(ref,0,10); } catch { denied = true; }
    assert(denied,'media_access_late_session_accepted');
  }
}
function Probe() {
  const [result,setResult] = useState('Running isolated storage QA');
  const [status,setStatus] = useState<'running'|'passed'|'failed'>('running');
  const [expanded,setExpanded] = useState(false);
  useEffect(() => { void run().then(value => {
    console.info('STORAGE_ADAPTER_QA',value);setResult(value);setStatus('passed');
  }).catch(() => {console.error('STORAGE_ADAPTER_QA','FAIL');setResult('FAIL: inspect isolated probe');setStatus('failed');}); },[]);
  const passed = status === 'passed';
  return <SafeAreaView style={styles.screen}>
    <StatusBar barStyle="dark-content" />
    <View style={styles.header}>
      <Image source={require('../../assets/logo_hoanghai_icon.png')} resizeMode="contain" style={styles.logo} accessible={false} />
      <Text style={styles.brand}>RoadGuard</Text>
      <Text style={styles.qaLabel}>Bản kiểm tra</Text>
    </View>
    <ScrollView contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" style={styles.title}>Kiểm tra kỹ thuật</Text>
      <Text style={styles.description}>Kiểm tra lưu trữ ngoại tuyến trên thiết bị này bằng dữ liệu thử riêng.</Text>
      <View style={styles.result} accessibilityLiveRegion="polite">
        <View style={styles.resultHeading}>
          {status === 'running' ? <ActivityIndicator color={colors.brandGold} /> :
            <MaterialIcons name={passed ? 'check-circle' : 'error-outline'} size={28} color={passed ? colors.success : colors.error} accessible={false} />}
          <Text style={styles.resultTitle}>{status === 'running' ? 'Đang kiểm tra lưu trữ…' : passed ? 'Kiểm tra lưu trữ đạt' : 'Kiểm tra chưa đạt'}</Text>
        </View>
        <Text style={styles.body}>{status === 'running' ? 'Đang kiểm tra cơ sở dữ liệu và ảnh mã hóa. Vui lòng chờ kết quả.' : passed ?
          'Cơ sở dữ liệu và ảnh mã hóa đã qua các bước kiểm tra của phiên này.' : 'Cần kiểm tra log kỹ thuật để xác định bước lỗi.'}</Text>
        {passed && <View style={styles.checks}>
          <Text style={styles.checkText}>Cơ sở dữ liệu: giao dịch và khôi phục</Text>
          <Text style={styles.checkText}>Ảnh mã hóa: đọc dữ liệu ở cả ba vai trò</Text>
        </View>}
      </View>
      <Text style={styles.note}>Kết quả này chỉ xác nhận phép thử lưu trữ. Luồng gửi dữ liệu lên máy chủ được kiểm tra riêng.</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={expanded ? 'Ẩn chi tiết kỹ thuật' : 'Xem chi tiết kỹ thuật'}
        accessibilityState={{expanded}} onPress={() => setExpanded(value => !value)}
        style={({pressed}) => [styles.disclosure, pressed && styles.pressed]}>
        <Text style={styles.disclosureText}>{expanded ? 'Ẩn chi tiết' : 'Xem chi tiết kỹ thuật'}</Text>
        <MaterialIcons name={expanded ? 'expand-less' : 'expand-more'} size={24} color={colors.secondary} accessible={false} />
      </Pressable>
      {expanded && <Text selectable style={styles.detail} accessibilityLabel="Kết quả kiểm tra lưu trữ">{passed
        ? `Đạt: ${result.startsWith('PASS: restart') ? 'mở lại cơ sở dữ liệu' : 'chuyển đổi cơ sở dữ liệu'}; giao dịch có khóa; hoàn tác; dữ liệu nhị phân; khôi phục khi gián đoạn; từ chối khóa sai.\n\nẢnh mã hóa: đọc ở cả ba vai trò, mở lại sau đổi phiên hợp lệ và chặn phiên đã thay đổi.`
        : status === 'running' ? 'Đang chạy phép kiểm tra riêng trên thiết bị.' : 'Phép kiểm tra chưa đạt. Xem nhật ký kỹ thuật để xác định nguyên nhân.'}</Text>}
    </ScrollView>
  </SafeAreaView>;
}
function Entry() { return <SafeAreaProvider><AppFontGate><Probe /></AppFontGate></SafeAreaProvider>; }
const styles = StyleSheet.create({
  screen: {flex:1,backgroundColor:colors.surfaceAlt},
  header: {flexDirection:'row',alignItems:'center',gap:spacing.sm,padding:spacing.md,backgroundColor:colors.surface,borderBottomWidth:1,borderBottomColor:colors.border,flexWrap:'wrap'},
  logo: {width:40,height:40}, brand: {...typography.titleLg,color:colors.secondary,flexShrink:1},
  qaLabel: {...typography.caption,color:colors.primaryDark,marginLeft:'auto'},
  content: {padding:spacing.lg,gap:spacing.md,maxWidth:600,width:'100%',alignSelf:'center',paddingBottom:spacing.xl},
  title: {...typography.headlineLg,color:colors.secondary,marginTop:spacing.sm},
  description: {...typography.bodyLg,color:colors.secondary},
  result: {backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:radius.lg,padding:spacing.md,gap:spacing.md,marginTop:spacing.sm},
  resultHeading: {flexDirection:'row',alignItems:'center',gap:spacing.sm},
  resultTitle: {...typography.titleMd,color:colors.onSurface,flex:1},
  body: {...typography.bodyMd,color:colors.secondary},
  checks: {borderTopWidth:1,borderTopColor:colors.border,paddingTop:spacing.md,gap:spacing.sm},
  checkText: {...typography.bodyMd,color:colors.onSurface},
  note: {...typography.bodyMd,color:colors.secondary},
  disclosure: {minHeight:48,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:spacing.sm,paddingVertical:spacing.sm},
  disclosureText: {...typography.labelLg,color:colors.primaryDark,flexShrink:1},
  pressed: {backgroundColor:colors.border,borderRadius:radius.md},
  detail: {...typography.bodyMd,color:colors.secondary,paddingBottom:spacing.md},
});
registerRootComponent(Entry);

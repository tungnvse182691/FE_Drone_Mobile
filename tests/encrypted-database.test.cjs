const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(){const m={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/offline/encryptedDatabase.ts','utf8'),{compilerOptions:{module:1}}).outputText,{module:m,exports:m.exports,require:()=>{throw Error('unexpected runtime dependency');}});return m.exports;}
test('runtime adapter converts Android SQLite filesystem directory to a file URI, retaining iOS URI',()=>{
 for(const directory of ['/data/user/0/com.hoanghai.roadguard/files/SQLite','file:///ios/Documents/SQLite']){
  const m={exports:{}},seen=[];
  const dependencies={
   'expo-sqlite':{defaultDatabaseDirectory:directory},
   'expo-constants':{default:{},ExecutionEnvironment:{StoreClient:'storeClient'}},
   'expo-file-system':{File:class{constructor(base,name){assert.ok(base.startsWith('file:///'),'native File requires absolute file URI');seen.push([base,name]);}get exists(){return false;}}},
   './encryptedDatabase':{openProtectedDatabase:ports=>{ports.exists('roadguard.encrypted.v1.db');return {};}}
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/offline/database.ts','utf8'),{compilerOptions:{module:1}}).outputText,{module:m,exports:m.exports,require:name=>dependencies[name]??{}});
  m.exports.openDatabase();assert.equal(seen[0][0],directory.startsWith('/')?'file://'+directory:directory);
 }
});
function fixture({cipher=true,state=null,exists=false,legacyExists=true,invalid=false,failSave=false,allowPlaintext=false}={}){
 const calls=[],secret={value:state},handles=[];let next=0;
 const connection=name=>{const id=++next;const db={name,id,databasePath:'/db/'+name,execSync(sql){calls.push([id,sql]);if(sql.startsWith('ATTACH'))exists=true;},
 getFirstSync(sql){calls.push([id,sql]);if(sql.includes('sqlcipher_export')&&invalid)throw Error('disk full');if(sql==='PRAGMA cipher_version')return cipher?{cipher_version:'4.17'}:null;if(sql.includes('user_version'))return {user_version:7};if(sql.includes('application_id'))return {application_id:123};if(sql.includes('EXCEPT'))return null;return {n:2};},
 getAllSync(sql){if(sql.includes('integrity_check'))return [{integrity_check:'ok'}];if(sql.includes('sqlite_master'))return [{type:'table',name:'local_draft',tbl_name:'local_draft',sql:'CREATE TABLE local_draft(id TEXT PRIMARY KEY,payload BLOB)'}];if(sql.includes('table_info'))return [{name:'id'},{name:'payload'}];return [];},
 closeSync(){calls.push([id,'CLOSE']);},execAsync:async sql=>{calls.push([id,sql]);},closeAsync:async()=>{calls.push([id,'CLOSE_ASYNC']);},
 withExclusiveTransactionAsync:async()=>{throw Error('unkeyed SDK transaction used');}};handles.push(db);return db;};
 const ports={allowPlaintext,open:connection,exists:name=>name==='roadguard.db'?legacyExists:exists,read:()=>secret.value,save:v=>{if(failSave)throw Error('secure store unavailable');secret.value=v;},randomHex:()=> 'ab'.repeat(32)};
 return {ports,calls,handles,secret};
}
test('migration verifies candidate before activation, retains original, and every transaction keys a dedicated connection',async()=>{
 const h=fixture(),db=load().openProtectedDatabase(h.ports);
 assert.equal(JSON.parse(h.secret.value).phase,'ACTIVE');assert.equal(db.name,'roadguard.encrypted.v1.db');
 const activate=h.calls.findIndex(x=>x[1].includes('sqlcipher_export'));assert.ok(activate>=0);
 await db.withExclusiveTransactionAsync(async tx=>{assert.notEqual(tx.id,db.id);await tx.execAsync('INSERT_TEST');});
 const tx=h.calls.filter(x=>x[0]===h.handles.at(-1).id).map(x=>x[1]);
 assert.ok(tx[0].startsWith('PRAGMA key'));assert.ok(tx.indexOf('BEGIN')>0);assert.ok(tx.indexOf('COMMIT')>tx.indexOf('INSERT_TEST'));assert.equal(tx.at(-1),'CLOSE_ASYNC');
 assert.equal(h.calls.some(x=>/DELETE FROM|DROP TABLE|VACUUM/.test(x[1])),false);
});
test('active encrypted state never opens legacy DB or regenerates its key',()=>{
 const state=JSON.stringify({version:1,phase:'ACTIVE',name:'roadguard.encrypted.v1.db',key:'cd'.repeat(32)}),h=fixture({state,exists:true});
 load().openProtectedDatabase(h.ports);assert.deepEqual(h.handles.map(x=>x.name),['roadguard.encrypted.v1.db']);assert.equal(h.secret.value,state);
});
test('failed migration preserves COPYING marker and source; ambiguous orphan or invalid secure metadata fails closed',()=>{
 const h=fixture({invalid:true});assert.throws(()=>load().openProtectedDatabase(h.ports),/LOCAL_STORAGE/);assert.equal(JSON.parse(h.secret.value).phase,'COPYING');
 assert.equal(h.calls.some(x=>/DROP|DELETE FROM/.test(x[1])),false);
 for(const options of [{exists:true},{state:'broken'},{state:JSON.stringify({version:1,phase:'ACTIVE',name:'other.db',key:'x'})}])assert.throws(()=>load().openProtectedDatabase(fixture(options).ports),/LOCAL_STORAGE/);
});
test('COPYING recovery re-verifies all source data before switching; mismatch does not activate',()=>{
 const state=JSON.stringify({version:1,phase:'COPYING',name:'roadguard.encrypted.v1.db',key:'ef'.repeat(32)}),h=fixture({state,exists:true});
 load().openProtectedDatabase(h.ports);assert.equal(JSON.parse(h.secret.value).phase,'ACTIVE');assert.equal(h.calls.some(x=>x[1].includes('sqlcipher_export')),false);
 const bad=fixture({state,exists:true});const open=bad.ports.open;bad.ports.open=name=>{const db=open(name),first=db.getFirstSync;db.getFirstSync=sql=>sql.includes('EXCEPT')?{different:1}:first(sql);return db;};
 assert.throws(()=>load().openProtectedDatabase(bad.ports),/LOCAL_STORAGE/);assert.equal(JSON.parse(bad.secret.value).phase,'COPYING');
});

test('restart between secure key save and candidate creation resumes export with the same key',()=>{
 const state=JSON.stringify({version:1,phase:'COPYING',name:'roadguard.encrypted.v1.db',key:'ef'.repeat(32)});
 const h=fixture({state});h.ports.randomHex=()=>{throw Error('must not replace saved key');};
 load().openProtectedDatabase(h.ports);
 assert.equal(JSON.parse(h.secret.value).phase,'ACTIVE');assert.equal(JSON.parse(h.secret.value).key,'ef'.repeat(32));
 assert.equal(h.calls.filter(x=>x[1].includes('sqlcipher_export')).length,1);
 assert.equal(h.calls.some(x=>/DROP|DELETE FROM|VACUUM/.test(x[1])),false);
 const broken=fixture({state,invalid:true});assert.throws(()=>load().openProtectedDatabase(broken.ports),/LOCAL_STORAGE/);
 assert.equal(broken.secret.value,state);
});

test('COPYING state without the original database cannot create or promote an empty replacement',()=>{
 const state=JSON.stringify({version:1,phase:'COPYING',name:'roadguard.encrypted.v1.db',key:'ef'.repeat(32)});
 for(const exists of [false,true]){
  const h=fixture({state,exists,legacyExists:false});
  assert.throws(()=>load().openProtectedDatabase(h.ports),/LOCAL_STORAGE/);
  assert.equal(h.handles.length,0);assert.equal(h.secret.value,state);
 }
});
test('Expo Go plaintext remains usable only without a pending/active encryption state',()=>{
 const h=fixture({cipher:false,allowPlaintext:true});const db=load().openProtectedDatabase(h.ports);assert.equal(db.name,'roadguard.db');assert.equal(h.secret.value,null);
 assert.throws(()=>load().openProtectedDatabase(fixture({cipher:false}).ports),/LOCAL_STORAGE/);
 const state=JSON.stringify({version:1,phase:'ACTIVE',name:'roadguard.encrypted.v1.db',key:'cd'.repeat(32)});
 assert.throws(()=>load().openProtectedDatabase(fixture({cipher:false,state,exists:true}).ports),/LOCAL_STORAGE/);
});
test('missing or wrong key, and failed SecureStore activation never fall back to legacy',()=>{
 const state=JSON.stringify({version:1,phase:'ACTIVE',name:'roadguard.encrypted.v1.db',key:'cd'.repeat(32)});
 const missing=fixture({state});assert.throws(()=>load().openProtectedDatabase(missing.ports),/LOCAL_STORAGE/);assert.equal(missing.handles.length,0);
 const wrong=fixture({state,exists:true}),open=wrong.ports.open;
 wrong.ports.open=name=>{const db=open(name),first=db.getFirstSync;db.getFirstSync=sql=>{if(sql.includes('sqlite_master'))throw Error('wrong key');return first(sql);};return db;};
 assert.throws(()=>load().openProtectedDatabase(wrong.ports),/LOCAL_STORAGE/);assert.deepEqual(wrong.handles.map(x=>x.name),['roadguard.encrypted.v1.db']);assert.ok(wrong.calls.some(x=>x[1]==='CLOSE'));
 const before=fixture({failSave:true});assert.throws(()=>load().openProtectedDatabase(before.ports),/LOCAL_STORAGE/);assert.equal(before.calls.some(x=>x[1].startsWith('ATTACH')),false);
 const after=fixture();const save=after.ports.save;after.ports.save=value=>{if(JSON.parse(value).phase==='ACTIVE')throw Error('locked');save(value);};
 assert.throws(()=>load().openProtectedDatabase(after.ports),/LOCAL_STORAGE/);assert.equal(JSON.parse(after.secret.value).phase,'COPYING');assert.equal(after.calls.filter(x=>x[1]==='CLOSE').length,2);
});
test('transaction failure rolls back and closes the dedicated keyed handle while main remains open',async()=>{
 const h=fixture(),db=load().openProtectedDatabase(h.ports);await assert.rejects(db.withExclusiveTransactionAsync(async()=>{throw Error('original failure');}),/original failure/);
 const tx=h.calls.filter(x=>x[0]===h.handles.at(-1).id).map(x=>x[1]);assert.ok(tx.includes('ROLLBACK'));assert.equal(tx.at(-1),'CLOSE_ASYNC');assert.equal(h.calls.some(x=>x[0]===db.id&&x[1]==='CLOSE_ASYNC'),false);
});

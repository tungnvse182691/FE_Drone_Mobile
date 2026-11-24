const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,dependencies){const mod={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:mod,exports:mod.exports,require:n=>{assert.ok(n in dependencies,'unexpected import '+n);return dependencies[n];},Map,console});return mod.exports;}
function fixture(){const rows=new Map(),faults={},calls=[];const db={execSync:()=>{if(faults.open)throw Error('sensitive open error');},getFirstSync:(_sql,[key])=>{if(faults.read)throw Error('sensitive read error');return rows.has(key)?{value:rows.get(key)}:null;},runSync:(sql,[key,value])=>{calls.push(sql);if(faults.write)throw Error('sensitive write error');if(sql.startsWith('DELETE'))rows.delete(key);else rows.set(key,value);}};const common=fs.existsSync('src/offline/kvStore.ts')?load('src/offline/kvStore.ts',{'./database':{openDatabase:()=>db}}):{};return {rows,faults,calls,common,sqlite:{openDatabaseSync:()=>db}};}
test('native state and device identity share the owned database and survive fresh JS runtimes',()=>{
 const f=fixture(),deps={'react-native':{Platform:{OS:'android'}},'../offline/kvStore':f.common,'expo-sqlite':f.sqlite,'zustand/middleware':{createJSONStorage:fn=>fn()}};
 const one=load('src/store/storage.ts',deps);one.appStateStorage.setItem('queue','pending');
 const two=load('src/store/storage.ts',deps);assert.equal(two.appStateStorage.getItem('queue'),'pending');
 const deviceDeps={'react-native':{Platform:{OS:'android'}},'../offline/kvStore':f.common,'expo-sqlite':f.sqlite,'../utils/uuid':{uuidv4:()=> 'generated-installation'}};
 assert.equal(load('src/constants/device.ts',deviceDeps).getDeviceId(),'generated-installation');
 deviceDeps['../utils/uuid'].uuidv4=()=>{throw Error('must not regenerate');};
 assert.equal(load('src/constants/device.ts',deviceDeps).getDeviceId(),'generated-installation');
});
test('failed native writes never appear saved through a memory fallback',()=>{
 const f=fixture(),state=load('src/store/storage.ts',{'react-native':{Platform:{OS:'android'}},'../offline/kvStore':f.common,'expo-sqlite':f.sqlite,'zustand/middleware':{createJSONStorage:fn=>fn()}}).appStateStorage;
 f.rows.set('queue','original');f.faults.write=true;
 assert.throws(()=>state.setItem('queue','replacement'),/LOCAL_STORAGE_UNAVAILABLE/);
 assert.throws(()=>state.removeItem('queue'),/LOCAL_STORAGE_UNAVAILABLE/);
 f.faults.write=false;assert.equal(state.getItem('queue'),'original');
 f.faults.read=true;assert.throws(()=>state.getItem('queue'),e=>e.message==='LOCAL_STORAGE_UNAVAILABLE');
});
test('unreadable or unwritable identity does not regenerate or cache a volatile device ID',()=>{
 const f=fixture();let generated=0;
 const device=load('src/constants/device.ts',{'react-native':{Platform:{OS:'android'}},'../offline/kvStore':f.common,'expo-sqlite':f.sqlite,'../utils/uuid':{uuidv4:()=>{generated++;return 'new-id';}}});
 f.faults.read=true;assert.throws(()=>device.getDeviceId(),/LOCAL_STORAGE_UNAVAILABLE/);assert.equal(generated,0);
 f.faults.read=false;f.faults.write=true;assert.throws(()=>device.getDeviceId(),/LOCAL_STORAGE_UNAVAILABLE/);
 f.faults.write=false;f.rows.set('roadguard.device-id','original-device');assert.equal(device.getDeviceId(),'original-device');
});

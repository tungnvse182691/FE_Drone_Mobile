const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const {DatabaseSync}=require('node:sqlite');
function fixture(){
 const disk=new DatabaseSync(':memory:');disk.exec('CREATE TABLE task_cache(id TEXT PRIMARY KEY,kind TEXT,data TEXT,cached_at TEXT)');
 let scope='session-A',fail=false;const listeners=new Set();
 const db={runAsync:async(sql,...a)=>{if(fail)throw Error('disk');return disk.prepare(sql).run(...a);},getFirstAsync:async(sql,...a)=>disk.prepare(sql).get(...a)};
 const deps={'../store/auth':{useAuthStore:{subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);}}},'../offline/database':{openDatabase:()=>db,initDatabase:async()=>{}},'../hooks/useOperatorReadScope':{operatorReadScope:()=>scope}};
 const load=()=>{const mod={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/api/operatorOfflineCache.ts','utf8'),{compilerOptions:{module:1}}).outputText,{module:mod,exports:mod.exports,require:n=>deps[n],Date});return mod.exports;};
 return{load,change:v=>{scope=v;listeners.forEach(fn=>fn());},fail:()=>fail=true,disk};
}
test('Operator read snapshot survives runtime recreation, retains timestamp, and removes cached mutation headers',async()=>{
 const f=fixture();await f.load().readOperatorSnapshot('task:1',async()=>({data:{id:'1'},etag:'"version"'}));
 const r=await f.load().readOperatorSnapshot('task:1',async()=>{throw {request:{}};});
 assert.equal(r.data.id,'1');assert.equal(r.etag,null);assert.ok(Date.parse(r.cachedAt));
});
test('Operator cache never crosses session or resource and does not conceal HTTP denial',async()=>{
 const f=fixture(),api=f.load();await api.readOperatorSnapshot('task:1',async()=>({data:{id:'1'}}));
 for(const status of [401,403,404,500])await assert.rejects(api.readOperatorSnapshot('task:1',async()=>{throw {response:{status}};}));
 await assert.rejects(api.readOperatorSnapshot('task:1',async()=>{throw {request:{}};}));
 await api.readOperatorSnapshot('task:1',async()=>({data:{id:'1'}}));f.change('session-B');
 await assert.rejects(api.readOperatorSnapshot('task:1',async()=>{throw {request:{}};}));
 f.change('session-A');await assert.rejects(api.readOperatorSnapshot('task:2',async()=>{throw {request:{}};}));
});
test('Operator cache rejects late session response, corrupt disk data and does not hide a successful GET on disk failure',async()=>{
 const f=fixture(),api=f.load();await assert.rejects(api.readOperatorSnapshot('task:1',async()=>{f.change('B');return {data:{}};}));
 f.change('session-A');await api.readOperatorSnapshot('task:1',async()=>({data:{id:'1'}}));
 f.disk.exec("UPDATE task_cache SET data='broken'");await assert.rejects(api.readOperatorSnapshot('task:1',async()=>{throw {request:{}};}));
 f.fail();const result=await api.readOperatorSnapshot('task:2',async()=>({data:{id:'2'}}));assert.equal(result.data.id,'2');assert.equal(result.cachedAt,null);
});
test('Operator cache rejects an account bounce even when the original session is restored',async()=>{
 const f=fixture();await assert.rejects(f.load().readOperatorSnapshot('task:1',async()=>{f.change('B');f.change('session-A');return {data:{id:'1'}};}));
 assert.equal(f.disk.prepare('SELECT count(*) AS n FROM task_cache').get().n,0);
});

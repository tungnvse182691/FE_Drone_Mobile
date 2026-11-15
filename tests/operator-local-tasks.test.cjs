const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const {DatabaseSync}=require('node:sqlite');
const scope=JSON.stringify(['env',JSON.stringify(['A','session']), '']);
function harness(){
 const disk=new DatabaseSync(':memory:');disk.exec('CREATE TABLE task_cache(id TEXT PRIMARY KEY, kind TEXT, data TEXT, cached_at TEXT)');
 let during=()=>{};
 const db={getAllAsync:async(sql,...args)=>{during();return disk.prepare(sql).all(...args);},getFirstAsync:async(sql,...args)=>{during();return disk.prepare(sql).get(...args);}};
 const module={exports:{}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/offline/operatorLocalTasks.ts','utf8'),{compilerOptions:{module:1}}).outputText,
 {module,exports:module.exports,require:()=>({openDatabase:()=>db,initDatabase:async()=>{}}),Date});
 const put=(resource,items,ownerScope=scope,date='2026-11-15T00:00:00Z')=>{
 const value=resource.startsWith('tasks:')?{items}:{data:items[0]};
 disk.prepare('INSERT OR REPLACE INTO task_cache VALUES(?,?,?,?)').run(JSON.stringify(['operator_read_v1',ownerScope,resource]),'operator_read_v1',JSON.stringify({schema:1,scope:ownerScope,resource,value}),date);
 };
 return{disk,put,load:module.exports.loadLocalOperatorTasks,work:module.exports.loadLocalOperatorWork,during:fn=>during=fn};
}
const task={id:'task-A',operatorId:'A',status:'ACCEPTED',version:'not-mutation-authority',scope:[{segmentIds:['1','2']}]};
test('cold local view deduplicates exact-session GET snapshots without exposing versions',async()=>{
 const h=harness();h.put('tasks:',[task]);h.put('task:task-A',[{...task,status:'SUBMITTED'}],scope,'2026-11-15T01:00:00Z');
 const rows=await h.load(scope,()=>true);assert.equal(rows.length,1);assert.equal(rows[0].status,'SUBMITTED');assert.equal(rows[0].segmentCount,2);
 assert.equal(rows[0].version,undefined);assert.equal(rows[0].operatorId,undefined);
});
test('local work package is exact task/session scoped and strips mutation versions',async()=>{
 const h=harness();const work={task:{...task,projectId:'project'},geometryRefs:[{routeVersionId:'r',segmentSetId:'s',segmentIds:['1']}],dueAt:'2026-11-16T00:00:00Z',accessPoint:{point:{longitude:106.6,latitude:10.8}}};
 h.put('work:task-A',[work]);
 const read=await h.work(scope,'task-A',()=>true);assert.equal(read.taskId,'task-A');assert.equal(read.segmentCount,1);assert.deepEqual(Array.from(read.access),[106.6,10.8]);assert.equal(read.version,undefined);
 assert.equal(await h.work(scope,'other',()=>true),null);
 h.put('work:task-A',[{...work,task:{...work.task,operatorId:'B'}}]);assert.equal(await h.work(scope,'task-A',()=>true),null);
});
test('local view rejects other actor, environment/session, corrupt snapshot and resource substitution',async()=>{
 const h=harness();h.put('tasks:',[{...task,operatorId:'B'}]);h.put('tasks:old',[task],JSON.stringify(['env',JSON.stringify(['A','other']), '']));
 h.put('tasks:env',[task],JSON.stringify(['other',JSON.stringify(['A','session']), '']));
 h.put('task:wrong',[task]);h.put('tasks:corrupt',[task]);h.disk.exec("UPDATE task_cache SET data='broken' WHERE data LIKE '%tasks:corrupt%'");
 assert.equal((await h.load(scope,()=>true)).length,0);
});
test('local read stops after session change during SQLite await',async()=>{
 const h=harness();let active=true;h.put('tasks:',[task]);h.during(()=>active=false);
 await assert.rejects(h.load(scope,()=>active),/local_session_changed/);
});

const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const {DatabaseSync}=require('node:sqlite');
const {mkdtempSync}=fs,os=require('node:os'),path=require('node:path');
function load(sqlite){
  const m={exports:{}};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/offline/database.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,
    {module:m,exports:m.exports,require:()=>sqlite,Date});
  return m.exports;
}
const tick=()=>new Promise(r=>setImmediate(r));
test('A1 ignores poisoned native cache and retains one dedicated handle for all callers',async()=>{
  const calls=[],db={execAsync:async()=>{},getAllAsync:async()=>[{name:'task_id'},{name:'expected_version'}]};
  const broken={execAsync:async()=>{throw Error('NativeDatabase.execAsync NullPointerException');}};
  const a=load({openDatabaseSync:(name,options)=>{calls.push({name,options});return options?.useNewConnection?db:broken;}});
  const first=a.openDatabase();await a.initDatabase(first);
  assert.equal(a.openDatabase(),first);
  assert.equal(calls.length,1);assert.equal(calls[0].name,'roadguard.db');assert.equal(calls[0].options.useNewConnection,true);
});
test('A1 concurrent init shares DDL/migration; failed init remains retryable without replacing data or connection',async()=>{
  let ddl=0,reads=0,release,fail=true;
  const gate=new Promise(r=>release=r);
  const db={execAsync:async()=>{ddl++;await gate;if(fail)throw Error('database or disk is full');},getAllAsync:async()=>{reads++;return [{name:'task_id'},{name:'expected_version'}];}};
  const a=load({openDatabaseSync:()=>db}),conn=a.openDatabase();
  const first=a.initDatabase(conn),second=a.initDatabase(conn);
  await tick();assert.equal(ddl,1);release();
  await assert.rejects(first,/disk is full/);await assert.rejects(second,/disk is full/);
  fail=false;await a.initDatabase(conn);await a.initDatabase(conn);
  assert.equal(ddl,2);assert.equal(reads,2);assert.equal(a.openDatabase(),conn);
});
test('A1 disk SQLite reopen preserves legacy rows and immutable commands through concurrent initialization',async()=>{
  // Only a newly created OS temp fixture. Never opens the application database.
  const file=path.join(mkdtempSync(path.join(os.tmpdir(),'roadfe-a1-')),'fixture.db');
  const open=()=>{
    const native=new DatabaseSync(file);
    return {native,execAsync:async sql=>native.exec(sql),getAllAsync:async(sql,...args)=>native.prepare(sql).all(...args)};
  };
  let db=open();
  db.native.exec('CREATE TABLE local_draft(id TEXT PRIMARY KEY,kind TEXT NOT NULL,payload TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)');
  const payload=JSON.stringify({phase:'UNKNOWN_OUTCOME',key:'fixture-key',ifMatch:'"fixture-version"',body:'immutable',scope:'old-session'});
  db.native.prepare('INSERT INTO local_draft VALUES(?,?,?,?,?)').run('old','fixture',payload,'before','before');
  let a=load({openDatabaseSync:()=>db});await Promise.all([a.initDatabase(db),a.initDatabase(db)]);
  assert.equal(db.native.prepare('SELECT payload FROM local_draft').get().payload,payload);db.native.close();
  db=open();a=load({openDatabaseSync:()=>db});await a.initDatabase(a.openDatabase());
  assert.deepEqual({...db.native.prepare('SELECT * FROM local_draft').get()},{id:'old',kind:'fixture',payload,created_at:'before',updated_at:'before'});
  db.native.close();
});

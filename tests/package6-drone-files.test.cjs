const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const {DatabaseSync}=require('node:sqlite'),{randomUUID}=require('node:crypto');
const {pathToFileURL,fileURLToPath}=require('node:url');
const id=n=>`${String(n).padStart(8,'0')}-1111-4111-8111-111111111111`;
function fixture(){
 const root=fs.mkdtempSync(path.resolve('.cache/drone-files-')),dbPath=path.join(root,'draft.db');let disk;
 const reopen=()=>{disk?.close();disk=new DatabaseSync(dbPath);disk.exec('CREATE TABLE IF NOT EXISTS local_draft(id TEXT PRIMARY KEY,kind TEXT,payload TEXT,created_at TEXT,updated_at TEXT)');};reopen();
 const db={runAsync:async(sql,...args)=>disk.prepare(sql).run(...args),getAllAsync:async(sql,...args)=>disk.prepare(sql).all(...args)};
 const listeners=new Set();let actor=id(1),sid='A',env='https://fixture.test',copy=async(from,to)=>fs.copyFileSync(from,to,fs.constants.COPYFILE_EXCL);
 const docs=pathToFileURL(root+path.sep).href;
 class File {constructor(...parts){this.uri=parts.map(p=>p.uri??p).join('/').replace(/([^:])\/{2,}/g,'$1/');}get exists(){return fs.existsSync(fileURLToPath(this.uri));}get size(){return this.exists?fs.statSync(fileURLToPath(this.uri)).size:0;}async copy(to){await copy(fileURLToPath(this.uri),fileURLToPath(to.uri));}async move(to){fs.renameSync(fileURLToPath(this.uri),fileURLToPath(to.uri));this.uri=to.uri;}}
 class Directory extends File {create(){fs.mkdirSync(fileURLToPath(this.uri),{recursive:true});}}
 const task={id:id(2),projectId:id(3),operatorId:actor,version:'AAAAAAAAAAE='};
 const deps={'expo-file-system':{File,Directory,Paths:{document:{uri:docs}}},'expo-crypto':{randomUUID},'../offline/database':{openDatabase:()=>db,initDatabase:async()=>{}},'../store/auth':{useAuthStore:{getState:()=>({token:sid,status:'AUTHENTICATED',user:{id:actor,role_code:'DRONE_OPERATOR'}}),subscribe:f=>{listeners.add(f);return()=>listeners.delete(f);}}},'./authApi':{passwordSessionIdentity:()=>JSON.stringify([actor,sid])},'./client':{apiClient:{defaults:{get baseURL(){return env;}}}},'./droneApi':{getOperatorSurveyTaskDetailReal:async()=>({data:task,etag:`"${task.version}"`})}};
 const mod={exports:{}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/api/droneLocalFiles.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:mod,exports:mod.exports,require:n=>{if(!deps[n])throw Error(n);return deps[n];},Date});
 const source=path.join(root,'source.mp4');fs.writeFileSync(source,Buffer.from([1,2,3,4]));
 return {api:mod.exports,reopen,task,source,asset:{name:'flight.mp4',uri:pathToFileURL(source).href,size:4},rows:()=>disk.prepare('SELECT * FROM local_draft').all(),copy:f=>copy=f,change:(a=actor,s=sid,e=env)=>{actor=a;sid=s;env=e;listeners.forEach(f=>f());},listeners};
}
test('Drone private copy and immutable ownership survive restart/relogin without upload or fake checksum',async()=>{
 const f=fixture(),r=await f.api.openDroneLocalFiles(id(2)),saved=await r.preserve('VIDEO',f.asset);r.close();
 assert.equal(fs.readFileSync(fileURLToPath(saved.uri)).toString('hex'),'01020304');
 const payload=f.rows()[0].payload;f.reopen();f.change(id(1),'B');
 const next=await f.api.openDroneLocalFiles(id(2)),files=await next.list();
 assert.equal(files.length,1);assert.equal(files[0].availability,'LOCAL_UNHASHED');assert.equal(files[0].session,JSON.stringify([id(1),'A']));
 assert.equal(files[0].checksumSha256,null);assert.equal(f.rows()[0].payload,payload);next.close();
});
test('Drone missing/partial copy is retained for recovery and never marked VERIFIED',async()=>{
 for(const partial of [false,true]){
  const f=fixture(),r=await f.api.openDroneLocalFiles(id(2));f.copy(async(from,to)=>{if(partial)fs.writeFileSync(to,Buffer.from([1]));throw Error('disk full');});
  await assert.rejects(r.preserve('VIDEO',f.asset));assert.equal(f.rows().length,1);r.close();f.reopen();
  const next=await f.api.openDroneLocalFiles(id(2)),rows=await next.list();assert.equal(rows[0].availability,partial?'INCOMPLETE':'MISSING');assert.equal(rows[0].checksumSha256,null);next.close();
 }
});
test('Drone file history stays isolated by actor/environment/task; late copy cannot enter new session',async()=>{
 const f=fixture(),r=await f.api.openDroneLocalFiles(id(2));f.copy(async(from,to)=>{fs.copyFileSync(from,to);f.change(id(1),'B');});
 await assert.rejects(r.preserve('VIDEO',f.asset),/drone_file_session_changed/);assert.equal(f.rows().length,1);r.close();
 for(const [actor,env,task] of [[id(8),'https://fixture.test',id(2)],[id(1),'https://other.test',id(2)],[id(1),'https://fixture.test',id(9)]]){
  f.change(actor,'B',env);const next=await f.api.openDroneLocalFiles(task);assert.equal((await next.list()).length,0);next.close();
 }
});
test('Drone rejects wrong task ownership, unsafe URI and invalid/changed source sizes without deleting history',async()=>{
 const f=fixture(),r=await f.api.openDroneLocalFiles(id(2));
 for(const asset of [{...f.asset,uri:'https://external.test/file.mp4'},{...f.asset,size:5},{...f.asset,name:'not-video.txt'}])await assert.rejects(r.preserve('VIDEO',asset));
 assert.equal(f.rows().length,0);f.task.operatorId=id(8);await assert.rejects(r.preserve('VIDEO',f.asset));assert.equal(f.rows().length,0);r.close();
});

const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const {DatabaseSync}=require('node:sqlite'),{randomUUID}=require('node:crypto');
const {pathToFileURL,fileURLToPath}=require('node:url');
const id=n=>`${String(n).padStart(8,'0')}-1111-4111-8111-111111111111`;
function fixture(){
 const root=fs.mkdtempSync(path.resolve('.cache/drone-files-')),dbPath=path.join(root,'draft.db');let disk,sourceSize;
 const reopen=()=>{disk?.close();disk=new DatabaseSync(dbPath);disk.exec('CREATE TABLE IF NOT EXISTS local_draft(id TEXT PRIMARY KEY,kind TEXT,payload TEXT,created_at TEXT,updated_at TEXT)');};reopen();
 const db={runAsync:async(sql,...args)=>disk.prepare(sql).run(...args),getAllAsync:async(sql,...args)=>disk.prepare(sql).all(...args)};
 const listeners=new Set();let actor=id(1),sid='A',env='https://fixture.test',copy=async(from,to)=>fs.copyFileSync(from,to,fs.constants.COPYFILE_EXCL);
 const docs=pathToFileURL(root+path.sep).href;
 class File {constructor(...parts){this.uri=parts.map(p=>p.uri??p).join('/').replace(/([^:])\/{2,}/g,'$1/');}get exists(){return fs.existsSync(fileURLToPath(this.uri));}get size(){return this.uri.endsWith('/source.mp4')&&sourceSize!==undefined?sourceSize:this.exists?fs.statSync(fileURLToPath(this.uri)).size:0;}async copy(to){await copy(fileURLToPath(this.uri),fileURLToPath(to.uri));}async move(to){fs.renameSync(fileURLToPath(this.uri),fileURLToPath(to.uri));this.uri=to.uri;}open(){const bytes=fs.readFileSync(fileURLToPath(this.uri));let offset=0;return {get offset(){return offset;},set offset(v){offset=v;},readBytes:async length=>{const chunk=Uint8Array.from(bytes.subarray(offset,offset+Math.min(length,2)));offset+=chunk.length;return chunk;},close(){}};}readableStream(){const bytes=fs.readFileSync(fileURLToPath(this.uri));let offset=0;return new ReadableStream({pull(controller){if(offset>=bytes.length){controller.close();return;}const end=Math.min(offset+2,bytes.length);controller.enqueue(Uint8Array.from(bytes.subarray(offset,end)));offset=end;}});}}
 class Directory extends File {create(){fs.mkdirSync(fileURLToPath(this.uri),{recursive:true});}}
 const task={id:id(2),projectId:id(3),operatorId:actor,version:'AAAAAAAAAAE='};
 const deps={'expo-file-system':{File,Directory,Paths:{document:{uri:docs}}},'expo-crypto':{randomUUID},'../offline/database':{openDatabase:()=>db,initDatabase:async()=>{}},'../store/auth':{useAuthStore:{getState:()=>({token:sid,status:'AUTHENTICATED',user:{id:actor,role_code:'DRONE_OPERATOR'}}),subscribe:f=>{listeners.add(f);return()=>listeners.delete(f);}}},'./authApi':{passwordSessionIdentity:()=>JSON.stringify([actor,sid])},'./client':{apiClient:{defaults:{get baseURL(){return env;}}}},'./droneApi':{getOperatorSurveyTaskDetailReal:async()=>({data:task,etag:`"${task.version}"`})}};
 const mod={exports:{}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/api/droneLocalFiles.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:mod,exports:mod.exports,require:n=>{if(!deps[n])throw Error(n);return deps[n];},Date});
 const source=path.join(root,'source.mp4');fs.writeFileSync(source,Buffer.from([1,2,3,4]));
 return {api:mod.exports,reopen,task,source,asset:{name:'flight.mp4',uri:pathToFileURL(source).href,size:4},rows:()=>disk.prepare('SELECT * FROM local_draft').all(),copy:f=>copy=f,change:(a=actor,s=sid,e=env)=>{actor=a;sid=s;env=e;listeners.forEach(f=>f());},listeners,sourceSize:n=>sourceSize=n};
}
test('Drone private copy and immutable ownership survive restart/relogin without upload or fake checksum',async()=>{
 const f=fixture(),r=await f.api.openDroneLocalFiles(id(2)),saved=await r.preserve('VIDEO',f.asset);r.close();
 assert.equal(fs.readFileSync(fileURLToPath(saved.uri)).toString('hex'),'01020304');
 const payload=f.rows()[0].payload;f.reopen();f.change(id(1),'B');
 const next=await f.api.openDroneLocalFiles(id(2)),files=await next.list();
 assert.equal(files.length,1);assert.equal(files[0].availability,'LOCAL_READY');assert.equal(files[0].session,JSON.stringify([id(1),'A']));
 assert.equal(files[0].checksumSha256,'9f64a747e1b97f131fabb6b447296c9b6f0201e79fb3c5356e6c77e89b6a806a');assert.equal(f.rows()[0].payload,payload);next.close();
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

test('Drone local preservation rejects files above pinned per-purpose BE limits before writing metadata',async()=>{for(const [kind,name,size] of [['VIDEO','large.mp4',8*1024**3+1],['TELEMETRY','large.srt',10*1024**2+1]]){const f=fixture(),r=await f.api.openDroneLocalFiles(id(2));f.sourceSize(size);let copied=0;f.copy(async()=>{copied++;throw Error('must not copy');});await assert.rejects(r.preserve(kind,{...f.asset,name,size}));assert.equal(f.rows().length,0);assert.equal(copied,0);r.close();}});
test('Drone stream hashing matches SHA-256 vector across an odd final chunk',async()=>{
 const f=fixture();fs.writeFileSync(f.source,Buffer.from('abc'));const r=await f.api.openDroneLocalFiles(id(2));
 const saved=await r.preserve('VIDEO',{...f.asset,size:3});
 assert.equal(saved.checksumSha256,'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');r.close();
});

test('Operator native range reader handles short reads and rejects invalid bounds',async()=>{
 const f=fixture(),r=await f.api.openDroneLocalFiles(id(2)),saved=await r.preserve('VIDEO',f.asset);
 assert.deepEqual(Array.from(await f.api.readDroneFileRange(saved,1,3)),[2,3,4]);
 for(const [offset,length] of [[-1,2],[0,0],[3,2],[0,65*1024**2]])await assert.rejects(f.api.readDroneFileRange(saved,offset,length));
 fs.writeFileSync(fileURLToPath(saved.uri),Buffer.from([1]));await assert.rejects(f.api.readDroneFileRange(saved,0,2),/size_changed/);r.close();
});

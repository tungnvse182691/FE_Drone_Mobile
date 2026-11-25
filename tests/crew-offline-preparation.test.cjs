const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),{randomUUID:id}=require('node:crypto');
function load(file,deps){const m={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:m,exports:m.exports,Date,require:n=>{if(!(n in deps))throw Error('unmocked '+n);return deps[n];}});return m.exports;}
function fixture(){
 const identity={actor:id(),role:'REPAIR_CREW',environment:'http://fixture/api/v1',scope:'A',partition:'fixture'},project=id(),task=id(),deviceId=id(),registration=id(),snapshotId=id(),assignment=id();
 const device={id:registration,projectId:project,actorId:identity.actor,role:'RepairCrew',deviceId,revokedAt:null,signingPublicKey:'sign',encryptionPublicKey:'enc'};
 const snapshot={id:snapshotId,taskId:task,assignmentId:assignment,originalActorId:identity.actor,deviceRegistrationId:registration,taskVersion:'AAAAAAAAB9E=',assignmentHash:'a'.repeat(64),contentHash:'b'.repeat(64),downloadedAt:new Date().toISOString(),snapshot:{id:task,projectId:project,assignmentId:assignment,originalActorId:identity.actor,location:{coordinates:[106,10]}}};
 const row=(kind,path,body,receipt,proof={})=>({identity,projectId:project,phase:'RECONCILED',proof:{kind,...proof},path:`/projects/${project}/offline/${path}`,body:JSON.stringify(body),receipt});
 const rows=[row('enrollment','devices',{deviceId,signingPublicKey:'sign',encryptionPublicKey:'enc'},device),row('snapshot','snapshots',{deviceRegistrationId:registration,taskId:task},snapshot,{assignmentId:assignment,taskVersion:snapshot.taskVersion})];
 let active=true,reads=0;
 const guard=()=>{if(!active)throw Error('session_changed');};
 const w=load('src/api/crewOfflineWorkflow.ts',{'./client':{},'./crewSafetyWorkflow':{crewReadGuard:guard},'./crewApi':{isCrewResourceId:x=>typeof x==='string'&&/^[a-f0-9-]{36}$/i.test(x),isRepairItemVersion:x=>x===snapshot.taskVersion},'./crewOfflineJournal':{},'../../modules/roadguard-offline-crypto':{}});
 const module=load('src/api/crewOfflineDevice.ts',{'../../modules/roadguard-offline-crypto':{},'./crewSafetyWorkflow':{crewReadGuard:guard},'./crewApi':{isCrewResourceId:x=>typeof x==='string'&&/^[a-f0-9-]{36}$/i.test(x)},'./crewOfflineCrypto':{},'./crewOfflineJournal':{openOfflineJournal:async()=>({list:async()=>{reads++;return rows;}})},'./crewOfflineWorkflow':w,'../utils/uuid':{}});
 return {module,identity,project,task,deviceId,registration,snapshotId,rows,device,snapshot,get reads(){return reads;},switch:()=>active=false};
}
test('local source uses only reconciled device/snapshot receipts, without HTTP',async()=>{const h=fixture();const source=await h.module.readLocalOfflineSources(h.identity,h.project,h.registration,h.deviceId);assert.equal(source.device.id,h.registration);assert.equal(source.snapshots[0].id,h.snapshotId);assert.equal(h.reads,1);});
for(const change of ['session','actor','environment','project','unconfirmed','revoked','body','nested-project'])test(`local source rejects ${change} instead of guessing authority`,async()=>{
 const h=fixture();
 if(change==='session')h.rows[0].identity={...h.identity,scope:'old'};
 if(change==='actor')h.device.actorId=id();
 if(change==='environment')h.rows[0].identity={...h.identity,environment:'http://other/api/v1'};
 if(change==='project')h.rows[0].projectId=id();
 if(change==='unconfirmed')h.rows[0].phase='RECEIVED';
 if(change==='revoked')h.rows.push({...h.rows[0],phase:'PREPARED',proof:{kind:'revocation',registrationId:h.registration}});
 if(change==='body')h.rows[0].body=JSON.stringify({deviceId:h.deviceId,signingPublicKey:'other',encryptionPublicKey:'enc'});
 if(change==='nested-project')h.snapshot.snapshot.projectId=id();
 await assert.rejects(h.module.readLocalOfflineSources(h.identity,h.project,h.registration,h.deviceId));
});
test('local source denies reads after session changes',async()=>{const h=fixture();h.switch();await assert.rejects(h.module.readLocalOfflineSources(h.identity,h.project,h.registration,h.deviceId),/session/);assert.equal(h.reads,0);});

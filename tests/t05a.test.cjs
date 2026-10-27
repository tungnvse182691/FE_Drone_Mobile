const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const actor='11111111-1111-4111-8111-111111111111',project='22222222-2222-4222-8222-222222222222',id='33333333-3333-4333-8333-333333333333',assignment='44444444-4444-4444-8444-444444444444';
const version='AAAAAAAAB9E=',etag='"'+version+'"';
const detail=(status='NewAssigned')=>({id,projectId:project,assignedToUserId:actor,assignmentId:assignment,version,status});
function harness(){
 const calls=[],m={exports:{}};let scope='A/s1',row=null,status='NewAssigned',failure=null;
 const client={get:async url=>{calls.push(['GET',url]);return {data:detail(status),headers:{etag}}},post:async(...args)=>{calls.push(['POST',...args]);if(failure)throw failure;status=args[0].endsWith('/accept')?'Accepted':'Rejected';return {data:detail(status),headers:{etag}}}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/api/crewApi.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,{module:m,exports:m.exports,require:n=>n==='./client'?{apiClient:client}:n==='axios'?require('axios'):{parseProblemDetails:()=>({})}});
 const port={currentScope:()=>scope,currentActor:()=>scope.startsWith('B/')?id:actor,read:async()=>row,write:async r=>{row=JSON.parse(JSON.stringify(r))}};
 return {api:m.exports,port,calls,client,setScope:s=>scope=s,setFailure:f=>failure=f,get row(){return row}};
}
test('T05A action guard does not require GPS/title/type/mode',()=>{
 const {api}=harness();for(const action of ['accept','reject'])assert.equal(api.fieldCommandBlock(detail(),etag,actor,action),null);
 assert.equal(api.fieldCommandBlock(detail('Accepted'),etag,actor,'start'),null);
});
for(const [change,tag,who,action] of [[{projectId:''},etag,actor,'accept'],[{},'',actor,'accept'],[{},'W/'+etag,actor,'accept'],[{},etag,id,'accept'],[{assignmentId:null},etag,actor,'accept'],[{status:'InProgress'},etag,actor,'start']])test('T05A invalid identity/version/state fails closed '+JSON.stringify(change)+tag+who,()=>assert.ok(harness().api.fieldCommandBlock({...detail(),...change},tag,who,action)));
function command(h,action='accept',reason='Nhận nhiệm vụ') {return h.api.createFieldCommand({task:detail(action==='start'?'Accepted':'NewAssigned'),etag,actorId:actor,scope:'A/s1',action,reason,key:'stable-key',originId:assignment,claimedAt:'2026-10-28T01:00:00Z'});}
test('T05A accept uses exact DTO/headers and GET readback',async()=>{
 const h=harness(),c=command(h);await h.port.write(c);const result=await h.api.executeFieldCommand(c,h.port,true);
 assert.equal(result.phase,'confirmed');assert.equal(result.task.status,'Accepted');
 assert.deepEqual(JSON.parse(JSON.stringify(h.calls[0].slice(2))),[{reason:'Nhận nhiệm vụ'},{headers:{'If-Match':etag,'Idempotency-Key':'stable-key'}}]);assert.equal(h.calls[1][0],'GET');
});
for(const status of [403,409,412])test('T05A HTTP '+status+' is not success and preserves intent',async()=>{
 const h=harness(),c=command(h);await h.port.write(c);h.setFailure({response:{status}});await assert.rejects(h.api.executeFieldCommand(c,h.port,true));assert.equal(h.row.key,c.key);assert.equal(h.row.phase,'pending');
});
test('T05A timeout survives reload; replay keeps body/key/version and blocks changed payload',async()=>{
 const h=harness(),c=command(h);await h.port.write(c);h.setFailure(Error('timeout'));await assert.rejects(h.api.executeFieldCommand(c,h.port,true));
 const restored=JSON.parse(JSON.stringify(h.row));h.setFailure(null);await h.api.executeFieldCommand(restored,h.port,true);
 const posts=h.calls.filter(x=>x[0]==='POST');assert.deepEqual(posts[0],posts[1]);
 await assert.rejects(h.api.executeFieldCommand({...c,body:{reason:'changed'}},h.port,true));
});
test('T05A new session can reconcile but cannot replay previous session',async()=>{
 const h=harness(),c=command(h);await h.port.write(c);h.setScope('A/s2');await assert.rejects(h.api.executeFieldCommand(c,h.port,true));assert.equal(h.calls.length,0);
 const r=await h.api.executeFieldCommand(c,h.port,false);assert.equal(r.phase,'pending');assert.equal(h.calls[0][0],'GET');
});
test('T05A session switch during POST cannot update receipt/readback',async()=>{
 const h=harness(),c=command(h);await h.port.write(c);h.client.post=async()=>{h.setScope('B/s2');return {data:detail('Accepted')}};
 await assert.rejects(h.api.executeFieldCommand(c,h.port,true));assert.equal(h.row.phase,'pending');
});
test('T05A reject ACK plus revoked GET retains receipt, not synthetic readback',async()=>{
 const h=harness(),c=command(h,'reject','Không thể nhận');await h.port.write(c);h.client.get=async()=>{throw {response:{status:403}}};
 const r=await h.api.executeFieldCommand(c,h.port,true);assert.equal(r.phase,'acknowledged');assert.equal(r.task,undefined);assert.equal(r.readbackStatus,403);
});
test('T05A start-origin uses GET094 real ID; does not treat origin ETag as task version',async()=>{
 const h=harness(),c=command(h,'start');await h.port.write(c);const origin={id,taskId:id,assignmentId:assignment,originId:assignment};
 h.client.post=async()=>({data:origin,headers:{etag:'"content-hash"'}});
 h.client.get=async url=>url.endsWith('/start-origin')?{data:origin}:{data:{...detail('InProgress'),firstStartOriginId:id},headers:{etag}};
 const r=await h.api.executeFieldCommand(c,h.port,true);assert.equal(r.phase,'confirmed');assert.equal(r.origin.id,id);assert.equal(r.etag,etag);assert.equal(r.body.originId,assignment);assert.equal(r.body.deviceId,undefined);
});
test('T05A storage failure prevents network',async()=>{
 const h=harness(),c=command(h);h.port.write=async()=>{throw Error('disk')};await assert.rejects(h.api.executeFieldCommand(c,h.port,true));assert.equal(h.calls.length,0);
});
test('T05A actor B cannot reconcile actor A record',async()=>{
 const h=harness(),c=command(h);await h.port.write(c);h.setScope('B/s2');await assert.rejects(h.api.executeFieldCommand(c,h.port,false));assert.equal(h.calls.length,0);
});
test('T05A a different assignment cannot confirm an old accept',async()=>{
 const h=harness(),c=command(h);await h.port.write(c);h.client.get=async()=>({data:{...detail('Accepted'),assignmentId:id},headers:{etag}});
 const r=await h.api.executeFieldCommand(c,h.port,false);assert.equal(r.phase,'pending');assert.equal(r.task,undefined);
});
test('T05A stale confirmed journal cannot regress a newer command',async()=>{
 const h=harness(),old=command(h);await h.port.write({...old,phase:'confirmed'});
 const next=command(h,'start');await h.port.write(next);
 await assert.rejects(h.api.executeFieldCommand(old,h.port,false));assert.equal(h.row.action,'start');assert.equal(h.calls.length,0);
});
test('T05A fresh definitive conflict is recoverable after GET with new version',async()=>{
 const h=harness(),c=command(h);h.setFailure({response:{status:409,data:{code:'concurrency_conflict'}}});
 const r=await h.api.executeFieldCommand(c,h.port,true);assert.equal(r.phase,'rejected');assert.equal(r.readbackStatus,200);assert.equal(r.task.status,'NewAssigned');
 h.setFailure(null);await h.api.executeFieldCommand({...c,key:'new-key'},h.port,true);assert.equal(h.row.phase,'confirmed');
});
test('T05A failed readback never returns retained task/etag as fresh confirmation',async()=>{
 const h=harness(),c={...command(h),phase:'confirmed',task:detail('Accepted'),etag};await h.port.write(c);
 h.client.get=async()=>{throw Error('offline')};const r=await h.api.executeFieldCommand(c,h.port,false);
 assert.equal(r.task,undefined);assert.equal(r.etag,undefined);assert.notEqual(r.readbackStatus,200);
});
test('T05A historical confirmed journal cannot replace a newer confirmed command',async()=>{
 const h=harness(),old={...command(h),phase:'confirmed'},next={...command(h,'start'),key:'next-key',phase:'confirmed'};await h.port.write(next);
 await assert.rejects(h.api.executeFieldCommand(old,h.port,false));assert.equal(h.row.action,'start');
});
test('T05A definitively rejected command allows current reassignment readback',async()=>{
 const h=harness(),c={...command(h),phase:'rejected',rejectionStatus:409};await h.port.write(c);
 h.client.get=async()=>({data:{...detail(),assignmentId:id},headers:{etag}});
 const r=await h.api.executeFieldCommand(c,h.port,false);assert.equal(r.phase,'rejected');assert.equal(r.readbackStatus,200);assert.equal(r.task.assignmentId,id);
});

// Execute the real screen function/hooks and click real handlers. Native rendering remains NOT RUN.
function uiHarness(){
 const h=harness(),slots=[],effects=[],deps=[],journal=new Map();let cursor=0,ec=0;
 const auth={user:{id:actor,role_code:'REPAIR_CREW'},token:'token',status:'AUTHENTICATED'};
 const scope=()=>auth.token?JSON.stringify([auth.user.id,'sid']):null;
 const useAuthStore=selector=>selector(auth);useAuthStore.getState=()=>auth;
 const react={createElement:(type,props,...children)=>({type,props:{...props,children:children.length===1?children[0]:children}}),
  useState:initial=>{const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],v=>slots[i]=typeof v==='function'?v(slots[i]):v]},
  useCallback:f=>f,useEffect:(f,d)=>{const i=ec++;if(!deps[i]||d.some((v,j)=>v!==deps[i][j])){deps[i]=d;effects.push(f)}}};
 // useCallback must retain identity, matching React for stable effect dependencies.
 const callbacks=[],callbackDeps=[];let cc=0;react.useCallback=(f,d)=>{const i=cc++;if(!callbackDeps[i]||d.some((v,j)=>v!==callbackDeps[i][j])){callbacks[i]=f;callbackDeps[i]=d}return callbacks[i]};
 const module={exports:{}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/(crew)/wo-detail.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,{module,exports:module.exports,require:n=>{
  if(n==='react')return react;
  if(n==='react-native')return {StyleSheet:{create:o=>o},View:'View',Text:'Text',Platform:{select:o=>o.default}};
  if(n==='./tasks')return {CrewTaskBoundary:'Boundary',useCrewIdentity:()=>({scope:scope(),user:auth.user})};
  if(n.endsWith('/store/auth'))return {useAuthStore};
  if(n.endsWith('/api/authApi'))return {passwordSessionIdentity:scope};
  if(n.endsWith('/api/crewApi'))return {...h.api,newIdempotencyKey:()=>require('node:crypto').randomUUID()};
  if(n==='expo-crypto')return {randomUUID:()=>require('node:crypto').randomUUID()};
  if(n.endsWith('/offline/database'))return {openDatabase:()=>({getFirstAsync:async(_,key)=>journal.has(key)?{payload:journal.get(key)}:null}),initDatabase:async()=>{},saveDraft:async(_,key,kind,value)=>journal.set(key,JSON.stringify(value))};
  if(n.endsWith('/design-tokens'))return {colors:{},radius:{},spacing:{},typography:{}};
  return new Proxy({},{get:(_,key)=>key});
 }});
 const task={...h.api.crewTaskFromWire({...detail(),crewId:actor,mode:'NORMAL',defectIds:[]},detail(),etag)};
 const component=module.exports.default().props.children(task).type;
 function render(){cursor=0;ec=0;cc=0;return component({task})}
 function nodes(tree){return !tree||typeof tree!=='object'?[]:[tree,...[tree.props?.children].flat(Infinity).flatMap(nodes)]}
 function button(tree,title){const b=nodes(tree).find(x=>x.type==='Button'&&x.props.title===title);assert.ok(b,title);return b.props}
 return {...h,auth,render,button,async settle(){for(const f of effects.splice(0))f();await new Promise(r=>setImmediate(r));},task};
}
test('T05A real UI enables accept without GPS and keeps GPS/repair locked',async()=>{
 const h=uiHarness();assert.equal(h.button(h.render(),'Nhận nhiệm vụ').disabled,true);await h.settle();const tree=h.render();
 assert.equal(h.button(tree,'Nhận nhiệm vụ').disabled,false);assert.equal(h.button(tree,'Bắt đầu nhiệm vụ').disabled,true);
 assert.equal(h.button(tree,'Dẫn đường').disabled,true);assert.equal(h.button(tree,'Tác nghiệp hiện trường').disabled,true);
 await h.button(tree,'Nhận nhiệm vụ').onPress();await h.settle();assert.equal(h.calls.filter(x=>x[0]==='POST').length,1);
 assert.equal(h.button(h.render(),'Bắt đầu nhiệm vụ').disabled,false);
});
test('T05A UI reload without journal performs real detail GET',async()=>{
 const h=uiHarness();h.render();await h.settle();await h.button(h.render(),'Tải lại / đối soát').onPress();await h.settle();assert.equal(h.calls.at(-1)[0],'GET');
});
test('T05A UI session change before click sends no command',async()=>{
 const h=uiHarness();h.render();await h.settle();const press=h.button(h.render(),'Nhận nhiệm vụ').onPress;h.auth.token=null;await press();await h.settle();assert.equal(h.calls.length,0);
});

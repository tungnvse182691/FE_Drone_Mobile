const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const {QueryClient,InfiniteQueryObserver}=require('@tanstack/react-query');
const actor='11111111-1111-4111-8111-111111111111',project='22222222-2222-4222-8222-222222222222',id='33333333-3333-4333-8333-333333333333';
const wire=()=>({id,projectId:project,crewId:actor,mode:'MEASURE_ONLY',status:'ASSIGNED',version:'AAAAAAAAB9E=',defectIds:[]});
function harness(){
 const calls=[];let respond=async()=>({data:{items:[],nextCursor:null,asOf:'2026-10-28T00:00:00Z'},headers:{}});
 const module={exports:{}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/api/crewApi.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,{module,exports:module.exports,require:n=>{
  if(n==='./client')return {apiClient:{get:async(...a)=>{calls.push(a);return respond(...a);}}};
  if(n==='axios')return require('axios');if(n==='./problemDetails')return {parseProblemDetails:()=>({})};throw Error(n);
 }});
 return {api:module.exports,calls,respond:f=>respond=f};
}
test('T04 absent presentation data stays absent, no invented WO/GPS/defect',()=>{
 const {api}=harness(),t=api.crewTaskFromWire(wire());
 assert.equal(t.id,id);assert.equal(t.projectId,project);assert.equal(t.version,wire().version);
 assert.equal(t.coordinates,null);assert.equal(t.defect_type_code,'');assert.equal(t.wo_code,'');
 assert.equal(t.title,'');assert.equal(t.task_mode,'MEASURE_ONLY');assert.ok(api.crewTaskActionBlock(t));
});
test('T04 unknown mode is not silently mapped to measure-only',()=>{
 const t=harness().api.crewTaskFromWire({...wire(),mode:'NORMAL'});assert.equal(t.task_mode,'UNKNOWN');assert.equal(t.rawMode,'NORMAL');
});
for(const missing of ['projectId','id','version','crewId'])test('T04 missing '+missing+' fails identity validation',()=>{
 const {api}=harness();api.validateCrewTaskIdentity(wire(),actor);assert.throws(()=>api.validateCrewTaskIdentity({...wire(),[missing]:''},actor));
});

// Execute production route defaults and shared guard, with deterministic hook/native boundaries.
// This validates guard execution, not Android rendering or repair mutations.
function screenHarness(file,options={}){
 const api=harness().api,configs=[],effects=[];let mounted=0;
 const state={user:{id:actor,role_code:'REPAIR_CREW'},token:'fixture',status:'AUTHENTICATED'};
 const params={id,projectId:project,...options.params};
 const detail={...wire(),assignedToUserId:actor,defectId:id};
 const task=api.crewTaskFromWire(wire(),detail,'"'+detail.version+'"');
 const react={Fragment:'Fragment',createElement:(type,props,...children)=>({type,props:{...props,children:children.length===1?children[0]:children}}),
  useState:v=>[typeof v==='function'?v():v,()=>{}],useCallback:f=>f,useMemo:f=>f(),useEffect:f=>effects.push(f)};
 const cache=new Map();
 function load(relative){
  if(cache.has(relative))return cache.get(relative);
  const module={exports:{}};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',relative),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,{module,exports:module.exports,require:n=>{
   if(n==='react')return react;
   if(n==='react-native')return {StyleSheet:{create:o=>o},Platform:{select:o=>o.default},View:'View',Text:'Text',Pressable:'Pressable'};
   if(n==='expo-router')return {router:{replace(){}},useLocalSearchParams:()=>params,usePathname:()=>`/(crew)/${file}`,useFocusEffect:()=>{}};
   if(n==='@tanstack/react-query')return {useInfiniteQuery:c=>{configs.push(c);return {data:{pages:[]},isPending:false,refetch(){}};},useQuery:c=>{configs.push(c);return {data:options.noTask?undefined:task,isPending:!!options.noTask,isError:false,refetch(){}};}};
   if(n.endsWith('/store/auth'))return {useAuthStore:s=>s(state)};
   if(n.endsWith('/offline/upload-queue'))return {currentQueueIdentity:()=>({actor,role:'REPAIR_CREW',partition:'test-crew',scope:'test-session',environment:'http://fixture/api/v1'})};
   if(n.endsWith('/api/authApi'))return {passwordSessionIdentity:t=>t?JSON.stringify([state.user.id,'sid-'+state.user.id]):null};
   if(n.endsWith('/api/crewApi'))return {...api,getFieldInspectionTaskDetailReal:async()=>({data:options.wireDetail??detail,etag:'"'+detail.version+'"'})};
   if(n==='./tasks')return load('app/(crew)/tasks.tsx');
   if(n.endsWith('/design-tokens'))return load('src/design-tokens.ts');
   if(n.endsWith('/types/enums'))return load('src/types/enums.ts');
   if(n.endsWith('/constants/defect-types'))return load('src/constants/defect-types.ts');
   if(n==='@expo/vector-icons')return {MaterialIcons:'Icon'};
   return new Proxy({},{get:(_,k)=>k});
  }},{filename:relative});cache.set(relative,module.exports);return module.exports;
 }
 const route=load('app/(crew)/'+file+'.tsx'),shared=load('app/(crew)/tasks.tsx');
 const tree=route.default();
 function guard(operational=true){return shared.CrewTaskBoundary({operational,children:()=>{mounted++;return 'PRIVATE';}});}
 return {tree,state,params,configs,effects,guard,shared,get mounted(){return mounted;}};
}
for(const file of ['report-defect','viewfinder','progress','complete','field-review','repair-correction']){
 test('T04 '+file+' missing task/GPS/project/session never mounts legacy operations',()=>{
  const h=screenHarness(file);
  assert.equal(h.tree.type,h.shared.CrewTaskBoundary);
  if(['progress','complete'].includes(file)){assert.equal(h.tree.props.operational,false);assert.equal(h.effects.length,0);assert.doesNotMatch(fs.readFileSync('app/(crew)/'+file+'.tsx','utf8'),/dispatchRepair|startRepairExecution|finishRepairExecution/);}
  h.guard();assert.equal(h.mounted,0); // Valid real DTO has no GPS.
  const absent=screenHarness(file,{noTask:true});absent.guard();assert.equal(absent.mounted,0);
  const missing=screenHarness(file,{params:{projectId:''}});missing.guard();assert.equal(missing.mounted,0);assert.equal(missing.configs.at(-1).enabled,false);
  h.state.token=null;h.guard();assert.equal(h.mounted,0);assert.equal(h.configs.at(-1).enabled,false);
  const before=h.configs.find(c=>c.queryKey[0]==='crew-task').queryKey[1];
  h.state.token='new-session';h.state.user={id:project,role_code:'REPAIR_CREW'};h.guard();
  assert.notEqual(h.configs.at(-1).queryKey[1],before);assert.equal(h.mounted,0);
 });
}
test('T04 sync renders without task lookup; offline effects are not invoked by identity fallback',()=>{
 const h=screenHarness('sync',{params:{id:undefined,projectId:undefined}});assert.ok(h.tree);assert.equal(h.configs.length,0);assert.equal(h.mounted,0);
});
test('T04 actual boundary detail query rejects foreign actor and mismatched project',async()=>{
 for(const changed of [{assignedToUserId:project},{projectId:id},{version:'wrong'}]){
  const h=screenHarness('progress',{wireDetail:{...wire(),assignedToUserId:actor,...changed}});h.guard();
  await assert.rejects(h.configs.at(-1).queryFn({signal:new AbortController().signal}));
 }
});
test('T04 read-only detail mounts real task without GPS; signed-out session hides it',()=>{
 const h=screenHarness('progress');h.guard(false);assert.equal(h.mounted,1);
 h.state.token=null;h.guard(false);assert.equal(h.mounted,1);assert.equal(h.configs.at(-1).enabled,false);
});
test('T04 API080 returns actual strong ETag and never synthesizes it from version',async()=>{
 const h=harness();h.respond(async()=>({data:{...wire(),assignedToUserId:actor},headers:{etag:'"wire-tag"'}}));
 assert.equal((await h.api.getFieldInspectionTaskDetailReal(project,id)).etag,'"wire-tag"');
 h.respond(async()=>({data:wire(),headers:{}}));assert.equal((await h.api.getFieldInspectionTaskDetailReal(project,id)).etag,'');
});
for(const status of [401,403,404,503])test('T04 HTTP '+status+' remains an error, never mock data',async()=>{
 const h=harness(),error={response:{status}};h.respond(async()=>{throw error;});
 await assert.rejects(h.api.listCrewInspectionTasksReal(),e=>e===error);
 await assert.rejects(h.api.getFieldInspectionTaskDetailReal(project,id),e=>e===error);
});
test('T04 foreign assignment fails closed',()=>{assert.throws(()=>harness().api.validateCrewTaskIdentity(wire(),'other'));});
test('T04 detail rejects missing/mismatched ETag and owner',()=>{
 const {api}=harness(),detail={...wire(),assignedToUserId:actor};
 assert.throws(()=>api.validateCrewTaskDetail(detail,'',project,id,actor));
 assert.throws(()=>api.validateCrewTaskDetail(detail,'"other"',project,id,actor));
 assert.throws(()=>api.validateCrewTaskDetail(detail,'"'+detail.version+'"',project,id,'other'));
 api.validateCrewTaskDetail(detail,'"'+detail.version+'"',project,id,actor);
});
test('T04 inbox uses cursor/limit/signal and real Query pagination isolates sessions',async()=>{
 const h=harness();h.respond(async(_,{params})=>({data:{items:[{...wire(),id:params.cursor?'b':id}],nextCursor:params.cursor?null:'opaque',asOf:'now'}}));
 const c=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}}),o=new InfiniteQueryObserver(c,h.api.crewInboxOptions('a/s1'));
 const unsub=o.subscribe(()=>{});await o.refetch();await o.fetchNextPage();
 assert.equal(o.getCurrentResult().data.pages.length,2);assert.equal(h.calls.at(-1)[1].params.cursor,'opaque');assert.ok(h.calls[0][1].signal);
 o.setOptions({...h.api.crewInboxOptions('b/s2'),enabled:false});assert.equal(o.getCurrentResult().data,undefined);unsub();c.clear();
});
test('T04 project list uses API078 afterId, detail uses API080 exact identity',async()=>{
 const h=harness();await h.api.listProjectCrewTasksReal(project,id,25);assert.equal(h.calls[0][0],`/projects/${project}/field-inspection-tasks`);assert.equal(h.calls[0][1].params.afterId,id);
 await assert.rejects(h.api.getFieldInspectionTaskDetailReal('',id));assert.equal(h.calls.length,1);
});
test('T04 repeated cursor stops; counters do not count rejected as completed',()=>{
 const {api}=harness(),opts=api.crewInboxOptions('scope');assert.equal(opts.getNextPageParam({nextCursor:'same'},[],'same',['same']),undefined);
 assert.equal(api.crewTaskIsComplete({status:'REJECTED'}),false);assert.equal(api.crewTaskIsComplete({status:'COMPLETED'}),true);
});

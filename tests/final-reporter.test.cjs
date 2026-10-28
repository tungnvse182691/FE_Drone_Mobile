const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const reportId='10000000-0000-4000-8000-000000000001',publicationId='20000000-0000-4000-8000-000000000001',evidenceId='30000000-0000-4000-8000-000000000001';
const report=()=>({id:reportId,publicUpdates:[{id:publicationId,evidenceIds:[evidenceId]}]});
function harness(){
  const calls=[];let respond=async()=>({status:200,data:Uint8Array.from([137,80,78,71]).buffer,headers:{'content-type':'image/png'}});
  const module={exports:{}};
  const js=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/api/reporterApi.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  vm.runInNewContext(js,{module,exports:module.exports,Uint8Array,ArrayBuffer,require:name=>{
    if(name==='./client')return {apiClient:{get:async(...args)=>{calls.push(args);return respond(...args);}},bareClient:{get(){throw Error('anonymous_forbidden');}}};
    if(name==='./problemDetails')return {parseProblemDetails:()=>({})};throw Error(name);
  }});
  return {api:module.exports,calls,respond:fn=>respond=fn};
}
test('G5 API210 uses authenticated recipient publication path, cancellation and no-store',async()=>{
  const h=harness(),signal=new AbortController().signal;
  const uri=await h.api.downloadPublicationEvidenceReal(report(),publicationId,evidenceId,signal);
  assert.equal(uri,'data:image/png;base64,iVBORw==');assert.equal(h.calls.length,1);
  const [url,config]=h.calls[0];assert.equal(url,`/reporter-evidence/publications/${publicationId}/reports/${reportId}/evidence/${evidenceId}/content`);
  assert.equal(config.signal,signal);assert.equal(config.responseType,'arraybuffer');assert.equal(config.headers['Cache-Control'],'no-store');
});
for(const [name,source,pub,evidence] of [
  ['wrong publication',report(),'40000000-0000-4000-8000-000000000001',evidenceId],
  ['wrong evidence',report(),publicationId,'40000000-0000-4000-8000-000000000001'],
  ['withdrawn update',{id:reportId,publicUpdates:[]},publicationId,evidenceId],
  ['missing source',{id:reportId},publicationId,evidenceId],
  ['typed invalid parent',{...report(),id:'typed/id'},publicationId,evidenceId],
  ['empty parent',{...report(),id:'00000000-0000-0000-0000-000000000000'},publicationId,evidenceId],
])test('G5 blocks '+name+' before HTTP',async()=>{
  const h=harness();await assert.rejects(h.api.downloadPublicationEvidenceReal(source,pub,evidence),/publication_source/);assert.equal(h.calls.length,0);
});
for(const status of [401,403,404,409,503])test('G5 publication denied/unready '+status+' preserves server failure without private fallback',async()=>{
  const h=harness(),failure={response:{status,data:{code:'source_problem'}}};h.respond(async()=>{throw failure;});
  await assert.rejects(h.api.downloadPublicationEvidenceReal(report(),publicationId,evidenceId),e=>e===failure);assert.equal(h.calls.length,1);
});
for(const response of [
  {status:200,data:new Uint8Array([1]).buffer,headers:{'content-type':'text/html'}},
  {status:200,data:new ArrayBuffer(0),headers:{'content-type':'image/png'}},
  {status:200,data:new ArrayBuffer(20*1024*1024+1),headers:{'content-type':'image/png'}},
  {status:206,data:new Uint8Array([1]).buffer,headers:{'content-type':'image/jpeg'}},
])test('G5 publication rejects invalid media/status/size '+response.status+'/'+response.data.byteLength,async()=>{
  const h=harness();h.respond(async()=>response);await assert.rejects(h.api.downloadPublicationEvidenceReal(report(),publicationId,evidenceId),/media/);
});

function screenHarness(imageResult={}){
  let index=0,tree;const slots=[],configs=[],focus=[],calls=[];
  const state={user:{id:'actor-a'},token:'session-a',status:'AUTHENTICATED'};
  const source={...report(),createdAt:'2026-10-28T00:00:00Z',evidence:[],supplements:[]};
  const react={createElement:(type,props,...children)=>({type,props:{...props,children}}),useCallback:fn=>fn,
    useState:initial=>{const i=index++;if(!(i in slots))slots[i]=initial;return [slots[i],v=>slots[i]=v];}};
  const module={exports:{}};
  const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../app/(reporter)/report-detail.tsx'),'utf8')+'\nexport { EvidencePreview };',{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
  vm.runInNewContext(code,{module,exports:module.exports,require:name=>{
    if(name==='react')return react;
    if(name==='react-native')return {Platform:{select:o=>o.default},StyleSheet:{create:o=>o},View:'View',Text:'Text',Image:'Image',ScrollView:'ScrollView'};
    if(name==='expo-router')return {useRouter:()=>({push(){}}),useLocalSearchParams:()=>({reportId}),useFocusEffect:fn=>focus.push(fn)};
    if(name==='@tanstack/react-query')return {useQuery:config=>{configs.push(config);return {data:config.queryKey[0]==='reporter-detail'?{report:source}:'data:image/png;base64,iVBORw==',isError:false,refetch:async()=>calls.push('refetch'),...(config.queryKey[0]==='reporter-detail'?{}:imageResult)};}};
    if(name.endsWith('/store/auth'))return {useAuthStore:fn=>fn(state)};
    if(name.endsWith('/api/authApi'))return {passwordSessionIdentity:token=>token};
    if(name.endsWith('/api/report-display-code'))return {reporterReportCode:id=>id};
    if(name.endsWith('/api/uploads'))return {isReporterSession:s=>s.status==='AUTHENTICATED'};
    if(name.endsWith('/api/reporterApi'))return {downloadPublicationEvidenceReal:async(...args)=>calls.push(args)};
    if(name.endsWith('/design-tokens'))return {colors:{},radius:{},spacing:{},typography:{}};
    return new Proxy({},{get:(_,key)=>key});
  }});
  const render=(component=module.exports.default,props={})=>{index=0;configs.length=0;focus.length=0;tree=component(props);};
  const walk=n=>!n?[]:Array.isArray(n)?n.flatMap(x=>walk(x)):typeof n==='object'?[n,...walk(n.props?.children)]:[];
  return {render,nodes:()=>walk(tree),module:module.exports,configs,focus,calls,state,source};
}
test('G5 mounted update preview uses publication and evidence IDs from API217 DTO',()=>{
  const h=screenHarness();h.render();
  const preview=h.nodes().find(n=>typeof n.type==='function'&&n.type.name==='EvidencePreview');assert.ok(preview);
  assert.equal(preview.props.publication.id,publicationId);assert.equal(preview.props.publication.report,h.source);assert.equal(preview.props.evidenceId,evidenceId);
});
test('G5 publication preview requires click, separates query identity, discards display on blur',async()=>{
  const h=screenHarness(),props={scope:'session-a',reportId,evidenceId,publication:{id:publicationId,report:h.source}};
  h.render(h.module.EvidencePreview,props);assert.equal(h.configs[0].enabled,false);
  assert.equal(h.configs[0].gcTime,0);assert.equal(h.configs[0].retry,false);
  assert.equal(h.configs[0].queryKey.join('/'),['reporter-publication-evidence','session-a',reportId,publicationId,evidenceId].join('/'));
  h.nodes().find(n=>n.props?.title==='Xem ảnh được chia sẻ').props.onPress();h.render(h.module.EvidencePreview,props);
  assert.equal(h.configs[0].enabled,true);assert.ok(h.nodes().find(n=>n.type==='Image'));
  const signal=new AbortController().signal;await h.configs[0].queryFn({signal});assert.equal(h.calls[0][0],h.source);assert.equal(h.calls[0][3],signal);
  const cleanups=h.focus.map(fn=>fn()).filter(fn=>typeof fn==='function');cleanups.forEach(fn=>fn());h.render(h.module.EvidencePreview,props);
  assert.equal(h.configs[0].enabled,false);assert.equal(h.nodes().some(n=>n.type==='Image'),false);
});
test('G5 mounted publication previews vanish with invalid session',()=>{
  const h=screenHarness();h.state.status='SIGNED_OUT';h.render();assert.equal(h.nodes().some(n=>typeof n.type==='function'&&n.type.name==='EvidencePreview'),false);
});
for(const state of [{isFetching:true},{isError:true}])test('G5 hides cached publication bytes during revalidation or denial '+JSON.stringify(state),()=>{
  const h=screenHarness(state),props={scope:'session-a',reportId,evidenceId,publication:{id:publicationId,report:h.source}};
  h.render(h.module.EvidencePreview,props);h.nodes().find(n=>n.props?.title==='Xem ảnh được chia sẻ').props.onPress();h.render(h.module.EvidencePreview,props);
  assert.equal(h.nodes().some(n=>n.type==='Image'),false);
});

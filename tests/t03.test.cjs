const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const {QueryClient,InfiniteQueryObserver}=require('@tanstack/react-query');
function harness(){
  const calls=[];let respond=async()=>({data:{items:[],nextCursor:null},headers:{}});
  const apiClient={get:async(...args)=>{calls.push(args);return respond(...args);}};
  const module={exports:{}};
  const js=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/api/reporterApi.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  vm.runInNewContext(js,{module,exports:module.exports,Uint8Array,ArrayBuffer,require:name=>{
    if(name==='./client')return {apiClient,bareClient:{}};
    if(name==='./problemDetails')return {parseProblemDetails:()=>({})};
    throw Error(name);
  }});
  return {api:module.exports,calls,respond:fn=>{respond=fn;}};
}
test('T03 list sends opaque cursor, page size and cancellation signal',async()=>{
  const h=harness(),signal=new AbortController().signal;
  await h.api.listMyReportsReal({cursor:'opaque+/=',pageSize:20,signal});
  assert.equal(h.calls[0][0],'/reports');assert.equal(h.calls[0][1].params.cursor,'opaque+/=');assert.equal(h.calls[0][1].signal,signal);
});
test('T03 pagination loads second page, deduplicates IDs, refreshes and isolates sessions',async()=>{
  const h=harness();let revision=1;
  h.respond(async(_,{params})=>({data:params.cursor?{items:[{id:'b'},{id:'a'}],nextCursor:null}:{items:[{id:'a',revision}],nextCursor:'page2'}}));
  const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});
  const observer=new InfiniteQueryObserver(client,h.api.reporterReportsOptions('actor-a/session-1'));
  const unsubscribe=observer.subscribe(()=>{});
  await observer.refetch();await observer.fetchNextPage();
  assert.deepEqual(Array.from(h.api.reportItemsFromPages(observer.getCurrentResult().data.pages),r=>r.id),['a','b']);
  assert.equal(observer.getCurrentResult().hasNextPage,false);
  revision=2;await observer.refetch();assert.equal(observer.getCurrentResult().data.pages[0].items[0].revision,2);
  observer.setOptions({...h.api.reporterReportsOptions('actor-b/session-2'),enabled:false});
  assert.equal(observer.getCurrentResult().data,undefined);unsubscribe();client.clear();
});
test('T03 repeated cursor fails closed instead of offering an endless next page',()=>{
  const {api}=harness(),opts=api.reporterReportsOptions('scope');
  assert.equal(opts.getNextPageParam({items:[],nextCursor:'same'},[], 'same',['same']),undefined);
});
test('T03 API217 preserves actual ETag and cancellation signal',async()=>{
  const h=harness(),signal=new AbortController().signal;
  h.respond(async()=>({data:{id:'report',version:'wire'},headers:{etag:'"strong"'}}));
  const result=await h.api.getOwnReportReal('report',signal);
  assert.equal(result.etag,'"strong"');assert.equal(h.calls[0][1].signal,signal);
});
test('T03 API218 downloads binary through authenticated client, never a public URL',async()=>{
  const h=harness(),signal=new AbortController().signal;
  const bytes=Uint8Array.from([137,80,78,71,13,10,26,10]);
  h.respond(async()=>({status:200,data:bytes.buffer,headers:{'content-type':'image/png'}}));
  const uri=await h.api.downloadReportEvidenceReal('r','e',signal);
  assert.equal(uri,'data:image/png;base64,'+Buffer.from(bytes).toString('base64'));
  assert.equal(h.calls[0][0],'/reports/r/evidence/e/download');assert.equal(h.calls[0][1].responseType,'arraybuffer');assert.equal(h.calls[0][1].signal,signal);
});
for(const type of ['text/html','image/svg+xml','application/json'])test('T03 rejects unexpected private media '+type,async()=>{
  const h=harness();h.respond(async()=>({status:200,data:new Uint8Array([1]).buffer,headers:{'content-type':type}}));
  await assert.rejects(h.api.downloadReportEvidenceReal('r','e'),/media/);
});
for(const status of [401,403,404,409,412,503])test('T03 private read error '+status+' remains an error',async()=>{
  const h=harness(),error={response:{status}};h.respond(async()=>{throw error;});
  await assert.rejects(h.api.downloadReportEvidenceReal('r','e'),e=>e===error);
  await assert.rejects(h.api.listMyReportsReal(),e=>e===error);
  await assert.rejects(h.api.getOwnReportReal('r'),e=>e===error);
});

// Execute production screen logic with deterministic UI/query boundaries. Not native rendering.
function screenHarness(file,overrides={}){
  let slots=[],index=0,tree;const focus=[],configs=[],actions=[];
  const jwt='fixture.'+Buffer.from(JSON.stringify({sub:'a',sid:'s1'})).toString('base64url')+'.signature';
  const state={user:{id:'a',role_code:'REPORTER',phone_or_email:'stale@example.test',full_name:'Stale Name'},token:jwt,status:'AUTHENTICATED',...overrides.auth};
  const report={id:'r',version:'v',createdAt:'2026-10-27T00:00:00Z',description:'real report',routingStatus:'ASSIGNED',evidence:[{id:'e',fileId:'f',supplementId:null}],supplements:[],publicUpdates:[]};
  const result={data:{pages:[{items:[report],nextCursor:null}]},isPending:false,isFetching:false,isFetchingNextPage:false,isError:false,hasNextPage:false,
    refetch:async()=>{actions.push('refresh');},fetchNextPage:async()=>{actions.push('more');},...overrides.result};
  const profile={userId:'a',roleCode:'REPORTER',displayName:'Server Name',email:'server@example.test',status:'ACTIVE'};
  const react={createElement:(type,props,...children)=>({type,props:{...props,children}}),
    useState:initial=>{const i=index++;if(!(i in slots))slots[i]=initial;return [slots[i],v=>{slots[i]=v;}];},useCallback:fn=>fn};
  const auth=selector=>selector(state);
  const stubs={react,
    'react-native':{Platform:{select:o=>o.default},StyleSheet:{create:o=>o},Text:'Text',View:'View',Image:'Image',Pressable:'Pressable',ScrollView:'ScrollView',Alert:{alert(){}}},
    'expo-router':{useRouter:()=>({push(){},replace(){}}),useLocalSearchParams:()=>({reportId:'r'}),useFocusEffect:fn=>focus.push(fn)},
    '@tanstack/react-query':{useInfiniteQuery:config=>{configs.push(config);return result;},useQuery:config=>{
      configs.push(config);if(config.queryKey[0]==='reporter-profile')return {...result,data:profile,...overrides.profile};
      if(config.queryKey[0]==='reporter-detail')return {...result,data:{report},...overrides.detail};
      return {...result,data:'data:image/png;base64,fixture',...overrides.image};
    }},
  };
  function load(relative){
    const module={exports:{}};let source=fs.readFileSync(path.join(__dirname,'..',relative),'utf8');
    if(relative.endsWith('report-detail.tsx'))source+='\nexport { EvidencePreview };';
    const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
    vm.runInNewContext(js,{module,exports:module.exports,require:name=>{
      if(name in stubs)return stubs[name];
      if(name.endsWith('/store/auth'))return {useAuthStore:auth};
      if(name.endsWith('/store/reporter'))return {useReporterStore:selector=>selector({clearSession(){}})};
      if(name.endsWith('/api/authApi'))return {passwordSessionIdentity:token=>token?JSON.stringify(JSON.parse(Buffer.from(token.split('.')[1],'base64url'))):null,fetchProfile:async()=>overrides.wireProfile??profile};
      if(name.endsWith('/api/uploads'))return {isReporterSession:s=>s.user?.role_code==='REPORTER'&&!!s.token&&['AUTHENTICATED','REFRESHING'].includes(s.status)};
      if(name.endsWith('/api/reporterApi'))return {reporterReportsOptions:scope=>({queryKey:['reporter-reports',scope]}),reportItemsFromPages:pages=>pages?.flatMap(p=>p.items)??[],canShowReportPages:q=>!q.isError||(q.isFetchNextPageError&&q.error?.response?.status===503),getOwnReportReal(){},downloadReportEvidenceReal(){}};
      if(name.endsWith('/api/report-display-code'))return {reporterReportCode:id=>'REPORT-'+id};
      if(name.endsWith('/design-tokens'))return load('src/design-tokens.ts');
      if(name.endsWith('/Button'))return {Button:'Button'};
      if(name.endsWith('/EmptyState'))return {EmptyState:'EmptyState'};
      if(name==='@expo/vector-icons')return {MaterialIcons:'Icon'};
      return new Proxy({},{get:(_,key)=>key});
    }},{filename:relative});return module.exports;
  }
  const module=load(file);
  const render=(component=module.default,props={})=>{index=0;configs.length=0;tree=component(props);return tree;};render();
  function nodes(node=tree){if(!node)return [];if(Array.isArray(node))return node.flatMap(n=>nodes(n));if(typeof node!=='object')return [node];return [node,...nodes(node.props?.children)];}
  return {module,render,nodes,configs,focus,actions,state};
}
for(const file of ['home','track','profile','report-detail'])test('T03 '+file+' never reads with restored user and no session',()=>{
  const h=screenHarness('app/(reporter)/'+file+'.tsx',{auth:{token:null,status:'SIGNED_OUT'}});
  assert.ok(h.configs.length);assert.ok(h.configs.every(c=>c.enabled===false));assert.ok(!h.nodes().includes('real report'));
});
test('T03 profile displays server identity and no fabricated OTP claim or total count',()=>{
  const h=screenHarness('app/(reporter)/profile.tsx');const text=h.nodes().filter(x=>typeof x==='string').join(' ');
  assert.match(text,/Server Name/);assert.match(text,/server@example.test/);assert.doesNotMatch(text,/Stale Name|stale@example.test|đã xác thực OTP/);assert.match(text,/không phải tổng/);
});
test('T03 profile rejects a response for a different owner',async()=>{
  const h=screenHarness('app/(reporter)/profile.tsx',{wireProfile:{userId:'b',roleCode:'REPORTER'}});
  const config=h.configs.find(c=>c.queryKey[0]==='reporter-profile');await assert.rejects(config.queryFn({signal:new AbortController().signal}),/identity/);
});
for(const file of ['home','track'])test('T03 '+file+' exposes load-more and focus refresh; error is not empty success',async()=>{
  const h=screenHarness('app/(reporter)/'+file+'.tsx',{result:{hasNextPage:true}});
  const button=h.nodes().find(n=>n?.props?.title==='Tải thêm phản ánh');assert.ok(button);await button.props.onPress();assert.ok(h.actions.includes('more'));
  h.focus.forEach(f=>f());assert.ok(h.actions.includes('refresh'));
  const failed=screenHarness('app/(reporter)/'+file+'.tsx',{result:{isError:true,data:undefined}});
  assert.ok(!failed.nodes().some(n=>n?.type==='EmptyState'));assert.ok(!failed.nodes().includes('real report'));
});
test('T03 detail hides data and supplement after denied ownership refresh',()=>{
  const h=screenHarness('app/(reporter)/report-detail.tsx',{detail:{isError:true}});
  assert.ok(!h.nodes().includes('real report'));assert.ok(!h.nodes().some(n=>n?.props?.title==='Bổ sung thông tin'));
});
test('T03 image preview is opt-in, uses only memory data URI and shows errors',()=>{
  const h=screenHarness('app/(reporter)/report-detail.tsx');
  h.render(h.module.EvidencePreview,{scope:'a/s1',reportId:'r',evidenceId:'e'});
  assert.equal(h.configs[0].enabled,false);assert.ok(!h.nodes().some(n=>n?.type==='Image'));
  h.nodes().find(n=>n?.props?.title==='Xem ảnh riêng tư').props.onPress();
  h.render(h.module.EvidencePreview,{scope:'a/s1',reportId:'r',evidenceId:'e'});
  assert.equal(h.configs[0].enabled,true);assert.equal(h.nodes().find(n=>n?.type==='Image').props.source.uri,'data:image/png;base64,fixture');
});

test('T03 next-page transport error retains partial data; auth and changed-session errors fail closed',async()=>{
  const h=harness();let fail=false;
  h.respond(async()=>{if(fail)throw {response:{status:503}};return {data:{items:[{id:'first'}],nextCursor:'next'}};});
  const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});
  const observer=new InfiniteQueryObserver(client,h.api.reporterReportsOptions('actor-a/session'));
  const unsubscribe=observer.subscribe(()=>{});await observer.refetch();fail=true;await observer.fetchNextPage();
  const result=observer.getCurrentResult();assert.equal(result.isError,true);assert.equal(result.isFetchNextPageError,true);
  assert.equal(h.api.canShowReportPages(result),true);assert.equal(result.data.pages[0].items[0].id,'first');
  for(const status of [401,403,404])assert.equal(h.api.canShowReportPages({...result,error:{response:{status}}}),false);
  assert.equal(h.api.canShowReportPages({...result,error:{code:'auth_session_changed'}}),false);
  assert.equal(h.api.canShowReportPages({...result,isFetchNextPageError:false}),false);
  unsubscribe();client.clear();
});

for(const file of ['home','track','profile'])test('T03 '+file+' keeps loaded reports/counters on transient load-more failure',()=>{
  const h=screenHarness('app/(reporter)/'+file+'.tsx',{result:{isError:true,isFetchNextPageError:true,error:{response:{status:503}},hasNextPage:true}});
  const text=h.nodes().filter(n=>typeof n==='string').join(' ');assert.match(text,/đã tải/);
  if(file!=='profile')assert.ok(h.nodes().includes('real report'));else assert.ok(!h.nodes().includes('—'));
});

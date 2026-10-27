const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
const settle=async()=>{for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));};

// Execute the real screen's mount/effect callbacks with deterministic native boundaries.
// This is hook logic coverage, not React rendering or Android acceptance.
function mountSupplement(draft) {
  const gps=deferred(),report=deferred(),effects=[],states=[];
  const state={pendingDraft:null,restorePendingDraft:async()=>{state.pendingDraft=draft;return draft;}};
  const store=selector=>selector(state);store.getState=()=>state;
  const authState={user:{id:'fixture',phone_or_email:'fixture@example.test'},token:'fixture',status:'AUTHENTICATED'};
  const auth=selector=>selector(authState);auth.getState=()=>authState;
  const react={createElement:()=>null,useRef:initial=>({current:initial}),useCallback:callback=>callback,
    useEffect:callback=>effects.push(callback),useState:initial=>{const slot={value:initial};states.push(slot);return [initial,value=>{slot.value=typeof value==='function'?value(slot.value):value;}];}};
  function load(relative){
    const module={exports:{}};
    const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',relative),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
    vm.runInNewContext(code,{module,exports:module.exports,require:name=>{
      if(name==='react')return react;
      if(name==='react-native')return {Platform:{select:o=>o.default},StyleSheet:{create:o=>o}};
      if(name==='expo-router')return {useRouter:()=>({replace(){}}),useLocalSearchParams:()=>({reportId:'fixture-report'})};
      if(name==='expo-camera')return {useCameraPermissions:()=>[{granted:true},async()=>({granted:true})]};
      if(name==='expo-location')return {Accuracy:{Balanced:1},getForegroundPermissionsAsync:async()=>({status:'granted'}),getCurrentPositionAsync:()=>gps.promise};
      if(name.endsWith('/store/reporter'))return {useReporterStore:store,reporterFailureMessage:()=> 'fixture error'};
      if(name.endsWith('/store/auth'))return {useAuthStore:auth};
      if(name.endsWith('/api/reporterApi'))return {getOwnReportReal:()=>report.promise};
      if(name.endsWith('/api/uploads'))return {isReporterSession:()=>true};
      if(name.endsWith('/types/position'))return {isZeroCoordinate:()=>false};
      if(name.endsWith('/design-tokens'))return load('src/design-tokens.ts');
      return {};
    }},{filename:relative});return module.exports;
  }
  load('app/(reporter)/report-supplement.tsx').default();effects.forEach(effect=>effect());
  return {gps,report,states};
}

for(const restoreFirst of [true,false]) for(const coords of [null,{latitude:10,longitude:106,accuracyMeters:5}]) test(`frozen supplement restores ${coords?'coordinates':'null'} with GPS ${restoreFirst?'later':'earlier'}`,async()=>{
  const draft={targetReportId:'fixture-report',description:'fixture',photos:[],coords,ifMatch:'"fixture-version"',request:{description:'fixture',evidence:[]}};
  const h=mountSupplement(draft);await settle();
  const restore=()=>h.report.resolve({report:{id:'fixture-report'},etag:'"new-version"'});
  const locate=()=>h.gps.resolve({coords:{latitude:11,longitude:107,accuracy:20}});
  (restoreFirst?restore:locate)();await settle();(restoreFirst?locate:restore)();await settle();
  assert.equal(JSON.stringify(h.states[8].value),JSON.stringify(coords));
});

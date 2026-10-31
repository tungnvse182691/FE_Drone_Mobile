// Executes shipped TSX handlers/effects and real Reporter stores. This is a hook
// harness, NOT a React renderer, native permission provider, or Android E2E.
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
const prefix = fs.readFileSync(path.join(__dirname, '../t01.test.cjs'), 'utf8').split("test('restored user")[0];
const harness = new Function('require', '__dirname', prefix + '\nreturn harness;')(require, path.join(__dirname, '..'));
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return {promise,resolve,reject}; };

function screen(file, options = {}) {
  let cursor = 0, tree, dirty = false, alive = true;
  const slots = [], effects = [], nav = [], focus = [];
  const changed = (a,b) => !a || !b || a.length !== b.length || a.some((v,i) => !Object.is(v,b[i]));
  const react = {
    createElement: (type,props,...children) => ({type,props:{...props,children}}),
    useState: initial => { const i=cursor++; if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;
      return [slots[i], next => { const value=typeof next==='function'?next(slots[i]):next; if(!Object.is(value,slots[i])){slots[i]=value;dirty=true;} }]; },
    useRef: value => { const i=cursor++; if(!(i in slots))slots[i]={current:value}; return slots[i]; },
    useCallback: (fn,deps) => { const i=cursor++; if(!slots[i]||changed(slots[i].deps,deps))slots[i]={deps,fn}; return slots[i].fn; },
    useMemo: (fn,deps) => { const i=cursor++; if(!slots[i]||changed(slots[i].deps,deps))slots[i]={deps,value:fn()};return slots[i].value; },
    useEffect: (fn,deps) => { const i=cursor++; if(!slots[i]||changed(slots[i].deps,deps)){
      const old=slots[i]; slots[i]={deps,cleanup:old?.cleanup}; effects.push(()=>{old?.cleanup?.(); slots[i].cleanup=fn();}); } },
  };
  let mediaRuntime;
  const h = harness({rows:options.rows, modules:{react, 'expo-file-system':{File:class{constructor(uri){this.uri=uri;}async arrayBuffer(){return (mediaRuntime?.files.get(this.uri)??Uint8Array.from([1,2,3])).buffer;}}}}});
  h.transport.getFileMetadata=async()=>{h.calls.push(['metadata']);const row=[...h.rows.values()].find(r=>r.uri_local&&mediaRuntime?.files.has(r.uri_local));const bytes=row?mediaRuntime.files.get(row.uri_local):Uint8Array.from([1,2,3]);return {id:'file',status:'VERIFIED',version:'fv',checksumSha256:require('node:crypto').createHash('sha256').update(bytes).digest('hex'),sizeBytes:bytes.length};};
  const authMethods = {
    login: (user,pair) => h.changeAuth({status:'AUTHENTICATED',user,token:pair.accessToken}),
    beginOtp: () => h.changeAuth({...h.getAuth(),status:'OTP_PENDING'}),
    markOtpVerified: () => h.changeAuth({...h.getAuth(),status:'VERIFIED_NEEDS_LOGIN'}),
    beginForcedPasswordChange() {},
  };
  const auth = Object.assign(selector=>selector({...h.getAuth(),...authMethods}), {getState:()=>({...h.getAuth(),...authMethods}),subscribe:h.subscribe});
  const params = options.params ?? {intentId:'fixture-intent',email:'fixture@example.test',resendAfterSeconds:'0',reportId:'fixture-report'};
  const reporter = h.load('src/store/reporter.ts');
  const uploads = h.load('src/store/uploads.ts');
  const native = {Platform:{OS:'android',select:o=>o.default},StyleSheet:{create:o=>o}};
  for(const name of ['Text','View','Image','Pressable','TextInput','Modal','ScrollView','KeyboardAvoidingView'])native[name]=name;
  const gps = options.gps ?? {getForegroundPermissionsAsync:async()=>({status:'denied'}),requestForegroundPermissionsAsync:async()=>({status:'denied'}),Accuracy:{High:1,Balanced:1}};
  const modules = {
    react, 'react-native':native,
    'expo-router':{useRouter:()=>({push:p=>nav.push(p),replace:p=>nav.push(p)}),useLocalSearchParams:()=>params,
      useFocusEffect:fn=>react.useEffect(()=>{const cleanup=fn();focus.push(cleanup);return cleanup;},[fn])},
    'react-native-safe-area-context':{SafeAreaView:'SafeAreaView'}, '@expo/vector-icons':{MaterialIcons:'MaterialIcons'},
    'expo-camera':{CameraView:'CameraView',useCameraPermissions:()=>[{granted:true},async()=>({granted:true})]},
    'expo-document-picker':{getDocumentAsync:options.pick ?? (async()=>({canceled:true}))},
    'expo-image-picker':{requestCameraPermissionsAsync:async()=>({granted:true}),requestMediaLibraryPermissionsAsync:async()=>({granted:true}),launchCameraAsync:options.camera??(async()=>({canceled:true})),launchImageLibraryAsync:options.library??(async()=>({canceled:true}))},
    'expo-location':gps,
    'expo-file-system':{File:class{async arrayBuffer(){return Uint8Array.from([1,2,3]).buffer;}}},
  };
  const module = {exports:{}};
  let localMedia;
  const code=ts.transpileModule(fs.readFileSync(path.resolve(__dirname,'../..',file),'utf8')+(options.expose?'\nexport { '+options.expose+' };':''),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
  vm.runInNewContext(code,{module,exports:module.exports,React:react,Date,setTimeout,clearTimeout,Uint8Array,require:name=>{
    if(options.modules?.[name])return options.modules[name];
    if(modules[name])return modules[name];
    if(name.endsWith('/api/reporterLocalMedia'))return (localMedia??=(mediaRuntime=require('./reporter-media.cjs').mediaRuntime({autoSources:true})).load());
    if(name.endsWith('/store/reporter'))return reporter;
    if(name.endsWith('/store/uploads'))return uploads;
    if(name.endsWith('/store/auth'))return{useAuthStore:auth,buildUserFromActor:(actor,email,must)=>({...actor,role_code:actor.role_code??'REPORTER',phone_or_email:email,must_change_password:!!must})};
    if(name.endsWith('/api/client'))return{bareClient:h.client};
    if(name.endsWith('/api/authApi'))return{loginReal:options.login??(async()=>{throw Error('fixture not configured');}),extractProblemCode:e=>e?.code??'unknown'};
    if(name.endsWith('/api/reporterApi'))return{...h.api,...options.api,extractProblemCode:e=>e?.code??'unknown'};
    if(name.endsWith('/api/idempotency'))return{getOrCreateCommandKey:()=> 'fixture-command-key',clearCommandKey(){}};
    if(name.endsWith('/components/Button'))return{Button:'Button'};
    if(name.endsWith('/components/InputField'))return{InputField:'InputField'};
    if(name.endsWith('/components/SafeAreaScreen'))return{SafeAreaScreen:'SafeAreaScreen'};
    if(name.endsWith('.png'))return 0;
    return h.load(path.relative(path.resolve(__dirname,'../..'),path.resolve(path.dirname(path.resolve(__dirname,'../..',file)),name))+'.ts');
  }},{filename:file});
  const render = () => { if(!alive)throw Error('unmounted');cursor=0;dirty=false;tree=module.exports[options.exportName??'default'](options.props??{});while(effects.length)effects.shift()(); };
  const walk = n => !n?[]:Array.isArray(n)?n.flatMap(walk):typeof n==='object'?[n,...walk(n.props?.children)]:[];
  const nodes = () => walk(tree);
  const flush = async () => { for(let i=0;i<12;i++){await new Promise(r=>setImmediate(r));if(dirty)render();} };
  const find = predicate => { const found=nodes().find(predicate);if(!found)throw Error('UI node not found: '+file);return found; };
  const input = (label,value) => {find(n=>n.type==='InputField'&&n.props.label===label).props.onChangeText(value);render();};
  const press = title => find(n=>n.type==='Button'&&n.props.title===title).props.onPress();
  const tap = id => find(n=>n.props?.testID===id).props.onPress();
  const unmount = () => {alive=false;for(const slot of slots)slot?.cleanup?.();};
  return {h,reporter,uploads,render,flush,nodes,input,press,tap,nav,blur:()=>focus.forEach(fn=>fn?.()),unmount,slots};
}
module.exports={screen,harness,deferred};

const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,deps={}) {
  const module={exports:{}};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,
    {module,exports:module.exports,require:name=>deps[name]??(name==='../../utils/gpsAccuracy'?load('src/utils/gpsAccuracy.ts'):{}),setTimeout,clearTimeout});
  return module.exports;
}
const tokens={colors:{},spacing:{},radius:{},typography:{}};
function camera(){return load('src/components/ViewFinder.tsx',{'expo-location':{Accuracy:{High:4}},'react-native':{StyleSheet:{create:x=>x}},'../design-tokens':tokens});}
function gps(read){return {Accuracy:{High:4},getForegroundPermissionsAsync:async()=>({status:'granted'}),getCurrentPositionAsync:read};}

test('photo GPS timeout returns null once, ignoring a native fix that resolves later',async()=>{
  let finish;
  const result=await camera().acquirePhotoLocation(gps(()=>new Promise(done=>{finish=done;})),5);
  assert.equal(result,null);
  finish({timestamp:Date.now(),coords:{latitude:10,longitude:106,accuracy:5}});
  await new Promise(done=>setImmediate(done));assert.equal(result,null);
});
test('fresh photo GPS skips a cached native update and waits for a new observation',async()=>{
  let update,removed=0,currentReads=0;
  const pending=camera().acquirePhotoLocation({...gps(async()=>{currentReads++;}),watchPositionAsync:async(_,callback)=>{
    update=callback;return {remove(){removed++;}};
  }},1000);
  await new Promise(done=>setImmediate(done));assert.equal(typeof update,'function');
  let finished=false;pending.then(()=>{finished=true;});
  update({timestamp:Date.now()-60000,coords:{latitude:10,longitude:106,accuracy:5}});
  await new Promise(done=>setImmediate(done));assert.equal(finished,false);
  update({timestamp:Date.now(),coords:{latitude:11,longitude:106,accuracy:5}});
  const result=await pending;assert.equal(result.latitude,11);assert.equal(currentReads,0);assert.equal(removed,1);
});
test('fresh photo GPS timeout removes its native subscription and ignores late fixes',async()=>{
  let update,removed=0;
  const result=await camera().acquirePhotoLocation({...gps(async()=>{}),watchPositionAsync:async(_,callback)=>{update=callback;return {remove(){removed++;}};}},10);
  assert.equal(result,null);assert.equal(removed,1);
  update({timestamp:Date.now(),coords:{latitude:10,longitude:106,accuracy:5}});assert.equal(removed,1);
});
test('photo GPS rejects a stale native timestamp, denial, errors and invalid coordinates',async()=>{
  const m=camera();
  assert.equal(await m.acquirePhotoLocation(gps(async()=>({timestamp:Date.now()-60000,coords:{latitude:10,longitude:106,accuracy:5}}))),null);
  assert.equal(await m.acquirePhotoLocation(gps(async()=>({timestamp:Date.now(),coords:{latitude:91,longitude:106,accuracy:5}}))),null);
  assert.equal(await m.acquirePhotoLocation(gps(async()=>{throw Error('no GPS');})),null);
  let reads=0;
  assert.equal(await m.acquirePhotoLocation({...gps(async()=>{reads++;}),getForegroundPermissionsAsync:async()=>({status:'denied'}),requestForegroundPermissionsAsync:async()=>({status:'denied'})}),null);
  assert.equal(reads,0);
});
test('scope lost during permission wait prevents another native permission/location request',async()=>{
  let permission,current=true,reads=0,requests=0;
  const pending=camera().acquirePhotoLocation({...gps(async()=>{reads++;}),getForegroundPermissionsAsync:()=>new Promise(done=>{permission=done;}),requestForegroundPermissionsAsync:async()=>{requests++;return {status:'granted'};}},20,()=>current);
  current=false;permission({status:'denied'});assert.equal(await pending,null);assert.equal(reads,0);assert.equal(requests,0);
});
function info(){return load('src/components/crew/CrewPhotoInfo.tsx',{'react-native':{StyleSheet:{create:x=>x}},'../../design-tokens':tokens});}
test('photo info uses exact stored per-photo GPS, including zero, and never task coordinates',()=>{
  const rows=info().photoInfoRows({coordinates:{latitude:0,longitude:106.123456,accuracyMeters:5},capturedAt:'2026-11-23T01:00:00Z',localMetadata:true});
  assert.equal(rows[0].value,'0.000000');assert.equal(rows[1].value,'106.123456');assert.equal(rows[2].value,'Khoảng 5 m');
  assert.ok(!rows[3].value.includes('Chưa có'));
});
test('photo info handles old drafts, imported photos and server-only evidence without fabricating GPS/time',()=>{
  for(const input of [{localMetadata:true},{localMetadata:false},{localMetadata:true,coordinates:null,capturedAt:null},{localMetadata:true,coordinates:{latitude:NaN,longitude:106,accuracyMeters:-1},capturedAt:'invalid'}]) {
    const rows=info().photoInfoRows(input);
    assert.equal(rows[0].value,'Chưa có GPS của ảnh');assert.equal(rows[1].value,'Chưa có GPS của ảnh');
    assert.equal(rows[2].value,'Chưa có thông tin');assert.equal(rows[3].value,'Chưa có thông tin');
    if(!input.localMetadata)assert.match(rows[4].value,/Máy chủ chưa trả/);
  }
});

test('photo information opens and closes through visible accessible buttons',()=>{
  let opened=false;
  const react={createElement:(type,props,...children)=>({type,props:{...props,children}}),useState:()=>[opened,value=>{opened=value;}]};
  const m=load('src/components/crew/CrewPhotoInfo.tsx',{
    react:{...react,default:react},'react-native':{useWindowDimensions:()=>({width:390,fontScale:1}),Modal:'Modal',Pressable:'Pressable',View:'View',Text:'Text',ScrollView:'ScrollView',StyleSheet:{create:x=>x}},
    '../Button':{Button:'Button'},'../../design-tokens':tokens,
  });
  function nodes(node){return !node?[]:Array.isArray(node)?node.flatMap(nodes):[node,...nodes(node.props?.children)];}
  const render=()=>nodes(m.CrewPhotoInfo({label:'Ảnh 1',localMetadata:true,coordinates:null}));
  let tree=render();assert.equal(tree.find(n=>n.type==='Modal').props.visible,false);
  const trigger=tree.find(n=>n.type==='Pressable');assert.equal(trigger.props.accessibilityRole,'button');
  trigger.props.onPress();tree=render();assert.equal(tree.find(n=>n.type==='Modal').props.visible,true);
  tree.find(n=>n.type==='Button').props.onPress();assert.equal(render().find(n=>n.type==='Modal').props.visible,false);
});

test('capture persistence keeps the shutter timestamp and per-photo fix; gallery does not inherit either',async()=>{
  const source=fs.readFileSync('src/api/crewFieldDraft.ts','utf8');
  const ast=ts.createSourceFile('draft.ts',source,ts.ScriptTarget.Latest,true);
  const fn=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='captureFieldPhoto');
  const module={exports:{}},saved=[];let reads=0,validations=0;
  class Directory {create(){}}
  class File {constructor(dir,name){this.uri='file://'+name;}write(bytes){this.bytes=bytes;}bytesSync(){return this.bytes;}move(){}}
  const runtime={uuid:()=>String(saved.length),bytes:async()=>new Uint8Array([255,216,255,1]),hash:async()=> 'a'.repeat(64)};
  vm.runInNewContext(ts.transpileModule(ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='sameContext').getText(ast)+'\n'+fn.getText(ast),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{
    module,exports:module.exports,Directory,File,Paths:{document:'local'},Uint8Array,
    readPhotoGps:load('src/utils/photoGps.ts').readPhotoGps,
    localFieldStartAllowsCapture:()=>false,exclusive:async(c,run)=>run(),openFieldRuntime:async()=>runtime,loadFieldDraft:async()=>({captures:[]}),
    guarded:async(c,r,run)=>run(),crew:{getFieldInspectionTaskDetailReal:async()=>{reads++;return {data:{},etag:'real'};},validateCrewTaskDetail(){validations++;},fieldCapabilityBlock:()=>null},
    persist:async draft=>{saved.push(JSON.parse(JSON.stringify(draft)));},
  });
  const shutter='2026-11-23T01:00:00Z',coords={latitude:10,longitude:106,accuracyMeters:8};
  await module.exports.captureFieldPhoto({},'file://source','BEFORE','image/jpeg',coords,true,false,shutter);
  assert.deepEqual(saved[0].captures[0].coordinates,coords);assert.equal(saved[0].captures[0].capturedAt,shutter);
  assert.equal(saved[0].captures[0].checksum,'a'.repeat(64));assert.equal(saved[0].captures[0].localOnly,true);
  await module.exports.captureFieldPhoto({},'file://gallery','BEFORE','image/jpeg',coords,false,false,shutter);
  assert.equal(saved[1].captures[0].coordinates,null);assert.equal(saved[1].captures[0].capturedAt,null);
  runtime.bytes=async()=>require('./helpers/photo-exif.cjs').photo();
  await module.exports.captureFieldPhoto({},'file://original','BEFORE','image/jpeg',coords,false,false,shutter);
  assert.deepEqual(saved[2].captures[0].coordinates,{latitude:10.5,longitude:106.25,accuracyMeters:null});
  assert.equal(saved[2].captures[0].capturedAt,null);
  const context={actor:'crew',scope:'sid',environment:'docker',projectId:'project',taskId:'task'};
  const snapshot={...context,data:{},etag:'real'},before=reads;
  await module.exports.captureFieldPhoto(context,'file://offline','BEFORE','image/jpeg',coords,true,false,shutter,snapshot);
  assert.equal(reads,before,'local capture must not require HTTP');assert.equal(validations,1);
  assert.deepEqual(saved[3].captures[0].coordinates,coords);assert.equal(saved[3].captures[0].capturedAt,shutter);
  for(const key of ['actor','scope','environment','projectId','taskId']){
    await assert.rejects(module.exports.captureFieldPhoto(context,'file://bad','BEFORE','image/jpeg',coords,true,false,shutter,{...snapshot,[key]:'different'}),/field_session_changed/);
  }
  assert.equal(saved.length,4,'foreign snapshots cannot persist a photo');
});

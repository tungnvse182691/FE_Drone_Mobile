const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const wait=async()=>{for(let n=0;n<5;n++)await new Promise(r=>setImmediate(r));};
function mount(file,name,deps,props){let cursor=0,first=true;const slots=[],effects=[],cleanups=[];
 const react={createElement:(type,p,...children)=>({type,props:p??{},children}),useState:initial=>{const n=cursor++;if(first)slots[n]=typeof initial==='function'?initial():initial;return [slots[n],v=>slots[n]=typeof v==='function'?v(slots[n]):v];},useRef:initial=>{const n=cursor++;if(first)slots[n]={current:initial};return slots[n];},useEffect:f=>{cursor++;if(first)effects.push(f);}};
 const m={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,{module:m,exports:m.exports,require:n=>n==='react'?react:n==='react-native'?{Text:'Text',View:'View',Pressable:'Pressable',StyleSheet:{create:x=>x}}:n==='../Card'?{Card:'Card'}:n==='../Button'?{Button:'Button'}:n==='../../design-tokens'?{colors:{},spacing:{},radius:{},typography:{}}:n==='@expo/vector-icons'?{MaterialIcons:'MaterialIcons'}:deps[n]});
 const render=()=>{cursor=0;const tree=m.exports[name](props);if(first){first=false;for(const e of effects)cleanups.push(e());}return tree;};
 const nodes=(tree)=>!tree?[]:Array.isArray(tree)?tree.flatMap(nodes):typeof tree==='object'?[tree,...tree.children.flatMap(nodes)]:[];
 return {render,nodes,unmount:()=>cleanups.forEach(f=>f?.())};
}
test('C10BC mounted detail reads real facts; blocked actions remain disabled, no POST on mount',async()=>{
 let reads=0;const i={actor:'synthetic',scope:'A'},facts={geometry:null,geometryUnavailable:true,history:{events:[],assignments:[]}};
 const h=mount('src/components/crew/CrewTaskFacts.tsx','CrewTaskFacts',{'../../api/crewSafetyWorkflow':{currentQueueIdentity:()=>i,crewReadGuard:()=>{},readAssignedFieldFacts:async()=>{reads++;return facts;},CREW_REVIEW_GATE:'READBACK_GAP',CREW_SAFETY_GATE:'BE_DISCOVERY_GAP'},'../../offline/upload-queue':{sameQueueIdentity:()=>true}},{projectId:'project',taskId:'task'});
 let tree=h.render();assert.equal(reads,0);h.nodes(tree).find(n=>n.props.title==='Xem vị trí / lịch sử').props.onPress();await wait();tree=h.render();assert.equal(reads,1);
 assert.equal(h.nodes(tree).filter(n=>n.type==='Button'&&n.props.disabled===true).length,2);assert.match(JSON.stringify(tree),/Chưa có sự kiện/);h.unmount();
});
test('C10BC mounted sync hides stale identity and ignores late probe after unmount',async()=>{
 let active=true,resolve,reads=0;const pending=new Promise(r=>resolve=r),i={actor:'actor',scope:'A',environment:'fixture'};
 const h=mount('src/components/crew/CrewOfflinePanel.tsx','CrewOfflinePanel',{'../../api/crewOfflineDevice':{inspectOfflineDevice:()=>pending},'../../api/crewOfflineJournal':{openOfflineJournal:async()=>({list:async()=>{reads++;return [];}})},'../../api/crewOfflineWorkflow':{HANDOVER_GATE:'BLOCKED_CRYPTO_CONTRACT'},'../../../modules/roadguard-offline-crypto':{NATIVE_ACCEPTANCE_VERIFIED:false},'../../offline/upload-queue':{sameQueueIdentity:()=>active}},{identity:i});
 const tree=h.render();
 for(const label of ['Đăng ký thiết bị','Tạo bản dữ liệu nhiệm vụ','Gửi dữ liệu đã ký']){
   assert.ok(h.nodes(tree).some(n=>n.type==='Text'&&n.children.join('')===`• ${label}: chưa mở`));
   assert.equal(h.nodes(tree).filter(n=>n.props.title===label||n.props.onPress&&n.children.join('').includes(label)).length,0);
 }
 const button=h.nodes(tree).find(n=>n.props.title==='Kiểm tra thiết bị / đọc nhật ký');button.props.onPress();button.props.onPress();
 h.unmount();active=false;resolve({deviceId:null,capability:{}});await wait();assert.equal(reads,1);assert.equal(h.render(),null);
});

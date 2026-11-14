const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const wait=async()=>{for(let n=0;n<5;n++)await new Promise(r=>setImmediate(r));};
const mapModule={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/crew-map-geometry.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:mapModule,exports:mapModule.exports});
function mount(file,name,deps,props){let cursor=0,first=true;const slots=[],effects=[],cleanups=[];
 deps={'../../utils/crew-map-geometry':mapModule.exports,'../map/RoadGuardMapLibre':{RoadGuardMapLibre:'RoadGuardMapLibre'},...deps};
 const react={createElement:(type,p,...children)=>({type,props:p??{},children}),useState:initial=>{const n=cursor++;if(first)slots[n]=typeof initial==='function'?initial():initial;return [slots[n],v=>slots[n]=typeof v==='function'?v(slots[n]):v];},useRef:initial=>{const n=cursor++;if(first)slots[n]={current:initial};return slots[n];},useEffect:f=>{cursor++;if(first)effects.push(f);},useCallback:f=>f};
 const m={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,{module:m,exports:m.exports,require:n=>n==='react'?react:n==='react-native'?{Text:'Text',View:'View',Pressable:'Pressable',StyleSheet:{create:x=>x}}:n==='expo-router'?{useFocusEffect:f=>{if(first)effects.push(f);}}:n==='../Card'?{Card:'Card'}:n==='../Button'?{Button:'Button'}:n==='../../design-tokens'?{colors:{},spacing:{},radius:{},typography:{}}:n==='@expo/vector-icons'?{MaterialIcons:'MaterialIcons'}:deps[n]});
 const render=()=>{cursor=0;const tree=m.exports[name](props);if(first){first=false;for(const e of effects)cleanups.push(e());}return tree;};
 const nodes=(tree)=>!tree?[]:Array.isArray(tree)?tree.flatMap(nodes):typeof tree==='object'?[tree,...tree.children.flatMap(nodes)]:[];
 return {render,nodes,unmount:()=>cleanups.forEach(f=>f?.())};
}
test('C10BC mounted detail reads real facts; unavailable actions are not offered, no POST on mount',async()=>{
 let reads=0;const i={actor:'synthetic',scope:'A'},facts={geometry:null,geometryUnavailable:true,history:{events:[],assignments:[]}};
 const h=mount('src/components/crew/CrewTaskFacts.tsx','CrewTaskFacts',{'../../api/crewSafetyWorkflow':{currentQueueIdentity:()=>i,crewReadGuard:()=>{},readAssignedFieldFacts:async()=>{reads++;return facts;},CREW_REVIEW_GATE:'READBACK_GAP',CREW_SAFETY_GATE:'BE_DISCOVERY_GAP'},'../../offline/upload-queue':{sameQueueIdentity:()=>true}},{projectId:'project',taskId:'task'});
 let tree=h.render();assert.equal(reads,0);h.nodes(tree).find(n=>n.props.title==='Xem vị trí / lịch sử').props.onPress();await wait();tree=h.render();assert.equal(reads,1);
 assert.equal(h.nodes(tree).some(n=>['Yêu cầu xem xét lại','Biện pháp an toàn'].includes(n.props.title)),false);assert.match(JSON.stringify(tree),/Chưa có sự kiện/);h.unmount();
});
test('C10BC mounted sync hides stale identity and ignores late probe after unmount',async()=>{
 let active=true,resolve,reads=0;const pending=new Promise(r=>resolve=r),i={actor:'actor',scope:'A',environment:'fixture'};
 const h=mount('src/components/crew/CrewOfflinePanel.tsx','CrewOfflinePanel',{'../../api/crewOfflineDevice':{inspectOfflineDevice:()=>pending},'../../api/crewOfflineJournal':{openOfflineJournal:async()=>({list:async()=>{reads++;return [];}})},'../../api/crewOfflineWorkflow':{HANDOVER_GATE:'BLOCKED_CRYPTO_CONTRACT'},'../../../modules/roadguard-offline-crypto':{NATIVE_ACCEPTANCE_VERIFIED:false},'../../offline/upload-queue':{sameQueueIdentity:()=>active}},{identity:i});
 let tree=h.render();
 for(const label of ['Đăng ký thiết bị','Tạo bản dữ liệu nhiệm vụ','Gửi dữ liệu đã ký'])
   assert.equal(h.nodes(tree).filter(n=>n.props.title===label||n.props.onPress&&n.children.join('').includes(label)).length,0);
 h.unmount();active=false;resolve({deviceId:null,capability:{}});await wait();assert.equal(reads,1);assert.equal(h.render(),null);
});

test('Crew repair facts shows compact authoritative safety/decision readback and hides it after session change',async()=>{
 let active=true,reads=0;const identity={actor:'crew',scope:'A'},facts={context:{finalDecision:{decisionId:'new',result:'CONFIRMED',at:'2026-11-14T00:00:00Z'},reviewRequests:[{requestId:'request',decisionId:'old',reason:'Kiểm tra lại',at:'2026-11-13T00:00:00Z'}]},measures:[{data:{id:'measure',installedAt:null,firstCheckDueAt:null,checks:[],warnings:[],acknowledgements:[],eligibleEvidenceLinks:[]}}]};
 const h=mount('src/components/crew/CrewRepairFacts.tsx','CrewRepairFacts',{'../../api/crewSafetyWorkflow':{currentQueueIdentity:()=>identity,crewReadGuard:()=>{if(!active)throw Error('session');},readAssignedRepairFacts:async()=>{reads++;return facts;}},'../../offline/upload-queue':{sameQueueIdentity:()=>active},'./CrewTaskFacts':{crewHistoryTime:v=>v}},{projectId:'project',taskId:'task'});
 let tree=h.render();assert.equal(reads,0);h.nodes(tree).find(n=>n.props.title==='Xem hồ sơ phụ trách').props.onPress();await wait();tree=h.render();assert.equal(reads,1);assert.match(JSON.stringify(tree),/Đã xác nhận kết quả/);assert.match(JSON.stringify(tree),/Quyết định trước/);assert.match(JSON.stringify(tree),/Chưa lắp đặt/);active=false;assert.equal(h.render(),null);h.unmount();
});

test('Crew facts keeps explicit target when route unavailable and selects segments without joining gaps',async()=>{
 const identity={actor:'crew',role:'REPAIR_CREW'};
 const make=async facts=>{
  const h=mount('src/components/crew/CrewTaskFacts.tsx','CrewTaskFacts',{'../../api/crewSafetyWorkflow':{currentQueueIdentity:()=>identity,crewReadGuard:()=>{},readAssignedFieldFacts:async()=>facts},'../../offline/upload-queue':{sameQueueIdentity:()=>true}},{projectId:'project',taskId:'task'});
  let tree=h.render();h.nodes(tree).find(n=>n.props.title==='Xem vị trí / lịch sử').props.onPress();await wait();return h;
 };
 const base={history:{events:[],assignments:[]},defectTarget:{longitude:106.5,latitude:10.5}};
 const h=await make({...base,geometry:null,geometryUnavailable:true});
 let map=h.nodes(h.render()).find(n=>n.type==='RoadGuardMapLibre');assert.equal(JSON.stringify(map.props.markers[0].coordinate),'[106.5,10.5]');assert.equal(map.props.routeCoordinates.length,0);h.unmount();
 const line=coordinates=>({wgs84Geometry:{type:'LineString',coordinates}});
 const s=await make({...base,geometry:{route:line([[106,10],[106.1,10]]),segments:[{id:'one',sequence:1,...line([[106,10],[106.01,10]])},{id:'two',sequence:2,...line([[107,11],[107.01,11]])}]}});
 let tree=s.render();s.nodes(tree).find(n=>n.type==='Pressable'&&JSON.stringify(n.children).includes('Đoạn 2')).props.onPress();
 map=s.nodes(s.render()).find(n=>n.type==='RoadGuardMapLibre');assert.equal(JSON.stringify(map.props.routeCoordinates),'[[107,11],[107.01,11]]');s.unmount();
});

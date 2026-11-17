const {test}=require('node:test'),assert=require('node:assert/strict');
const {screen}=require('./helpers/roadfe-screen.cjs');

test('Crew AFTER camera guides to this task progress while preserving the capture guard',async()=>{
 const context={actor:'crew',scope:'session',environment:'sandbox',projectId:'project',taskId:'task'};
 let navigated,captures=0;
 const s=screen('app/(crew)/viewfinder.tsx',{expose:'CrewViewfinderScreenContent',exportName:'CrewViewfinderScreenContent',props:{task:{id:'task',projectId:'project',detail:{mode:'NORMAL',purpose:'PostRepair'}}},moduleFactories:{'expo-router':({react})=>({useIsFocused:()=>true,useLocalSearchParams:()=>({mode:'AFTER'}),useFocusEffect:fn=>react.useEffect(fn,[fn]),router:{dismissTo:href=>navigated=href}})},modules:{
  './tasks':{useCrewIdentity:()=>({user:{id:'crew'},scope:'session'})},
  '../../src/api/crewApi':{fieldCapabilityBlock:()=>null},
  '../../src/components/ViewFinder':{ViewFinder:'ViewFinder'},
  '../../src/api/crewFieldDraft':{currentFieldContext:()=>context,openFieldRuntime:async()=>({}),loadFieldDraft:async()=>({...context,captures:[],measurements:[]}),fieldDraftPending:()=>false,fieldErrorMessage:()=>'',captureFieldPhoto:async()=>{captures++;}},
 }});
 s.render();await s.flush();
 const camera=s.nodes().find(n=>n.type==='ViewFinder');assert.equal(camera.props.disabled,true);
 camera.props.onCapture({uri:'file://photo'});await s.flush();assert.equal(captures,0);
 assert.ok(!s.nodes().some(n=>n.props.title==='Tôi xác nhận đang chụp hiện trạng sau sửa'));
 await s.press('Xem bước cần làm để chụp sau');
 assert.deepEqual(JSON.parse(JSON.stringify(navigated)),{pathname:'/(crew)/progress',params:{id:'task',projectId:'project'}});
 s.unmount();
});

test('Crew AFTER confirmation is readable on camera and only explicit selection unlocks capture',async()=>{
 const context={actor:'crew',scope:'session',environment:'sandbox',projectId:'project',taskId:'task'};
 let navigated,captures=0;
 const s=screen('app/(crew)/viewfinder.tsx',{expose:'CrewViewfinderScreenContent',exportName:'CrewViewfinderScreenContent',props:{task:{id:'task',projectId:'project',detail:{mode:'NORMAL',purpose:'PostRepair'}}},moduleFactories:{'expo-router':({react})=>({useIsFocused:()=>true,useLocalSearchParams:()=>({mode:'AFTER'}),useFocusEffect:fn=>react.useEffect(fn,[fn]),router:{dismissTo:href=>navigated=href}})},modules:{
  './tasks':{useCrewIdentity:()=>({user:{id:'crew'},scope:'session'})},
  '../../src/api/crewApi':{fieldCapabilityBlock:()=>null},
  '../../src/components/ViewFinder':{ViewFinder:'ViewFinder'},
  '../../src/api/crewFieldDraft':{currentFieldContext:()=>context,openFieldRuntime:async()=>({}),loadFieldDraft:async()=>({...context,captures:[],measurements:[],repairClaim:{}}),fieldDraftPending:()=>false,fieldErrorMessage:()=>'',captureFieldPhoto:async()=>{captures++;}},
 }});
 s.render();await s.flush();
 const label='Tôi xác nhận đang chụp hiện trạng sau sửa';
 let control=s.nodes().find(n=>n.props.accessibilityLabel===label);
 assert.ok(control,'confirmation control is accessible');
 assert.equal(control.props.accessibilityRole,'checkbox');
 assert.equal(control.props.accessibilityState.checked,false);
 const text=s.nodes().find(n=>n.type==='Text'&&n.props.children.includes('Xác nhận chụp sau sửa'));
 assert.equal(text.props.style.color,'#FFFFFF');
 assert.equal(s.nodes().find(n=>n.type==='ViewFinder').props.disabled,true);
 control.props.onPress();await s.flush();
 control=s.nodes().find(n=>n.props.accessibilityLabel===label);
 assert.equal(control.props.accessibilityState.checked,true);
 assert.equal(s.nodes().find(n=>n.type==='ViewFinder').props.disabled,false);
 assert.equal(captures,0);s.unmount();
});

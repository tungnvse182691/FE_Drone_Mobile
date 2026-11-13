const {test}=require('node:test'),assert=require('node:assert/strict');
const {screen}=require('./helpers/roadfe-screen.cjs');

test('Crew gallery reads the granted content URI and preserves it before the picker grant ends',async()=>{
 const context={actor:'crew',scope:'session',environment:'sandbox',projectId:'project',taskId:'task'};
 const draft={...context,captures:[],measurements:[]};let options,captured;
 const s=screen('app/(crew)/viewfinder.tsx',{expose:'CrewViewfinderScreenContent',exportName:'CrewViewfinderScreenContent',props:{task:{id:'task',projectId:'project',detail:{mode:'FIELD',purpose:'PreRepair'}}},moduleFactories:{'expo-router':({react})=>({useIsFocused:()=>true,useLocalSearchParams:()=>({}),useFocusEffect:fn=>react.useEffect(fn,[fn]),router:{}})},modules:{
  './tasks':{useCrewIdentity:()=>({user:{id:'crew'},scope:'session'})},
  '../../src/api/crewApi':{fieldCapabilityBlock:()=>null},
  '../../src/components/ViewFinder':{ViewFinder:'ViewFinder'},
  'expo-document-picker':{getDocumentAsync:async value=>{options=value;return {canceled:false,assets:[{uri:'content://photos/qa',mimeType:'image/png'}]};}},
  '../../src/api/crewFieldDraft':{currentFieldContext:()=>context,openFieldRuntime:async()=>({}),loadFieldDraft:async()=>draft,fieldDraftPending:()=>false,fieldErrorMessage:()=>'',captureFieldPhoto:async(...args)=>{captured=args;return {...draft,captures:[{id:'photo'}]};}},
 }});
 s.render();await s.flush();
 const picker=s.nodes().find(n=>n.type==='ViewFinder').props.leftControl;await picker.props.onPress();await s.flush();
 assert.equal(options.copyToCacheDirectory,false,'Expo Go shared DocumentPicker cache is outside the experience file sandbox');
 assert.equal(captured[1],'content://photos/qa');assert.equal(captured[5],false,'gallery must not invent camera provenance');
 const thumbs=s.nodes().find(n=>n.type==='ViewFinder').props;
 assert.ok(JSON.stringify(thumbs).includes('Đã lưu nháp'));s.unmount();
});

const {test}=require('node:test');
const assert=require('node:assert/strict');
const {screen}=require('./helpers/roadfe-screen.cjs');

function motion(props={},exportName='CrewPressable') {
 const calls=[],listeners=new Map();let resolve,focusEffect;
 const preference=new Promise(r=>resolve=r);
 const s=screen('src/components/crew/CrewMotion.tsx',{
  exportName,props,
  moduleFactories:{'react-native-reanimated':({react})=>({
   __esModule:true,default:{createAnimatedComponent:()=> 'MotionPressable',View:'AnimatedView'},
   useSharedValue:v=>react.useRef({value:v}).current,
   useAnimatedStyle:fn=>fn(),withTiming:(v,config)=>{calls.push({v,config});return v;},
   cancelAnimation:()=>calls.push({cancel:true}),ReduceMotion:{System:'system'},
  })},
  modules:{'expo-router':{useFocusEffect:fn=>{focusEffect=fn;}},'react-native':{Pressable:'Pressable',AccessibilityInfo:{
   isReduceMotionEnabled:()=>preference,
   addEventListener:(event,fn)=>{listeners.set(event,fn);return {remove:()=>listeners.delete(event)};},
  }}}
 });
 return {s,calls,listeners,resolve,focus:()=>focusEffect()};
}
test('Quick taps show foreground ripple over opaque content and keep the immediate action',()=>{
 let actions=0;const onPress=()=>actions++;
 const m=motion({onPress});m.s.render();
 const b=m.s.nodes().find(n=>n.type==='MotionPressable');
 assert.equal(b.props.android_ripple?.foreground,true);
 assert.equal(b.props.onPress,onPress);b.props.onPress();assert.equal(actions,1);
 m.s.unmount();
});
test('A cached screen replays on focus without waiting for a new API revision',async()=>{
 const m=motion({ready:true,replayOnFocus:true,revision:7,children:'cached-content'},'CrewContentTransition');
 m.s.render();m.resolve(false);await m.s.flush();
 const count=m.calls.filter(x=>x.config).length;
 m.focus();await m.s.flush();
 assert.equal(m.calls.filter(x=>x.config).length,count+1);
 m.s.render();assert.equal(m.calls.filter(x=>x.config).length,count+1,'ordinary renders do not replay');
 m.listeners.get('reduceMotionChanged')(true);await m.s.flush();
 m.focus();await m.s.flush();assert.equal(m.calls.filter(x=>x.config).length,count+1);
 assert.ok(JSON.stringify(m.s.nodes()).includes('cached-content'));m.s.unmount();
});
test('Crew press feedback respects live Reduce Motion and a late preference read',async()=>{
 const m=motion();m.s.render();
 let button=m.s.nodes().find(n=>n.type==='MotionPressable');
 button.props.onPressIn({});assert.equal(m.calls.filter(x=>x.config).length,0,'unknown preference defaults to static');
 m.resolve(false);await m.s.flush();button=m.s.nodes().find(n=>n.type==='MotionPressable');
 button.props.onPressIn({});button.props.onPressOut({});
 assert.deepEqual(m.calls.filter(x=>x.config).map(x=>x.v),[0.96,1]);
 assert.ok(m.calls.filter(x=>x.config).every(x=>x.config.reduceMotion==='system'));
 m.listeners.get('reduceMotionChanged')(true);await m.s.flush();
 const count=m.calls.filter(x=>x.config).length;
 m.s.nodes().find(n=>n.type==='MotionPressable').props.onPressIn({});
 assert.equal(m.calls.filter(x=>x.config).length,count);
 m.s.unmount();assert.equal(m.listeners.size,0);
});
test('Crew disabled controls do not animate; press callbacks and labels remain intact',async()=>{
 let pressed=0;
 const m=motion({disabled:true,accessibilityLabel:'Nhận việc',onPress:()=>pressed++});
 m.s.render();m.resolve(false);await m.s.flush();
 const b=m.s.nodes().find(n=>n.type==='MotionPressable');
 assert.equal(b.props.disabled,true);assert.equal(b.props.accessibilityLabel,'Nhận việc');
 b.props.onPressIn({});assert.equal(m.calls.filter(x=>x.config).length,0);assert.equal(pressed,0);
 m.s.unmount();
});
test('Animated native control receives concrete styles including pressed feedback',async()=>{
 const m=motion({style:({pressed})=>({backgroundColor:pressed?'pressed':'rest',minHeight:52})});
 m.s.render();let b=m.s.nodes().find(n=>n.type==='MotionPressable');
 assert.ok(Array.isArray(b.props.style));assert.equal(b.props.style[0].backgroundColor,'rest');
 b.props.onPressIn({});await m.s.flush();b=m.s.nodes().find(n=>n.type==='MotionPressable');
 assert.equal(b.props.style[0].backgroundColor,'pressed');
 b.props.onPressOut({});await m.s.flush();b=m.s.nodes().find(n=>n.type==='MotionPressable');
 assert.equal(b.props.style[0].backgroundColor,'rest');m.s.unmount();
});
test('Content motion follows real read revisions, remains static for Reduce Motion and preserves children',async()=>{
 const props={ready:true,revision:1,children:'real-content'};
 const m=motion(props,'CrewContentTransition');m.s.render();
 assert.equal(m.calls.filter(x=>x.config).length,0);
 m.resolve(false);await m.s.flush();
 assert.equal(m.calls.filter(x=>x.config).at(-1).config.duration,280);
 const count=m.calls.filter(x=>x.config).length;
 props.revision=2;m.s.render();assert.equal(m.calls.filter(x=>x.config).length,count+1);
 m.listeners.get('reduceMotionChanged')(true);await m.s.flush();
 props.revision=3;m.s.render();assert.equal(m.calls.filter(x=>x.config).length,count+1);
 assert.ok(JSON.stringify(m.s.nodes()).includes('real-content'));m.s.unmount();
});
test('Mode colors differ by work type, meet readable contrast and never supply authority',()=>{
 const fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm'),e={};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/crew/crewHomeTones.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:e});
 const lum=h=>{const c=h.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
 const tones=['NORMAL','CONDITIONAL_FT','MEASURE_ONLY','UNKNOWN'].map(e.crewHomeModeTone);
 assert.equal(new Set(tones.map(t=>t.background)).size,4);
 for(const t of tones){const [a,b]=[lum(t.background),lum(t.foreground)].sort((a,b)=>b-a);assert.ok((a+.05)/(b+.05)>=4.5);assert.deepEqual(Object.keys(t).sort(),['background','border','foreground','icon']);}
});

function home(inbox) {
 const nav=[];
 const s=screen('app/(crew)/home.tsx',{modules:{
  './tasks':{useCrewInbox:()=>inbox,CrewInboxState:'CrewInboxState',TASK_MODE_CHIP:{MEASURE_ONLY:{label:'Chỉ đo kiểm'}},crewStatusLabel:s=>'Trạng thái: '+s,crewDateTime:s=>s,crewTaskCodePreview:s=>s.length>16?s.slice(0,14)+'…':s},
  '../../src/api/crewApi':{crewTaskIsComplete:t=>t.status==='Completed'},
  '../../src/components/AppHeader':{AppHeader:'AppHeader'},'../../src/components/Card':{Card:'Card'},
  '../../src/components/CrewTaskStatus':{CrewTaskStatus:'CrewTaskStatus'},
  '../../src/components/crew/CrewMotion':{CrewPressable:'CrewPressable',CrewContentTransition:'CrewContentTransition'},
  '../../src/components/crew/CrewHomeTaskPressable':{CrewHomeTaskPressable:'Pressable'},
  'expo-router':{router:{push:r=>nav.push(r)}},
 }});return {s,nav};
}
test('Crew home motion does not change task identity, disabled navigation or API calls',()=>{
 const task={id:'actual-task',projectId:'actual-project',version:'actual-version',title:'Nhiệm vụ thật',status:'InProgress',task_mode:'MEASURE_ONLY'};
 const {s,nav}=home({enabled:true,tasks:[task,{...task,id:'incomplete',version:null}],query:{}});s.render();
 const rows=s.nodes().filter(n=>n.type==='Pressable'&&n.props.accessibilityRole==='button');
 rows.find(n=>!n.props.disabled).props.onPress();
 assert.equal(nav[0].pathname,'/(crew)/wo-detail');assert.equal(nav[0].params.id,task.id);
 assert.equal(rows.find(n=>n.props.disabled).props.disabled,true);
 assert.ok(s.nodes().some(n=>n.type==='CrewTaskStatus'&&n.props.status==='InProgress'&&n.props.label==='Trạng thái: InProgress'));
 assert.equal(s.h.calls.length,0);assert.equal(task.version,'actual-version');s.unmount();
});
test('Home uses loading placeholders only while initial real query is pending',()=>{
 const inbox={enabled:true,tasks:[],query:{isPending:true}};
 const {s}=home(inbox);s.render();assert.ok(s.nodes().some(n=>n.props.testID==='crew-home-loading'));
 inbox.query.isPending=false;inbox.error='Không tải được';s.render();
 assert.ok(!s.nodes().some(n=>n.props.testID==='crew-home-loading'));
 assert.ok(s.nodes().some(n=>n.type==='CrewInboxState'&&n.props.inbox.error));
 assert.equal(s.h.calls.length,0);s.unmount();
});

test('Home uses one list heading and leaves the loaded-scope note only in the overview',()=>{
 const {s}=home({enabled:true,tasks:[],query:{}});s.render();
 const text=JSON.stringify(s.nodes());
 assert.equal(s.nodes().filter(n=>n.type==='Text'&&String(n.props.children)==='Thống kê trong các nhiệm vụ đã tải').length,1);
 assert.ok(text.includes('Nhiệm vụ chưa hoàn thành'));
 assert.ok(!text.includes('Nhiệm vụ đang theo dõi'));
 assert.equal(s.nodes().find(n=>n.type==='CrewInboxState').props.presentation,'home');s.unmount();
});

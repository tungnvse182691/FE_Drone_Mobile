const {test}=require('node:test'),assert=require('node:assert/strict');
const {screen,deferred}=require('./helpers/roadfe-screen.cjs');
const flatten=s=>Array.isArray(s)?Object.assign({},...s.filter(Boolean).map(flatten)):s??{};

function photoScreen(file, options) {
 return screen(file,{...options,moduleFactories:{'react-native':({modules})=>({...modules['react-native'],
  AccessibilityInfo:{isReduceMotionEnabled:async()=>true,addEventListener:()=>({remove(){}})},
  Animated:{View:'AnimatedView',Value:class{constructor(value){this.value=value;}setValue(value){this.value=value;}stopAnimation(){}},timing:()=>({start(){},stop(){}})}
 })}});
}

test('photo verification keeps the image visible with a compact green badge',()=>{
 const s=photoScreen('src/components/reporter/PhotoUploadStatus.tsx',{exportName:'PhotoUploadStatus',props:{item:{mediaState:'VERIFIED'},index:0}});s.render();
 const root=s.nodes().find(n=>n.props.testID==='photo-state-0');
 assert.equal(flatten(root.props.style).backgroundColor,'transparent');
 assert.equal(s.nodes().find(n=>n.props.name==='check-circle').props.color,'#2F9E44');s.unmount();
});

test('photo status link has breathing room and a trailing chevron',async()=>{
 const s=screen('app/(reporter)/report.tsx');s.h.login();s.render();await s.flush();
 const link=s.nodes().find(n=>n.props.testID==='open-photo-status');
 assert.equal(flatten(link.props.style).marginTop,16);
 const label=link.props.children.find(n=>n?.type==='Text');assert.equal(flatten(label.props.style).flex,1);s.unmount();
});

test('submitting hides the status link until the operation settles',async()=>{
 const gate=deferred();
 const s=screen('app/(reporter)/report.tsx',{pick:async()=>({canceled:false,assets:[{uri:'content://qa/image.jpg',name:'image.jpg',mimeType:'image/jpeg'}]})});
 s.h.login();s.render();await s.flush();await s.tap('pick-photo');await s.flush();s.input('Mô tả hiện trạng','QA nứt tấm bê tông');
 s.reporter.useReporterStore.getState().submitPendingDraft=()=>gate.promise;
 const pending=s.press('Gửi phản ánh');await s.flush();
 assert.ok(!s.nodes().some(n=>n.props.testID==='open-photo-status'));
 assert.equal(flatten(s.nodes().find(n=>n.props.pointerEvents==='none'&&Array.isArray(n.props.style)&&flatten(n.props.style).opacity===0.45).props.style).opacity,0.45);
 gate.reject(new Error('fixture stopped'));await pending;await s.flush();
 assert.ok(s.nodes().some(n=>n.props.testID==='open-photo-status'));s.unmount();
});
test('Reporter keyboard hides only navigation and restores it without unmounting Stack',async()=>{
 const listeners=new Map();let removed=0;
 const s=screen('app/(reporter)/_layout.tsx',{moduleFactories:{'react-native':({modules})=>({...modules['react-native'],Keyboard:{isVisible:()=>false,addListener:(event,fn)=>{listeners.set(event,fn);return{remove(){removed++;}};}}})},modules:{'expo-router':{Stack:'Stack',usePathname:()=>'/report',useRouter:()=>({push(){}})},'../../src/components/BottomNav':{BottomNav:'BottomNav'}}});
 s.render();assert.ok(s.nodes().some(n=>n.type==='BottomNav'));
 const root=s.nodes().find(n=>n.props.onLayout&&n.type==='View');
 root.props.onLayout({nativeEvent:{layout:{width:412,height:868}}});await s.flush();
 root.props.onLayout({nativeEvent:{layout:{width:412,height:520}}});await s.flush();
 assert.equal(s.nodes().find(n=>n.props.testID==='reporter-navigation-dock').props.style[1].height,868,'native resize must clip the dock before any keyboard JS event');
 root.props.onLayout({nativeEvent:{layout:{width:868,height:412}}});await s.flush();
 assert.equal(s.nodes().find(n=>n.props.testID==='reporter-navigation-dock').props.style[1].height,412,'rotation establishes a new viewport');
 listeners.get('keyboardDidShow')();await s.flush();assert.ok(!s.nodes().some(n=>n.type==='BottomNav'));assert.ok(s.nodes().some(n=>n.type==='Stack'));
 listeners.get('keyboardDidHide')();await s.flush();assert.ok(s.nodes().some(n=>n.type==='BottomNav'));s.unmount();assert.equal(removed,2);
});
for(const [state,label,busy,verified] of [['LOCAL_READY','Chờ tải',false,false],['SESSION_CREATED','Đang tải',true,false],['UPLOADING','Đang tải',true,false],['COMPLETE_REQUESTED','Đang kiểm tra',true,false],['VERIFYING','Đang kiểm tra',true,false],['VERIFIED','Đã xác minh',false,true],['FAILED','Cần kiểm tra',false,false]])test('Photo overlay '+state+' shows honest compact feedback',()=>{
 const item={mediaState:state,sizeBytes:100,partSizeBytes:50,partETags:{'1':'etag'},cancelState:null};
 const s=photoScreen('src/components/reporter/PhotoUploadStatus.tsx',{exportName:'PhotoUploadStatus',props:{item,index:0}});s.render();
 const root=s.nodes().find(n=>n.props.testID==='photo-state-0');assert.match(root.props.accessibilityLabel,new RegExp(label));assert.equal(root.props.accessibilityState.busy,busy);
 assert.equal(s.nodes().some(n=>n.type==='ActivityIndicator'),busy&&state!=='UPLOADING');
 assert.equal(s.nodes().some(n=>n.props.name==='check-circle'),verified);
 if(state==='UPLOADING'){const bar=s.nodes().find(n=>n.props.accessibilityRole==='progressbar');assert.equal(bar.props.accessibilityValue.now,50);}
 s.unmount();
});
test('100 percent bytes and cancellation never show verification success',()=>{
 for(const item of [{mediaState:'UPLOADING',sizeBytes:100,partSizeBytes:50,partETags:{'1':'a','2':'b'}},{mediaState:'VERIFIED',cancelState:'UNKNOWN'}]){
 const s=photoScreen('src/components/reporter/PhotoUploadStatus.tsx',{exportName:'PhotoUploadStatus',props:{item,index:1}});s.render();assert.ok(!s.nodes().some(n=>n.props.name==='check-circle'));s.unmount();
 }
});


test('Reporter location displays only the native fix and supplied accuracy',async()=>{
 const s=screen('app/(reporter)/report.tsx',{gps:{Accuracy:{High:1},getForegroundPermissionsAsync:async()=>({status:'granted'}),getCurrentPositionAsync:async()=>({coords:{latitude:37.421998,longitude:-122.084,accuracy:5}})}});
 s.h.login();s.render();await s.flush();
 const coordinate=s.nodes().find(n=>n.props.testID==='reporter-coordinate');assert.ok(coordinate);
 assert.match(JSON.stringify(coordinate),/37.421998/);assert.match(JSON.stringify(coordinate),/-122.084000/);assert.match(JSON.stringify(coordinate),/5/);
 assert.equal(s.h.calls.length,0);s.unmount();
});

test('Reporter denied GPS does not invent a coordinate',async()=>{
 const s=screen('app/(reporter)/report.tsx');s.h.login();s.render();await s.flush();
 assert.equal(s.nodes().some(n=>n.props.testID==='reporter-coordinate'),false);assert.equal(s.h.calls.length,0);s.unmount();
});


test('Reporter focus hides tabs before delayed keyboardDidShow and supports reopening a focused input',async()=>{
 const s=screen('app/(reporter)/report.tsx');s.h.login();s.render();await s.flush();
 const keyboard=s.h.load('src/components/reporter/keyboardVisibility.ts').useReporterKeyboard;
 const input=s.nodes().find(n=>n.type==='InputField');input.props.onPressIn();assert.equal(keyboard.getState().opening,true);input.props.onFocus();assert.equal(keyboard.getState().opening,true);
 keyboard.getState().setOpening(false);
 s.nodes().find(n=>n.props.testID==='description-section').props.onTouchStart();assert.equal(keyboard.getState().opening,true);
 input.props.onBlur();assert.equal(keyboard.getState().opening,false);s.unmount();
});

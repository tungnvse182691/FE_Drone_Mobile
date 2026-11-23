const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function harness(location = { getForegroundPermissionsAsync: async () => ({ status: 'denied' }) }) {
  const state = [], refs = [], effects = [], captures = [];
  let stateSlot = 0, refSlot = 0, effectSlot = 0, rendered, appStateListener;
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(initial) {
      const slot = stateSlot++;
      if (!(slot in state)) state[slot] = initial;
      return [state[slot], value => { state[slot] = typeof value === 'function' ? value(state[slot]) : value; }];
    },
    useRef(initial) { const slot = refSlot++; return refs[slot] ??= { current: initial }; },
    useEffect(effect, deps) {
      const slot = effectSlot++;
      const previous = effects[slot];
      if (previous && deps && deps.every((value, index) => Object.is(value, previous.deps[index]))) return;
      previous?.cleanup?.();
      effects[slot] = { deps, cleanup: effect() };
    },
  };
  const module = { exports: {} };
  const deps = {
    react: { ...react, default: react },
    'react-native': { Pressable:'Pressable',Text:'Text',View:'View',AppState:{currentState:'active',addEventListener:(_,fn)=>{appStateListener=fn;return {remove(){appStateListener=undefined;}};}}, StyleSheet: { create: value => value, absoluteFill: {} } },
    'expo-camera': { CameraView: 'CameraView', useCameraPermissions: () => [{ granted: true }, () => {}] },
    'expo-location': location,
    '@expo/vector-icons': { MaterialIcons: 'Icon' },
    './Button': { Button: 'Button' },
    '../design-tokens': { colors: {}, radius: {}, spacing: {}, typography: {} },
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/ViewFinder.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText, { module, exports: module.exports, require: name => deps[name], setTimeout, clearTimeout });
  function nodes(root, found = []) {
    if (Array.isArray(root)) root.forEach(item => nodes(item, found));
    else if (root && typeof root === 'object') { found.push(root); nodes(root.props?.children, found); }
    return found;
  }
  function render(props) {
    stateSlot = refSlot = effectSlot = 0;
    rendered = module.exports.ViewFinder({ defectType: '', onCapture: photo => captures.push(photo), ...props });
    const all = nodes(rendered);
    return { retry:all.find(node=>node.props?.accessibilityLabel==='Lấy lại GPS'), camera: all.find(node => node.type === 'CameraView'), shutter: all.find(node => node.props?.testID === 'capture-button'), texts: all.filter(node => node.type === 'Text').map(node => node.props.children.flat().join('')) };
  }
  return { render, captures, appState:value=>appStateListener?.(value), dispose: () => effects.forEach(effect => effect?.cleanup?.()) };
}

test('Crew previews GPS before shutter, retries, and reacquires after returning from Settings',async()=>{
  let reads=0;const fixes=[],statuses=[];
  const h=harness({Accuracy:{High:4},getForegroundPermissionsAsync:async()=>({status:'granted'}),getCurrentPositionAsync:async()=>({timestamp:Date.now(),coords:{latitude:++reads,longitude:106,accuracy:5}})});
  const props={active:true,taskKey:'A',freshLocationOnCapture:true,onCoordsChange:v=>fixes.push(v),onLocationStatusChange:v=>statuses.push(v)};
  let ui=h.render(props);await new Promise(done=>setImmediate(done));
  assert.equal(reads,1);assert.equal(fixes.at(-1).latitude,1);assert.equal(statuses.at(-1),'ready');
  ui=h.render(props);assert.ok(ui.retry);ui.retry.props.onPress();h.render(props);await new Promise(done=>setImmediate(done));assert.equal(reads,2);
  h.appState('background');h.render(props);h.appState('active');h.render(props);await new Promise(done=>setImmediate(done));assert.equal(reads,3);
  h.dispose();
});

test('Crew denied preview reports unavailable and can retry after permission is granted',async()=>{
  let granted=false,reads=0;const statuses=[];
  const permission=async()=>({status:granted?'granted':'denied'});
  const h=harness({Accuracy:{High:4},getForegroundPermissionsAsync:permission,requestForegroundPermissionsAsync:permission,getCurrentPositionAsync:async()=>{reads++;return {timestamp:Date.now(),coords:{latitude:10,longitude:106,accuracy:5}};}});
  const props={active:true,freshLocationOnCapture:true,onLocationStatusChange:v=>statuses.push(v)};
  h.render(props);await new Promise(done=>setImmediate(done));assert.equal(reads,0);assert.equal(statuses.at(-1),'unavailable');
  granted=true;h.render(props).retry.props.onPress();h.render(props);await new Promise(done=>setImmediate(done));assert.equal(reads,1);assert.equal(statuses.at(-1),'ready');h.dispose();
});

test('a delayed preview cannot overwrite the fresh photo fix after capture finishes',async()=>{
  let finishPreview,reads=0;const fixes=[],photos=[];
  const h=harness({Accuracy:{High:4},getForegroundPermissionsAsync:async()=>({status:'granted'}),getCurrentPositionAsync:()=>++reads===1?new Promise(done=>{finishPreview=done;}):Promise.resolve({timestamp:Date.now(),coords:{latitude:20,longitude:106,accuracy:5}})});
  const props={active:true,taskKey:'A',freshLocationOnCapture:true,onCoordsChange:v=>fixes.push(v),onCapture:(_,meta)=>photos.push(meta)};
  let ui=h.render(props);await new Promise(done=>setImmediate(done));
  ui.camera.props.ref.current={takePictureAsync:async()=>({uri:'file://photo'})};ui.camera.props.onCameraReady();ui=h.render(props);
  await ui.shutter.props.onPress();assert.equal(photos[0].coordinates.latitude,20);
  finishPreview({timestamp:Date.now(),coords:{latitude:10,longitude:106,accuracy:5}});await new Promise(done=>setImmediate(done));
  assert.equal(fixes.at(-1).latitude,20);h.dispose();
});

test('Crew shutter requests a new fix per photo and passes that fix directly with its timestamp', async () => {
  let reads=0;
  const h=harness({Accuracy:{High:4},getForegroundPermissionsAsync:async()=>({status:'granted'}),
    getCurrentPositionAsync:async()=>({timestamp:Date.now(),coords:{latitude:++reads,longitude:106,accuracy:5}})});
  const metadata=[];
  const props={active:true,taskKey:'A',freshLocationOnCapture:true,onCapture:(photo,meta)=>metadata.push(meta)};
  let ui=h.render(props);
  ui.camera.props.ref.current={takePictureAsync:async()=>({uri:'file://photo'})};
  ui.camera.props.onCameraReady();ui=h.render(props);
  await ui.shutter.props.onPress();await ui.shutter.props.onPress();
  assert.equal(metadata.length,2);
  assert.ok(metadata[1].coordinates.latitude>metadata[0].coordinates.latitude);
  assert.ok(Number.isFinite(Date.parse(metadata[0].capturedAt)));
  h.dispose();
});

test('Crew does not take a photo after losing focus while waiting for a GPS fix', async () => {
  let resolve,shots=0;
  const h=harness({Accuracy:{High:4},getForegroundPermissionsAsync:async()=>({status:'granted'}),
    getCurrentPositionAsync:()=>new Promise(done=>{resolve=done;})});
  let ui=h.render({active:true,taskKey:'A',freshLocationOnCapture:true});
  ui.camera.props.ref.current={takePictureAsync:async()=>{shots++;return {uri:'file://photo'};}};
  ui.camera.props.onCameraReady();ui=h.render({active:true,taskKey:'A',freshLocationOnCapture:true});
  const pending=ui.shutter.props.onPress();await new Promise(done=>setImmediate(done));
  h.render({active:false,taskKey:'A',freshLocationOnCapture:true});
  resolve({timestamp:Date.now(),coords:{latitude:10,longitude:106,accuracy:5}});
  await pending;assert.equal(shots,0);assert.equal(h.captures.length,0);h.dispose();
});

test('camera task A → B → A and focus changes remount preview and require fresh ready event', async () => {
  const h = harness();
  let ui = h.render({ active: true, taskKey: 'A', facing: 'back' });
  assert.match(ui.camera.props.key, /^A:back:/);
  assert.equal(ui.shutter.props.disabled, true);
  ui.camera.props.onCameraReady();
  ui = h.render({ active: true, taskKey: 'A', facing: 'back' });
  assert.equal(ui.shutter.props.disabled, false);
  const staleReady = ui.camera.props.onCameraReady;
  ui = h.render({ active: false, taskKey: 'A', facing: 'back' });
  assert.equal(ui.camera, undefined);
  assert.equal(ui.shutter.props.disabled, true);
  ui = h.render({ active: true, taskKey: 'B', facing: 'back' });
  staleReady();
  ui = h.render({ active: true, taskKey: 'B', facing: 'back' });
  assert.match(ui.camera.props.key, /^B:back:/);
  assert.equal(ui.shutter.props.disabled, true);
  ui.camera.props.onCameraReady();
  ui = h.render({ active: true, taskKey: 'B', facing: 'back' });
  assert.equal(ui.shutter.props.disabled, false);
  ui = h.render({ active: false, taskKey: 'B', facing: 'back' });
  assert.equal(ui.camera, undefined);
  ui = h.render({ active: true, taskKey: 'A', facing: 'back' });
  assert.equal(ui.shutter.props.disabled, true);
  h.dispose();
});

test('camera facing and mount failure disable shutter with native reason, independent of FIELD guard', () => {
  const h = harness();
  let ui = h.render({ active: true, taskKey: 'A', facing: 'back' });
  ui.camera.props.onCameraReady();
  ui = h.render({ active: true, taskKey: 'A', facing: 'front' });
  assert.equal(ui.shutter.props.disabled, true);
  ui.camera.props.onMountError();
  ui = h.render({ active: true, taskKey: 'A', facing: 'front' });
  assert.match(ui.shutter.props.accessibilityLabel, /Camera không khởi động/);
  ui.camera.props.onCameraReady();
  ui = h.render({ active: true, taskKey: 'A', facing: 'front', disabled: true, disabledReason: 'Nhiệm vụ chưa đủ quyền.' });
  assert.equal(ui.shutter.props.disabled, true);
  assert.equal(ui.shutter.props.accessibilityLabel, 'Nhiệm vụ chưa đủ quyền.');
  assert.ok(!ui.texts.some(text => text.includes('CHƯA CÓ PHÂN LOẠI')));
  h.dispose();
});

test('camera rapid capture accepts one shot and discards photo after screen loses focus', async () => {
  const h = harness();
  let resolve, shots = 0;
  let ui = h.render({ active: true, taskKey: 'A' });
  ui.camera.props.ref.current = { takePictureAsync: () => { shots++; return new Promise(done => { resolve = done; }); } };
  ui.camera.props.onCameraReady();
  ui = h.render({ active: true, taskKey: 'A' });
  ui.shutter.props.onPress();
  ui.shutter.props.onPress();
  assert.equal(shots, 1);
  h.render({ active: false, taskKey: 'A' });
  h.render({ active: true, taskKey: 'A' });
  resolve({ uri: 'file://photo' });
  await new Promise(done => setImmediate(done));
  assert.equal(h.captures.length, 0);
  h.dispose();
});

test('capture finishing after a camera switch cannot keep the next session locked', async () => {
  const h = harness(), shooting = [];
  const onShootingChange = value => shooting.push(value);
  let finishBack, finishFront, backShots = 0, frontShots = 0;
  let ui = h.render({ active: true, taskKey: 'A', facing: 'back', onShootingChange });
  ui.camera.props.ref.current = { takePictureAsync: () => { backShots++; return new Promise(done => { finishBack = done; }); } };
  ui.camera.props.onCameraReady();
  ui = h.render({ active: true, taskKey: 'A', facing: 'back', onShootingChange });
  ui.shutter.props.onPress();
  assert.equal(shooting.at(-1), true);
  ui = h.render({ active: true, taskKey: 'A', facing: 'front', onShootingChange });
  assert.equal(shooting.at(-1), false);
  ui.camera.props.ref.current = { takePictureAsync: () => { frontShots++; return new Promise(done => { finishFront = done; }); } };
  ui.camera.props.onCameraReady();
  ui = h.render({ active: true, taskKey: 'A', facing: 'front', onShootingChange });
  assert.equal(ui.shutter.props.disabled, false);
  ui.shutter.props.onPress();
  assert.equal(frontShots, 1);
  finishBack({ uri: 'file://stale-back' });
  await new Promise(done => setImmediate(done));
  ui = h.render({ active: true, taskKey: 'A', facing: 'front', onShootingChange });
  assert.equal(ui.shutter.props.disabled, true);
  assert.equal(shooting.at(-1), true);
  finishFront({ uri: 'file://front' });
  await new Promise(done => setImmediate(done));
  ui = h.render({ active: true, taskKey: 'A', facing: 'front', onShootingChange });
  assert.equal(ui.shutter.props.disabled, false);
  assert.equal(backShots, 1);
  assert.deepEqual(h.captures.map(photo => photo.uri), ['file://front']);
  h.dispose();
});

test('capture → switch camera → capture keeps both completed photos', async () => {
  const h = harness(), shooting = [];
  const onShootingChange = value => shooting.push(value);
  let ui = h.render({ active: true, taskKey: 'A', facing: 'back', onShootingChange });
  ui.camera.props.ref.current = { takePictureAsync: async () => ({ uri: 'file://back' }) };
  ui.camera.props.onCameraReady();
  ui = h.render({ active: true, taskKey: 'A', facing: 'back', onShootingChange });
  await ui.shutter.props.onPress();
  assert.equal(shooting.at(-1), false);
  ui = h.render({ active: true, taskKey: 'A', facing: 'front', onShootingChange });
  ui.camera.props.ref.current = { takePictureAsync: async () => ({ uri: 'file://front' }) };
  ui.camera.props.onCameraReady();
  ui = h.render({ active: true, taskKey: 'A', facing: 'front', onShootingChange });
  assert.equal(ui.shutter.props.disabled, false);
  await ui.shutter.props.onPress();
  assert.deepEqual(h.captures.map(photo => photo.uri), ['file://back', 'file://front']);
  h.dispose();
});

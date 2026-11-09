const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function harness() {
  const state = [], refs = [], effects = [], captures = [];
  let stateSlot = 0, refSlot = 0, effectSlot = 0, rendered;
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
    'react-native': { StyleSheet: { create: value => value, absoluteFill: {} } },
    'expo-camera': { CameraView: 'CameraView', useCameraPermissions: () => [{ granted: true }, () => {}] },
    'expo-location': { getForegroundPermissionsAsync: async () => ({ status: 'denied' }) },
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
    return { camera: all.find(node => node.type === 'CameraView'), shutter: all.find(node => node.props?.testID === 'capture-button'), texts: all.filter(node => node.type === 'Text').map(node => node.props.children.flat().join('')) };
  }
  return { render, captures, dispose: () => effects.forEach(effect => effect?.cleanup?.()) };
}

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

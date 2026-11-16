const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Hook harness only. Does not claim native glyph rendering or device acceptance.
function runtime(initial = [false, null], iconLoaded = false) {
  let fontResult = initial, nativeLoaded = iconLoaded, index = 0, tree;
  const slots = [], effects = [], timers = new Map();
  let timerId = 0, registered;
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(value) { const i = index++; if (!(i in slots)) slots[i] = value;
      return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
    useEffect(fn, deps) { const i = index++, old = slots[i];
      if (!old || deps.some((value, j) => !Object.is(value, old.deps[j]))) {
        old?.cleanup?.(); effects.push(() => { slots[i] = { deps, cleanup: fn() }; });
      } },
  };
  const modules = {
    react,
    'react-native': { View: 'View', Image: 'Image', Text: 'Text', Pressable: 'Pressable', ActivityIndicator: 'Spinner', StyleSheet: { create: x => x } },
    'expo-font': { useFonts: map => { registered = map; return fontResult; }, isLoaded: family => family === 'material' && nativeLoaded },
    '@expo/vector-icons': { MaterialIcons: { font: { material: 404 }, getFontFamily: () => 'material' } },
    '@expo-google-fonts/roboto': { Roboto_400Regular: 1, Roboto_500Medium: 2, Roboto_700Bold: 3 },
    '../design-tokens': { colors: { primary: '#C9A227', secondary: '#333' } },
  };
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync('src/components/AppFontGate.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, __DEV__: false,
    require: name => { if (name.endsWith('.png') || name.endsWith('.ttf')) return 5;
      if (!(name in modules)) throw Error('Unexpected dependency: ' + name); return modules[name]; },
    setTimeout: fn => { timers.set(++timerId, fn); return timerId; }, clearTimeout: id => timers.delete(id),
  });
  return {
    render() { index = 0; tree = module.exports.FontLoadAttempt({ children: 'SCREEN_WITH_ICONS', onRetry() {} });
      while (effects.length) effects.shift()(); return tree; },
    renderGate() { index = 0; return module.exports.AppFontGate({ children: 'screen' }); },
    update(result, loaded) { fontResult = result; nativeLoaded = loaded; },
    expire() { for (const fn of [...timers.values()]) fn(); },
    get registered() { return registered; }, get exports() { return module.exports; },
    dispose() { for (const slot of slots) slot?.cleanup?.(); },
  };
}

test('icon font uses the library registration alongside existing text fonts', () => {
  const r = runtime(); r.render();
  assert.equal(r.registered.material, 404);
  assert.equal(r.registered.Roboto, 1);
  assert.equal(r.registered['Roboto-Medium'], 2);
  assert.equal(r.registered['Roboto-Bold'], 3);
  assert.equal(r.registered.Sansation, 5); r.dispose();
});

test('screen content waits for fonts and native icon readiness, including a cold reload', () => {
  for (let reload = 0; reload < 2; reload++) {
    const r = runtime();
    assert.doesNotMatch(JSON.stringify(r.render()), /SCREEN_WITH_ICONS/);
    r.update([true, null], true);
    assert.equal(r.render(), 'SCREEN_WITH_ICONS'); r.dispose();
  }
});

test('an already loaded native font opens the screen without a loading flash', () => {
  const r = runtime([true, null], true);
  assert.equal(r.render(), 'SCREEN_WITH_ICONS'); r.dispose();
});

test('a failed font load stays blocked and offers an accessible retry without exposing error details', () => {
  const r = runtime([false, Error('private diagnostic URL')]);
  const text = JSON.stringify(r.render());
  assert.doesNotMatch(text, /SCREEN_WITH_ICONS|private diagnostic URL/);
  assert.match(text, /Thử lại/); r.dispose();
});

test('a fulfilled hook without native material registration cannot claim readiness', () => {
  const r = runtime([true, null], false);
  const text = JSON.stringify(r.render());
  assert.doesNotMatch(text, /SCREEN_WITH_ICONS/); assert.match(text, /Thử lại/); r.dispose();
});

test('timeout offers recovery without admitting the screen; a later verified load can recover', () => {
  const r = runtime(); r.render(); r.expire();
  const text = JSON.stringify(r.render());
  assert.match(text, /Thử lại/); assert.doesNotMatch(text, /SCREEN_WITH_ICONS/);
  r.update([true, null], true); assert.equal(r.render(), 'SCREEN_WITH_ICONS'); r.dispose();
});

test('retry recreates only the font attempt, not the navigator or session', () => {
  const r = runtime();
  // Outer gate owns the retry key; re-render the same hook harness independently.
  const first = r.renderGate();
  first.props.onRetry();
  const next = r.renderGate();
  assert.equal(first.type, r.exports.FontLoadAttempt);
  assert.equal(next.type, first.type); assert.notEqual(next.props.key, first.props.key); r.dispose();
});

test('root keeps Stack mounted and auth restoration while screenLayout gates its content', () => {
  const code = fs.readFileSync('app/_layout.tsx', 'utf8');
  assert.match(code, /screenLayout=\{fontScreenLayout\}/);
  assert.match(code, /<AppFontGate>\{children\}<\/AppFontGate>/);
  assert.match(code, /<AuthGuard>[\s\S]*<Stack/);
  assert.match(code, /useEffect\(\(\) => \{\s*void useAuthStore\.getState\(\)\.restoreRefreshToken\(\)/);
  assert.doesNotMatch(code, /fontTimeout|<Redirect/);
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { screen } = require('./helpers/roadfe-screen.cjs');

function setup(props = {}) {
  const calls = [], listeners = new Map(); let resolve;
  const preference = new Promise(r => { resolve = r; });
  const s = screen('src/components/crew/CrewHomeTaskPressable.tsx', {
    exportName: 'CrewHomeTaskPressable', props,
    modules: { 'react-native': { Pressable: 'Pressable', AccessibilityInfo: {
      isReduceMotionEnabled: () => preference,
      addEventListener: (name, fn) => { listeners.set(name, fn); return { remove: () => listeners.delete(name) }; },
    } } },
    moduleFactories: { 'react-native-reanimated': ({ react }) => ({
      __esModule: true, default: { View: 'AnimatedView' },
      useSharedValue: v => react.useRef({ value: v }).current,
      useAnimatedStyle: fn => fn(), ReduceMotion: { System: 'system' },
      cancelAnimation: value => calls.push({ cancel: value }),
      withTiming: (v, config) => { calls.push({ type: 'timing', v, config }); return v; },
      withSpring: (v, config) => { calls.push({ type: 'spring', v, config }); return v; },
    }) },
  });
  const button = () => s.nodes().find(n => n.type === 'Pressable');
  return { s, calls, listeners, resolve, button };
}

test('Home task compresses on touch and springs back without delaying navigation', async () => {
  let navigations = 0;
  const onPress = () => { navigations++; };
  const m = setup({ onPress, accessibilityLabel: 'Nhiệm vụ thật', android_ripple: { foreground: true } });
  m.s.render(); m.resolve(false); await m.s.flush();
  m.button().props.onPressIn({});
  assert.equal(m.calls.at(-1).v, 0.97);
  assert.equal(m.calls.at(-1).type, 'timing');
  m.button().props.onPressOut({});
  assert.equal(m.calls.at(-1).type, 'spring');
  assert.equal(m.calls.at(-1).v, 1);
  assert.equal(m.calls.at(-1).config.reduceMotion, 'system');
  assert.equal(m.button().props.onPress, onPress);
  m.button().props.onPress(); assert.equal(navigations, 1);
  assert.equal(m.button().props.accessibilityLabel, 'Nhiệm vụ thật');
  assert.equal(m.button().props.android_ripple.foreground, true);
  assert.equal(m.s.h.calls.length, 0);
  m.s.unmount(); assert.equal(m.listeners.size, 0);
});

test('Home task stays static until preference is known and handles live Reduce Motion before a late read', async () => {
  const m = setup(); m.s.render();
  m.button().props.onPressIn({});
  assert.equal(m.calls.filter(c => c.type).length, 0);
  m.listeners.get('reduceMotionChanged')(true);
  m.resolve(false); await m.s.flush();
  m.button().props.onPressIn({}); m.button().props.onPressOut({});
  assert.equal(m.calls.filter(c => c.type).length, 0);
  m.listeners.get('reduceMotionChanged')(false); await m.s.flush();
  m.button().props.onPressIn({});
  const value = m.calls.at(-1).v;
  assert.equal(value, 0.97);
  m.listeners.get('reduceMotionChanged')(true); await m.s.flush();
  assert.equal(m.calls.at(-1).cancel.value, 1);
  m.s.unmount();
});

test('Disabling a pressed Home task resets scale and prevents further press motion', async () => {
  const props = { disabled: false };
  const m = setup(props); m.s.render(); m.resolve(false); await m.s.flush();
  m.button().props.onPressIn({});
  props.disabled = true; m.s.render();
  assert.equal(m.calls.at(-1).cancel.value, 1);
  const count = m.calls.filter(c => c.type).length;
  m.button().props.onPressIn({}); m.button().props.onPressOut({});
  assert.equal(m.calls.filter(c => c.type).length, count);
  assert.equal(m.button().props.disabled, true);
  m.s.unmount();
});

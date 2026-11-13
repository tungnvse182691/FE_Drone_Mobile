const test = require('node:test');
const assert = require('node:assert/strict');
const { screen } = require('./helpers/roadfe-screen.cjs');

test('Operator navigation stays below resized viewport and preserves Stack during keyboard transitions', async () => {
  const listeners = new Map(); let removed = 0;
  const s = screen('app/(drone)/_layout.tsx', {
    moduleFactories: {'react-native': ({modules}) => ({...modules['react-native'], Keyboard: {
      isVisible: () => false,
      addListener: (name, fn) => { listeners.set(name, fn); return {remove() { removed++; }}; },
    }})},
    modules: {'expo-router': {Stack: 'Stack', usePathname: () => '/upload'}, '../../src/components/BottomNav': {BottomNav: 'BottomNav'}},
  });
  s.render();
  const root = s.nodes().find(n => n.type === 'View' && n.props.onLayout);
  assert.ok(root, 'layout must retain the unresized viewport');
  const layout = async (width, height) => { root.props.onLayout({nativeEvent: {layout: {width, height}}}); await s.flush(); };
  await layout(412, 868); await layout(412, 520);
  assert.equal(s.nodes().find(n => n.props.testID === 'operator-navigation-dock').props.style[1].height, 868);
  listeners.get('keyboardDidShow')(); await s.flush();
  assert.ok(!s.nodes().some(n => n.type === 'BottomNav'));
  assert.equal(s.nodes().filter(n => n.type === 'Stack').length, 1);
  listeners.get('keyboardDidHide')(); await s.flush();
  assert.ok(s.nodes().some(n => n.type === 'BottomNav'));
  await layout(868, 412);
  assert.equal(s.nodes().find(n => n.props.testID === 'operator-navigation-dock').props.style[1].height, 412);
  s.unmount(); assert.equal(removed, 2);
});

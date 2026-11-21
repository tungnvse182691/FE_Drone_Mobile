// JS layout contract only. Fabric transitions require the Android evidence in the worklog.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {screen} = require('./helpers/roadfe-screen.cjs');

function mount({scoped = true, os = 'android', insets = {top: 41.43, left: 3, right: 7, bottom: 24}} = {}) {
  const state = {insets};
  const s = screen('src/components/SafeAreaScreen.tsx', {
    exportName: 'SafeAreaScreen', props: {header: 'HEADER', children: 'BODY', scroll: true},
    moduleFactories: {
      react: ({react}) => ({...react, createContext: value => ({defaultValue: value, Provider: 'InsetScope'}), useContext: () => scoped}),
      'react-native': ({modules}) => ({...modules['react-native'], Platform: {OS: os}}),
    },
    modules: {'react-native-safe-area-context': {SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => state.insets}},
  });
  s.render();
  return {s, state, root: () => s.nodes()[0]};
}
const flat = style => Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

test('Crew Android header receives provider insets in its first layout, with no second native top inset', () => {
  const {s, root} = mount();
  assert.equal(root().type, 'View');
  assert.deepEqual({...flat(root().props.style)}, {flex: 1, backgroundColor: '#F8F9FA', paddingTop: 41.43, paddingLeft: 3, paddingRight: 7});
  assert.ok(!s.nodes().some(n => n.type === 'SafeAreaView'));
  assert.equal(root().props.children[0], 'HEADER');
  assert.equal(flat(root().props.style).paddingBottom, undefined, 'bottom inset remains owned by the dock');
  s.unmount();
});

test('Provider changes, including a modal provider with zero inset, are used without caching or fixed fallback', () => {
  const {s, state, root} = mount();
  for (const insets of [{top: 0, left: 0, right: 0, bottom: 0}, {top: 27, left: 12, right: 9, bottom: 32}]) {
    state.insets = insets; s.render();
    const style = flat(root().props.style);
    assert.equal(style.paddingTop, insets.top); assert.equal(style.paddingLeft, insets.left); assert.equal(style.paddingRight, insets.right);
    assert.equal(style.paddingBottom, undefined);
  }
  s.unmount();
});

test('Unscoped roles and Crew iOS retain the native SafeAreaView contract', () => {
  for (const options of [{scoped: false}, {os: 'ios'}, {os: 'web'}]) {
    const {s, root} = mount(options);
    assert.equal(root().type, 'SafeAreaView');
    assert.deepEqual([...root().props.edges], ['top', 'left', 'right']);
    assert.equal(flat(root().props.style).paddingTop, undefined); s.unmount();
  }
});

test('Only the Crew route layout opts in; existing standalone camera/navigation stay untouched', () => {
  const crew = fs.readFileSync('app/(crew)/_layout.tsx', 'utf8');
  assert.match(crew, /<ProviderInsetScreens>/);
  for (const role of ['drone', 'reporter']) assert.doesNotMatch(fs.readFileSync(`app/(${role})/_layout.tsx`, 'utf8'), /ProviderInsetScreens/);
  for (const route of ['viewfinder', 'navigation']) assert.doesNotMatch(fs.readFileSync(`app/(crew)/${route}.tsx`, 'utf8'), /ProviderInsetScreens/);
});

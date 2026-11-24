const { test } = require('node:test');
const assert = require('node:assert/strict');
const { screen } = require('./helpers/roadfe-screen.cjs');

const flatten = style => Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
function header(role, props = {}, router = {}) {
  const s = screen('src/components/AppHeader.tsx', {
    exportName: 'AppHeader', props: { subtitle: 'Nhiệm vụ khảo sát', ...props },
    modules: { 'expo-router': { useRouter: () => router } },
  });
  s.h.login(role, '11111111-1111-4111-8111-111111111111');
  s.h.changeAuth({ ...s.h.getAuth(), role });
  s.render();
  return s;
}

test('premium header sizing is isolated to Operator compact; Crew and Reporter keep their presentation', () => {
  for (const [role, variant, size, brandSize, subtitleSize] of [
    ['DRONE_OPERATOR', 'operatorCompact', 40, 18, 13],
    ['DRONE_OPERATOR', undefined, 36, 16, 12],
    ['REPAIR_CREW', 'operatorCompact', 32, 16, 12],
    ['REPORTER', 'operatorCompact', 36, 16, 12],
  ]) {
    const s = header(role, { variant });
    try {
      const logo = s.nodes().find(n => n.type === 'Image');
      assert.equal(flatten(logo.props.style).width, size);
      assert.equal(flatten(logo.props.style).height, size);
      const brand = s.nodes().find(n => n.type === 'Text' && n.props.children?.includes(role === 'REPAIR_CREW' ? 'BÊ TÔNG HOÀNG HẢI' : 'HOÀNG HẢI'));
      const subtitle = s.nodes().find(n => n.type === 'Text' && n.props.children?.includes('Nhiệm vụ khảo sát'));
      assert.equal(flatten(brand.props.style).fontFamily, 'Sansation');
      assert.equal(flatten(brand.props.style).fontSize, brandSize);
      assert.equal(flatten(subtitle.props.style).fontSize, subtitleSize);
      assert.notEqual(brand.props.allowFontScaling, false);
      assert.equal(subtitle.props.numberOfLines, undefined);
    } finally { s.unmount(); }
  }
});

test('Operator compact header preserves avatar navigation and Back precedence with 48dp controls', () => {
  for (const mode of ['custom', 'history', 'fallback']) {
    const calls = [];
    const s = header('DRONE_OPERATOR', {
      variant: 'operatorCompact', showBack: true, fallbackRoute: '/(drone)/requests',
      ...(mode === 'custom' ? { onBack: () => calls.push('custom') } : {}),
    }, { canGoBack: () => mode === 'history', back: () => calls.push('back'), replace: route => calls.push(route), push: route => calls.push(route) });
    try {
      for (const label of ['Quay lại', 'Trang cá nhân']) {
        const button = s.nodes().find(n => n.props.accessibilityLabel === label);
        const style = flatten(button.props.style({ pressed: false }));
        assert.equal(style.width, 48); assert.equal(style.height, 48);
        button.props.onPress();
      }
      assert.deepEqual(calls, [mode === 'custom' ? 'custom' : mode === 'history' ? 'back' : '/(drone)/requests', '/(drone)/profile']);
      assert.equal(s.nodes().some(n => n.props.accessibilityLabel === 'Thông báo'), false);
    } finally { s.unmount(); }
  }
});

const test = require('node:test');
const assert = require('node:assert/strict');
const { screen } = require('./helpers/roadfe-screen.cjs');

test('Crew header does not offer fabricated all-clear notifications and retains profile navigation', () => {
  const routes = [];
  const s = screen('src/components/AppHeader.tsx', { exportName: 'AppHeader', props: { subtitle: 'Đội sửa chữa' },
    modules: { 'expo-router': { router: { push: route => routes.push(route) } } } });
  s.h.login('REPAIR_CREW', '11111111-1111-4111-8111-111111111111');
  s.h.changeAuth({ ...s.h.getAuth(), role: 'REPAIR_CREW' });
  s.render();
  assert.equal(s.nodes().some(n => n.props.accessibilityLabel === 'Thông báo'), false);
  s.nodes().find(n => n.props.accessibilityLabel === 'Trang cá nhân').props.onPress();
  assert.deepEqual(routes, ['/(crew)/profile']);
  s.unmount();
});

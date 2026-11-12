// Structural regression for the account heading that overflowed on OPPO at
// 360dp/font scale 1.15. Native text measurement is verified on the device.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { screen } = require('./helpers/roadfe-screen.cjs');

test('Crew Home keeps a single account summary and task capture navigation', () => {
  const s = screen('app/(crew)/home.tsx', { modules: {
    './tasks': { useCrewInbox: () => ({ enabled: false, tasks: [], query: {} }), TASK_MODE_CHIP: {} },
    '../../src/api/crewApi': { crewTaskIsComplete: () => false },
    '../../src/components/AppHeader': { AppHeader: 'AppHeader' },
    '../../src/components/Card': { Card: 'Card' },
  } });
  s.render();
  const text = s.nodes().filter(n => n.type === 'Text').map(n => n.props.children.flat(Infinity).join('')).join(' ');
  assert.doesNotMatch(text, /TÀI KHOẢN HIỆN TRƯỜNG/);
  assert.equal((text.match(/Chưa có tên tài khoản/g) || []).length, 1);
  assert.ok(s.nodes().some(n => n.props.accessibilityLabel === 'Chọn nhiệm vụ để chụp ảnh'));
  s.unmount();
});

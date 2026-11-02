// Structural regression for the account heading that overflowed on OPPO at
// 360dp/font scale 1.15. Native text measurement is verified on the device.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { screen } = require('./helpers/roadfe-screen.cjs');

test('Crew account heading can wrap without pushing its role badge outside the card', () => {
  const s = screen('app/(crew)/home.tsx', { modules: {
    './tasks': { useCrewInbox: () => ({ enabled: false, tasks: [], query: {} }), TASK_MODE_CHIP: {} },
    '../../src/api/crewApi': { crewTaskIsComplete: () => false },
    '../../src/components/AppHeader': { AppHeader: 'AppHeader' },
    '../../src/components/Card': { Card: 'Card' },
  } });
  s.render();
  const title = s.nodes().find(n => n.type === 'Text' && n.props.children.includes('TÀI KHOẢN HIỆN TRƯỜNG'));
  assert.ok(title);
  const group = s.nodes().find(n => n.props?.children?.includes(title));
  const row = s.nodes().find(n => n.props?.children?.includes(group));
  assert.equal(row.props.style.flexWrap, 'wrap', 'the title and badge must wrap on narrow displays');
  assert.equal(group.props.style.flexShrink, 1, 'the title group must fit the available card width');
  assert.equal(title.props.style.at(-1).flexShrink, 1, 'long title must wrap within the group');
  s.unmount();
});

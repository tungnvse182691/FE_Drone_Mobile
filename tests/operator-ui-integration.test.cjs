const { test } = require('node:test');
const assert = require('node:assert/strict');
const { screen } = require('./helpers/roadfe-screen.cjs');

test('integrated row marks only accepted/in-progress tasks and preserves the navigation callback', () => {
  for (const status of ['Accepted', 'ACCEPTED', 'InProgress', 'IN_PROGRESS', 'Submitted', 'Completed', 'NEW_ASSIGNED', 'SUPPLEMENT_REQUIRED', 'UNKNOWN']) {
    let presses = 0;
    const s = screen('src/components/drone/OperatorTaskRow.tsx', {
      exportName: 'OperatorTaskRow',
      props: { task: { id: 'task-1', status, scope: [] }, onPress: () => presses++ },
      modules: { '../Card': { Card: 'Card' } },
    });
    s.render();
    const markers = s.nodes().filter(n => n.props.testID === 'operator-current-task');
    assert.equal(markers.length, ['Accepted', 'ACCEPTED', 'InProgress', 'IN_PROGRESS'].includes(status) ? 1 : 0, status);
    if (markers.length) assert.deepEqual(markers[0].props.children, ['NHIỆM VỤ HIỆN TẠI']);
    s.nodes().find(n => n.type === 'Pressable').props.onPress();
    assert.equal(presses, 1, status);
    s.unmount();
  }
});

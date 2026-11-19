const { test } = require('node:test');
const assert = require('node:assert/strict');
const { drone, task } = require('./package45-drone.test.cjs');

test('Log tabs isolate visible sections without new reads or losing lookup input', async () => {
  let reads = 0;
  const s = drone('log', { listOperatorSurveyTasksReal: async () => {
    reads++; return { items: [task], nextCursor: 'next-page' };
  } }, {
    expose: ['DroneLogContent'], exportName: 'DroneLogContent', props: { scope: 'test' },
    modules: { '../../src/components/drone/DroneTaskCommandPanel': { DroneTaskRecoveryList: 'DroneTaskRecoveryList' } },
  });
  s.render(); await s.flush();
  const header = s.nodes().find(n => n.type === 'AppHeader');
  assert.equal(header.props.showBack, true);
  assert.equal(header.props.fallbackRoute, '/(drone)/requests');
  const panel = id => s.nodes().find(n => n.props.testID === `log-panel-${id}`);
  const selected = () => s.nodes().filter(n => n.props.accessibilityRole === 'tab' && n.props.accessibilityState.selected);
  const switchTo = async id => { s.tap(`log-tab-${id}`); await s.flush(); };
  assert.equal(selected().length, 1);
  assert.equal(selected()[0].props.testID, 'log-tab-commands');
  assert.equal(panel('commands').props.accessibilityElementsHidden, false);
  assert.equal(s.nodes().filter(n => n.props.accessibilityRole === 'tab').length, 2);
  assert.ok(!s.nodes().some(n => n.props.testID === 'log-tab-tasks'));
  assert.equal(panel('lookup').props.importantForAccessibility, 'no-hide-descendants');
  await switchTo('lookup');
  s.press('Tra cứu nâng cao bằng mã máy chủ'); await s.flush();
  s.nodes().find(n => n.props.accessibilityLabel === 'Mã nhiệm vụ máy chủ').props.onChangeText(task.id);
  await s.flush();
  await switchTo('commands');
  assert.equal(panel('lookup').props.accessibilityElementsHidden, true);
  assert.ok(s.nodes().some(n => n.type === 'DroneTaskRecoveryList'));
  assert.ok(s.nodes().some(n => n.type === 'DroneDatasetReadbackPanel'));
  await switchTo('commands'); await switchTo('lookup');
  assert.equal(s.nodes().find(n => n.props.accessibilityLabel === 'Mã nhiệm vụ máy chủ').props.value, task.id);
  assert.equal(reads, 0, 'Log must not fetch the survey list already available in Requests');
  assert.equal(selected().length, 1);
  s.unmount();
});

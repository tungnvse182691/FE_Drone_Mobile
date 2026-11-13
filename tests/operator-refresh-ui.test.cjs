const { test } = require('node:test');
const assert = require('node:assert/strict');
const { drone, task } = require('./package45-drone.test.cjs');
const { deferred } = require('./helpers/roadfe-screen.cjs');

test('Operator list exposes busy refresh while retaining loaded tasks', async () => {
  const next = deferred();
  let reads = 0;
  const s = drone('requests', { listOperatorSurveyTasksReal: () => ++reads === 1
    ? Promise.resolve({ items: [task], nextCursor: null }) : next.promise });
  s.render(); await s.flush();
  const refresh = () => s.nodes().find(n => n.props.accessibilityLabel === 'Làm mới nhiệm vụ');
  assert.equal(refresh().props.disabled, false);
  const pending = refresh().props.onPress();
  s.render();
  assert.equal(refresh().props.disabled, true);
  assert.equal(refresh().props.accessibilityState.busy, true);
  assert.ok(s.nodes().some(n => n.type === 'OperatorTaskRow'));
  next.resolve({ items: [task], nextCursor: null });
  await pending; await s.flush();
  assert.equal(refresh().props.disabled, false);
  s.unmount();
});

test('Operator initial list error has one retry surface instead of duplicate alerts', async () => {
  const s = drone('requests', { listOperatorSurveyTasksReal: async () => { throw Error('offline'); } });
  s.render(); await s.flush();
  assert.equal(s.nodes().filter(n => n.type === 'EmptyState' && n.props.actionLabel === 'Thử lại').length, 1);
  assert.equal(s.nodes().filter(n => n.props.accessibilityRole === 'alert').length, 0);
  s.unmount();
});

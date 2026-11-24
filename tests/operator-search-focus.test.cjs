const { test } = require('node:test');
const assert = require('node:assert/strict');
const { drone, task } = require('./package45-drone.test.cjs');
const { deferred } = require('./helpers/roadfe-screen.cjs');

// This executes the real screen and paging hook. It checks input presence and
// its reconciliation path, not a native keyboard or iOS focus provider.
const searchLabel = 'Tìm tên dự án hoặc ID nhiệm vụ';
function searchNode(s) {
  return s.nodes().find(n => n.type === 'TextInput' && n.props.accessibilityLabel === searchLabel);
}
function inputPath(s) {
  function visit(node, path) {
    if (!node || typeof node !== 'object') return null;
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        const found = visit(node[i], [...path, i]);
        if (found) return found;
      }
      return null;
    }
    if (node.type === 'TextInput' && node.props.accessibilityLabel === searchLabel) return path;
    return visit(node.props?.children, [...path, node.type]);
  }
  return visit(s.nodes()[0], []);
}

test('Operator search input survives debounce, pending results, response, and clear', async () => {
  const calls = [], pending = [];
  const s = drone('requests', { listOperatorSurveyTasksReal: (_cursor, _limit, query) => {
    calls.push(query.search);
    if (calls.length === 1) return Promise.resolve({ items: [task], nextCursor: 'page2' });
    const d = deferred(); pending.push(d); return d.promise;
  } });
  try {
    s.render(); await s.flush();
    const path = inputPath(s);
    assert.ok(path);
    for (const term of ['c', 'c48', '']) {
      searchNode(s).props.onChangeText(term);
      s.render();
      assert.equal(searchNode(s)?.props.value, term);
      await new Promise(resolve => setTimeout(resolve, 380));
      // Observe the query-change commit BEFORE the effect's state update:
      // this was the one-render hole that unmounted the native TextInput.
      s.render();
      assert.deepEqual(inputPath(s), path, 'search input must stay mounted when query context changes');
      assert.equal(searchNode(s)?.props.value, term);
      assert.equal(s.nodes().filter(n => n.type === 'OperatorTaskRow').length, 0);
      await s.flush();
      assert.deepEqual(inputPath(s), path);
      pending.at(-1).resolve({ items: term ? [] : [task], nextCursor: null });
      await s.flush();
      assert.deepEqual(inputPath(s), path);
      assert.equal(searchNode(s)?.props.value, term);
    }
    assert.deepEqual(calls, [undefined, 'c', 'c48', undefined]);
  } finally { s.unmount(); }
});

test('Operator search retains its input through filter changes and failed reads', async () => {
  const pending = deferred(); let reads = 0;
  const s = drone('requests', { listOperatorSurveyTasksReal: () => ++reads === 1
    ? Promise.resolve({ items: [task], nextCursor: null }) : pending.promise });
  try {
    s.render(); await s.flush();
    const path = inputPath(s);
    s.nodes().find(n => n.props.accessibilityLabel === 'Lọc trạng thái: Tất cả trạng thái').props.onPress();
    s.render();
    s.nodes().find(n => n.props.accessibilityRole === 'radio' && n.props.accessibilityLabel === 'Cần bổ sung').props.onPress();
    s.render();
    assert.deepEqual(inputPath(s), path);
    assert.equal(s.nodes().filter(n => n.type === 'OperatorTaskRow').length, 0);
    await s.flush();
    pending.reject(Error('offline')); await s.flush();
    assert.deepEqual(inputPath(s), path);
    assert.ok(s.nodes().some(n => n.type === 'EmptyState' && n.props.actionLabel === 'Thử lại'));
  } finally { s.unmount(); }
});

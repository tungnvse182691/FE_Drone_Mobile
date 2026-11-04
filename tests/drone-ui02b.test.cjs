const { test } = require('node:test');
const assert = require('node:assert/strict');
const { drone, task, id } = require('./package45-drone.test.cjs');
const text = s => JSON.stringify(s.nodes().filter(n => n.type === 'Text'));
const fixture = { ...task, status: 'SUBMITTED', version: 'AAAAAAAAAAE=', scope: [{ routeVersionId: id(4), segmentSetId: id(5), segmentIds: [id(6)], targetBand: 'SURFACE' }] };

test('UI05 Home supersedes 02B duplicate shortcuts with compact summary and survey navigation', async () => {
  const routes = [];
  const s = drone('home', { listOperatorSurveyTasksReal: async () => ({ items: [fixture], nextCursor: null }) }, {
    moduleFactories: { 'expo-router': ({ modules }) => ({ ...modules['expo-router'], router: { push: r => routes.push(r) } }) },
  });
  s.render(); await s.flush();
  assert.doesNotMatch(text(s), /Chưa xác nhận an toàn|AAAAAAAAAAE=|Đồng bộ/);
  const button = s.nodes().find(n => n.props.accessibilityLabel === 'Xem tất cả nhiệm vụ khảo sát');
  assert.ok(button.props.style.minHeight >= 48 && button.props.style.minWidth >= 48);
  button.props.onPress(); assert.equal(routes.at(-1), '/(drone)/requests');
  assert.equal(s.nodes().filter(n => n.type === 'OperatorTaskRow').length, 1); s.unmount();
});

test('02B Detail keeps technical IDs collapsed, toggles them and preserves Work Package and recovery', async () => {
  const routes = [];
  const s = drone('request-detail', {
    getOperatorSurveyTaskDetailReal: async () => ({ data: fixture, etag: '"AAAAAAAAAAE="' }),
    getOperatorWorkPackageReal: async () => ({ data: { task: fixture, geometryRefs: [] } }),
  }, { params: { taskId: fixture.id }, moduleFactories: { 'expo-router': ({ modules }) => ({ ...modules['expo-router'], router: { push: r => routes.push(r), back: () => routes.push('back'), canGoBack: () => true } }) } });
  s.render(); await s.flush();
  assert.doesNotMatch(text(s), /AAAAAAAAAAE=/);
  const toggle = () => s.nodes().find(n => n.props.accessibilityLabel === 'Thông tin kỹ thuật');
  assert.ok(toggle()); assert.equal(toggle().props.accessibilityState.expanded, false);
  toggle().props.onPress(); await s.flush(); assert.match(text(s), /AAAAAAAAAAE=/);
  toggle().props.onPress(); await s.flush(); assert.doesNotMatch(text(s), /AAAAAAAAAAE=/);
  const headerNodes = n => !n ? [] : Array.isArray(n) ? n.flatMap(headerNodes) : typeof n === 'object' ? [n, ...headerNodes(n.props?.children)] : [];
  const back = headerNodes(s.nodes().find(n => n.type === 'SafeAreaScreen').props.header).find(n => n.props.accessibilityLabel === 'Quay lại');
  assert.ok(back.props.style.width >= 48 && back.props.style.height >= 48);
  back.props.onPress(); assert.equal(routes.at(-1), 'back');
  s.press('Xem gói công việc (chỉ đọc)'); assert.match(routes.at(-1), /work-package/);
  assert.ok(s.nodes().some(n => n.type === 'DroneTaskCommandPanel'));
  const recoveryToggle = () => s.nodes().find(n => n.props.accessibilityLabel === 'Lệnh và đối soát');
  assert.equal(recoveryToggle().props.accessibilityState.expanded, false);
  recoveryToggle().props.onPress(); await s.flush();
  assert.equal(recoveryToggle().props.accessibilityState.expanded, true);
  assert.ok(s.nodes().some(n => n.type === 'DroneTaskCommandPanel'), 'expansion retains mounted journal recovery');
  assert.ok(!s.nodes().some(n => n.props.accessibilityLabel === 'Từ chối nhiệm vụ')); s.unmount();
});

test('02B Log separates task, local commands and server reads with advanced lookup initially hidden', async () => {
  const s = drone('log', { listOperatorSurveyTasksReal: async () => ({ items: [fixture], nextCursor: null }) }, {
    expose: ['DroneLogContent'], exportName: 'DroneLogContent', props: { scope: 'test' },
    modules: { '../../src/components/drone/DroneTaskCommandPanel': { DroneTaskRecoveryList: 'DroneTaskRecoveryList' } },
  });
  s.render(); await s.flush();
  for (const heading of ['Nhiệm vụ được giao', 'Lệnh trên thiết bị', 'Kết quả từ máy chủ']) assert.ok(text(s).includes(heading));
  assert.equal(s.nodes().filter(n => n.type === 'TextInput').length, 0);
  s.press('Tra cứu nâng cao bằng mã máy chủ'); await s.flush();
  assert.equal(s.nodes().filter(n => n.type === 'TextInput').length, 2);
  assert.ok(s.nodes().some(n => n.type === 'DroneTaskRecoveryList'));
  s.press('Ẩn tra cứu nâng cao'); await s.flush(); assert.equal(s.nodes().filter(n => n.type === 'TextInput').length, 0);
  s.unmount();
});

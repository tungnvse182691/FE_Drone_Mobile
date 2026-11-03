const { test } = require('node:test');
const assert = require('node:assert/strict');
const { drone, id, task } = require('./package45-drone.test.cjs');
const { screen } = require('./helpers/roadfe-screen.cjs');
const text = s => JSON.stringify(s.nodes().filter(n => n.type === 'Text' || n.type === 'Chip' || n.type === 'EmptyState'));
const fixture = status => ({ ...task, status, version: 'AAAAAAAAAAE=', scope: [{ routeVersionId: id(4), segmentSetId: id(5), segmentIds: [id(6)], targetBand: 'SURFACE' }] });
const apiFor = t => ({ getOperatorSurveyTaskDetailReal: async () => ({ data: t, etag: `"${t.version}"` }), getOperatorWorkPackageReal: async () => ({ data: { task: t, geometryRefs: [] } }) });
const routeSpy = routes => ({ 'expo-router': ({ modules }) => ({ ...modules['expo-router'], router: { push: route => routes.push(route) } }) });

test('UI02A mounted filters distinguish submitted, supplement and completion across loaded pages', async () => {
  const states = ['NEW_ASSIGNED', 'Reassigned', 'ACCEPTED', 'InProgress', 'SUBMITTED', 'Submitted', 'SUPPLEMENT_REQUIRED', 'SupplementRequired', 'COMPLETED', 'UnknownFuture'];
  const items = states.map((status, i) => ({ ...fixture(status), id: id(20 + i) }));
  const s = drone('requests', { listOperatorSurveyTasksReal: async cursor => cursor ? { items: items.slice(5), nextCursor: null } : { items: items.slice(0, 5), nextCursor: 'next' } });
  s.render(); await s.flush();
  const tap = async (label, expected) => {
    const filter = s.nodes().find(n => n.type === 'Pressable' && n.props.accessibilityLabel === label);
    assert.ok(filter, label); filter.props.onPress(); await s.flush();
    assert.equal(s.nodes().find(n => n.type === 'Pressable' && n.props.accessibilityLabel === label).props.accessibilityState.selected, true);
    const cards = s.nodes().filter(n => n.type === 'Card'); assert.equal(cards.length, expected.length);
    for (const item of expected) assert.match(text(s), new RegExp(item.id.slice(0, 8)));
  };
  await tap('Đã nộp (1)', [items[4]]);
  s.press('Tải thêm nhiệm vụ'); await s.flush();
  for (const [label, indexes] of [['Chờ nhận (2)', [0,1]], ['Đang thực hiện (2)',[2,3]], ['Đã nộp (2)',[4,5]], ['Cần bổ sung (2)',[6,7]], ['Hoàn tất (1)',[8]], ['Trạng thái khác (1)',[9]]]) await tap(label, indexes.map(i => items[i]));
  assert.ok(s.nodes().some(n => n.type === 'ScrollView' && n.props.horizontal));
  assert.match(text(s), /trang đã tải/); s.unmount();
});

for (const status of ['SUBMITTED', 'SUPPLEMENT_REQUIRED', 'COMPLETED', 'ACCEPTED', 'UNKNOWN']) test(`UI02A Detail ${status} has read-only path without decline invitation`, async () => {
  const t = fixture(status), routes = [];
  const s = drone('request-detail', apiFor(t), { params: { taskId: t.id }, moduleFactories: routeSpy(routes) });
  s.render(); await s.flush();
  assert.ok(!s.nodes().some(n => n.props.accessibilityLabel === 'Từ chối nhiệm vụ'));
  s.press('Xem gói công việc (chỉ đọc)'); await s.flush();
  assert.match(routes.at(-1), /work-package/); assert.ok(!routes.some(r => /request-decline/.test(r)));
  assert.ok(s.nodes().some(n => n.type === 'DroneTaskCommandPanel'), 'existing journal recovery remains reachable');
  s.unmount();
});

for (const status of ['NEW_ASSIGNED', 'REASSIGNED']) test(`UI02A Detail ${status} can navigate to decline but stale session cannot`, async () => {
  const t = fixture(status), routes = [];
  const s = drone('request-detail', apiFor(t), { params: { taskId: t.id }, moduleFactories: routeSpy(routes) });
  s.render(); await s.flush(); const cta = s.nodes().find(n => n.props.accessibilityLabel === 'Từ chối nhiệm vụ');
  assert.ok(cta); cta.props.onPress(); assert.match(routes.at(-1), /request-decline/);
  s.h.login('DRONE_OPERATOR', id(7)); cta.props.onPress(); assert.equal(routes.length, 1); s.unmount();
});

test('UI02A Detail hides decline if current source has wrong actor or mismatched ETag', async () => {
  for (const wrongActor of [false, true]) {
    const t = { ...fixture('NEW_ASSIGNED'), ...(wrongActor ? { operatorId: id(7) } : {}) };
    const api = apiFor(t); if (!wrongActor) api.getOperatorSurveyTaskDetailReal = async () => ({ data: t, etag: '"other"' });
    const s = drone('request-detail', api, { params: { taskId: t.id } }); s.render(); await s.flush();
    assert.ok(!s.nodes().some(n => n.props.accessibilityLabel === 'Từ chối nhiệm vụ')); s.unmount();
  }
});

test('UI02A direct Decline route for Submitted explains blocked preparation while retaining independent journal panel', async () => {
  const t = fixture('SUBMITTED'); const s = drone('request-decline', apiFor(t), { params: { taskId: t.id } });
  s.render(); await s.flush(); assert.match(text(s), /không thể chuẩn bị yêu cầu từ chối/);
  assert.ok(s.nodes().some(n => n.type === 'DroneTaskCommandPanel' && n.props.operation === 'decline'));
  s.unmount();
});

test('UI02A independent decline panel blocks Submitted even if its disabled handler is called', async () => {
  let prepared = 0;
  const s = screen('src/components/drone/DroneTaskCommandPanel.tsx', {
    exportName: 'DroneTaskCommandPanel', props: { taskId: id(2), operation: 'decline' },
    modules: {
      '../../api/droneTaskJournal': { openDroneTaskJournal: async () => ({ close() {}, read: async () => null,
        readCurrent: async () => fixture('SUBMITTED'), prepare: async () => { prepared++; } }) },
      '../../hooks/useOperatorReadScope': { useOperatorReadScope: () => ({ key: 'scope', capture: () => () => true }) },
      '../Button': { Button: 'Button' }, '../Card': { Card: 'Card' },
    },
  });
  s.render(); await s.flush();
  s.nodes().find(n => n.type === 'TextInput').props.onChangeText('Lý do QA'); await s.flush();
  const button = s.nodes().find(n => n.type === 'Button' && n.props.title === 'Lưu yêu cầu từ chối để xác nhận');
  assert.equal(button.props.disabled, true); await button.props.onPress(); await s.flush();
  assert.equal(prepared, 0); s.unmount();
});

test('UI02A bounded band labels never mutate wire values and unknown has neutral label', async () => {
  const s = drone('home'); const view = s.h.load('src/api/operator-task-view.ts');
  for (const [value, label] of [['SURFACE','Mặt đường'],['LEFT_EDGE','Mép trái'],['RIGHT_EDGE','Mép phải'],['FUTURE','Chưa xác định'],['toString','Chưa xác định'],['__proto__','Chưa xác định']]) {
    const t = fixture('SUBMITTED'); t.scope[0].targetBand = value;
    assert.equal(view.operatorTaskTargetBand(t), label); assert.equal(t.scope[0].targetBand, value);
  } s.unmount();
});

test('UI02A Home uses neutral task heading and no Base64 version on card', async () => {
  const t = fixture('SUBMITTED'); const s = drone('home', { listOperatorSurveyTasksReal: async () => ({ items: [t], nextCursor: null }) });
  s.render(); await s.flush(); assert.match(text(s), /Nhiệm vụ khảo sát/); assert.match(text(s), /Mặt đường/);
  assert.ok(!s.nodes().some(n => n.type === 'Chip' && n.props.variant === 'approved'), 'Submitted is not completed');
  assert.doesNotMatch(text(s), /Việc cần làm|AAAAAAAAAAE=/); s.unmount();
});

test('UI02A Work Package promises only current survey video and telemetry; Profile labels local queue', async () => {
  const t = fixture('SUBMITTED'); const s = drone('work-package', apiFor(t), { params: { taskId: t.id } });
  s.render(); await s.flush(); assert.doesNotMatch(text(s), /DSM|OpenDroneMap|orthomosaic|SfM/);
  assert.match(text(s), /video|Video/); assert.match(text(s), /SRT/); assert.match(text(s), /Mặt đường/); s.unmount();
  const p = drone('profile'); p.render(); await p.flush(); assert.match(text(p), /Hàng đợi trên thiết bị/); assert.doesNotMatch(text(p), /Cài đặt đồng bộ ngoại tuyến/); p.unmount();
});

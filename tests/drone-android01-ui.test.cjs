const { test } = require('node:test');
const assert = require('node:assert/strict');
const { drone, id } = require('./package45-drone.test.cjs');
const allText = s => JSON.stringify(s.nodes().filter(n => n.type === 'Text'));

test('DRONE-ANDROID-01 Home names the task-list shortcut honestly and keeps its destination', async () => {
  const routes = [];
  const s = drone('home', { listOperatorSurveyTasksReal: async () => ({ items: [], nextCursor: null }) }, {
    moduleFactories: { 'expo-router': ({ modules }) => ({ ...modules['expo-router'], router: { push: route => routes.push(route) } }) },
  });
  s.render(); await s.flush();
  const shortcut = s.nodes().find(n => n.type === 'AnimatedPressable' && JSON.stringify(n.props.children).includes('Nhiệm vụ'));
  assert.ok(shortcut, 'task-list shortcut must not promise SD ingestion');
  assert.doesNotMatch(allText(s), /Nạp thẻ SD/);
  // UI03 omits unavailable telemetry instead of repeating empty placeholders.
  assert.doesNotMatch(allText(s), /Thời tiết:|Thiết bị:|An toàn bay|Sẵn sàng bay/);
  assert.match(allText(s), /nhiệm vụ trong danh sách đã tải/);
  shortcut.props.onPress(); assert.equal(routes.at(-1), '/(drone)/requests');
  s.unmount();
});

test('DRONE-ANDROID-01 advanced task lookup displays Vietnamese status without changing GET', async () => {
  const props = { scope: '' }; let calls = 0, sessionIdentity;
  const s = drone('log', {
    listOperatorSurveyTasksReal: async () => ({ items: [], nextCursor: null }),
    getOperatorSurveyTaskDetailReal: async taskId => { calls++; return { data: { id: taskId, operatorId: id(1), projectId: id(3), version: 'v1', status: 'ACCEPTED' } }; },
  }, { expose: 'DroneLogContent', exportName: 'DroneLogContent', props,
    modules: {
      '../../src/api/authApi': { passwordSessionIdentity: token => sessionIdentity(token) },
      '../../src/api/client': { apiClient: { defaults: { baseURL: null } } },
      '../../src/components/drone/DroneTaskCommandPanel': { DroneTaskRecoveryList: 'DroneTaskRecoveryList' },
    } });
  sessionIdentity = s.h.load('src/api/authApi.ts').passwordSessionIdentity;
  props.scope = JSON.stringify([null, s.h.load('src/api/authApi.ts').passwordSessionIdentity(s.h.getAuth().token)]);
  s.render(); await s.flush();
  s.press('Tra cứu nâng cao bằng mã máy chủ'); await s.flush();
  s.nodes().find(n => n.type === 'TextInput' && n.props.accessibilityLabel === 'Mã nhiệm vụ máy chủ').props.onChangeText(id(2));
  await s.flush(); s.press('Đọc trạng thái nhiệm vụ'); await s.flush();
  assert.equal(calls, 1); assert.match(allText(s), /Đã nhận/); assert.doesNotMatch(allText(s), /ACCEPTED|Nhật ký chuyến bay/);
  s.unmount();
});

test('DRONE-ANDROID-01 Sync describes a local queue and gives its summary separate vertical space', async () => {
  const identity = { actor: id(1), environment: 'fixture', session: 'fixture', role: 'DRONE_OPERATOR' };
  const s = drone('sync', {}, { expose: 'DroneSyncContent', exportName: 'DroneSyncContent', props: { identity }, modules: {
    'expo-sqlite': {},
    '../../src/components/drone/DroneTaskCommandPanel': { DroneTaskRecoveryList: 'DroneTaskRecoveryList' },
    '../../src/offline/database': { openDatabase: () => ({}), initDatabase: async () => {} },
    '../../src/offline/upload-queue': { currentQueueIdentity: () => identity, sameQueueIdentity: () => true, createQueueReader: () => ({ cancel() {}, read: async () => [] }), queueChecksumLabel: () => '' },
  } });
  s.render(); await s.flush();
  assert.equal(s.nodes().find(n => n.type === 'SafeAreaScreen').props.header.props.subtitle, 'Dữ liệu trên thiết bị');
  assert.doesNotMatch(allText(s), /ĐỒNG BỘ NỀN|DANH SÁCH TỆP CHỜ TẢI|Không có tệp nào/);
  const summary = s.nodes().find(n => n.type === 'Text' && JSON.stringify(n.props.children).includes('Không có mục trong phân vùng này'));
  const row = s.nodes().find(n => n.type === 'View' && n.props.children?.some?.(child => child?.props?.children?.includes?.(summary)));
  assert.ok(row); assert.equal(row.props.style.flexDirection, 'column');
  await s.press('Đọc lại hàng đợi'); await s.flush();
  assert.match(allText(s), /không gửi hoặc xác minh biên nhận/);
  s.unmount();
});

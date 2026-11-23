const test = require('node:test');
const assert = require('node:assert/strict');
const { screen } = require('./helpers/roadfe-screen.cjs');

const identity = { projectId: 'project-a' };
const request = { id: 'request-a', kind: 'CrewSupplement', sourceKind: 'RepairReview', requestedAt: '2026-11-23T10:00:00Z', waitingSeconds: 60, completedAt: null, acknowledgmentId: null, acknowledgedAt: null };
function mount(component, overrides = {}) {
  const calls = { projects: 0, list: 0, ack: 0 };
  const modules = {
    '../../src/components/AppHeader': { AppHeader: 'AppHeader' },
    '../../src/components/Card': { Card: 'Card' },
    '../../src/components/Chip': { Chip: 'Chip' },
    '../../src/components/EmptyState': { EmptyState: 'EmptyState' },
    '../../src/components/Toast': { Toast: 'Toast' },
    '../../src/hooks/useRepairBootstrap': { repairCommandErrorMessage: e => e.message },
    '../../src/api/crewReceivingDraft': { currentReceivingIdentity: () => identity, sameReceivingIdentity: () => true },
    '../../src/api/crewReceivingWorkflow': {
      discoverReceivingProjects: async () => { calls.projects++; return { items: [{ projectId: identity.projectId, projectCode: 'TEST', name: 'Test project' }], nextCursor: null }; },
      listReceiving: async () => { calls.list++; return { items: [request], continuation: 'next-page' }; },
      readReceiving: async () => request,
      acknowledgeReceiving: async () => { calls.ack++; return { ...request, acknowledgmentId: 'ack', acknowledgedAt: '2026-11-23T10:01:00Z' }; },
      ...overrides,
    },
  };
  const ui = screen('app/(crew)/receiving.tsx', { expose: component, exportName: component, props: { identity }, modules });
  ui.render();
  return { ui, calls };
}
const text = ui => JSON.stringify(ui.nodes().filter(n => n.type === 'Text').map(n => n.props.children));

test('Project refresh is secondary and remains available in help and error recovery', async () => {
  const { ui, calls } = mount('ReceivingProjects');
  await ui.flush();
  assert.equal(ui.nodes().some(n => n.props?.title === 'Cập nhật dự án'), false);
  ui.nodes().find(n => n.type === 'Pressable' && n.props.accessibilityState?.expanded === false).props.onPress();
  await ui.flush();
  await ui.press('Cập nhật dự án'); await ui.flush();
  assert.equal(calls.projects, 2);
  const failed = mount('ReceivingProjects', { discoverReceivingProjects: async () => { throw Error('Network unavailable'); } }).ui;
  await failed.flush();
  assert.ok(failed.nodes().some(n => n.props?.title === 'Cập nhật dự án'));
});

test('Request refresh and pagination keep separate actions; ACK feedback stays inline and clears on Back', async () => {
  const { ui, calls } = mount('ReceivingRequests');
  await ui.flush();
  await ui.press('Làm mới yêu cầu'); await ui.flush();
  await ui.press('Tải thêm yêu cầu'); await ui.flush();
  assert.equal(calls.list, 3);
  ui.nodes().find(n => n.type === 'Pressable' && n.props.accessibilityLabel?.includes('Chưa xác nhận')).props.onPress();
  await ui.flush();
  await ui.press('Xác nhận đã tiếp nhận yêu cầu'); await ui.flush();
  assert.equal(calls.ack, 1);
  assert.match(text(ui), /Máy chủ đã xác nhận/);
  assert.ok(ui.nodes().some(n => n.type === 'View' && n.props.accessibilityLiveRegion === 'polite'));
  assert.equal(ui.nodes().some(n => n.type === 'Toast'), false);
  assert.equal(ui.nodes().find(n => n.props?.title === 'Đã xác nhận').props.disabled, true);
  ui.nodes().find(n => n.props?.accessibilityLabel === 'Quay lại danh sách').props.onPress();
  await ui.flush();
  assert.doesNotMatch(text(ui), /Máy chủ đã xác nhận/);
});

test('Detail read failure is an inline alert and does not acknowledge anything', async () => {
  const { ui, calls } = mount('ReceivingRequests', { readReceiving: async () => { throw Error('Không đọc được yêu cầu'); } });
  await ui.flush();
  ui.nodes().find(n => n.type === 'Pressable').props.onPress(); await ui.flush();
  assert.ok(ui.nodes().some(n => n.props?.accessibilityRole === 'alert'));
  assert.match(text(ui), /Không đọc được yêu cầu/);
  assert.equal(calls.ack, 0);
});

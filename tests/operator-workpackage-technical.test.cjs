const { test } = require('node:test');
const assert = require('node:assert/strict');
const { screen } = require('./helpers/roadfe-screen.cjs');

const uuid = n => `${String(n).padStart(8, '0')}-abcd-4321-9876-123456789abc`;
const refs = [1, 2].map(n => ({ routeVersionId: uuid(n), segmentSetId: uuid(n + 10), segmentIds: [uuid(n + 20), uuid(n + 30), uuid(n + 40)] }));
function mount(scopeVersion = 'AAAA+scope/==', withGeometry = true) {
  const workPackage = { task: { id: uuid(90), scope: [] }, geometryRefs: refs, scopeVersion };
  const snapshot = JSON.stringify(workPackage);
  const geometries = withGeometry ? [{ route: { routeVersionId: refs[0].routeVersionId, versionNo: 107, effectiveFrom: null }, segmentSet: { id: refs[0].segmentSetId, segments: [] } }] : [];
  const s = screen('app/(drone)/work-package.tsx', { params: { taskId: uuid(90) }, modules: {
    '../../src/hooks/useOperatorWorkPackage': { useOperatorWorkPackage: () => ({ workPackage, geometries, reload() {} }) },
    '../../src/components/Card': { Card: 'Card' }, '../../src/components/Chip': { Chip: 'Chip' },
    '../../src/components/EmptyState': { EmptyState: 'EmptyState' },
    '../../src/components/AnimatedPressable': { AnimatedPressable: 'AnimatedPressable' },
    '../../src/api/operatorMapGeometry': { operatorMapSegments: () => [] },
  } });
  s.render();
  const tap = async label => { s.nodes().find(n => n.props?.accessibilityLabel === label).props.onPress(); await s.flush(); };
  const texts = () => s.nodes().filter(n => n.type === 'Text').map(n => n.props.children.flat(Infinity).join(''));
  return { s, tap, texts, unchanged: () => assert.equal(JSON.stringify(workPackage), snapshot) };
}

test('Technical disclosure preserves all geometry groups and segments, exposes original selectable IDs and collapses again', async () => {
  const { s, tap, texts, unchanged } = mount();
  assert.ok(!texts().includes('Phiên bản phạm vi'));
  await tap('Thông tin kỹ thuật');
  assert.ok(texts().includes('Bộ hình học đang xem'));
  assert.ok(texts().includes('Bộ hình học đã ghim'));
  assert.ok(texts().includes('AAAA+scope/=='));
  assert.ok(texts().includes('107'));
  const codes = refs.flatMap(ref => [ref.routeVersionId, ref.segmentSetId, ...ref.segmentIds]);
  for (const code of codes) assert.ok(texts().includes(`${code.slice(0, 8)}…${code.slice(-8)}`));
  await tap('Xem mã đầy đủ');
  for (const code of codes) assert.ok(s.nodes().some(n => n.type === 'Text' && n.props.selectable === true && n.props.children[0] === code), code);
  assert.ok(!texts().some(text => text.includes('…')));
  await tap('Xem mã đầy đủ');
  for (const code of codes) assert.ok(!texts().includes(code));
  await tap('Thông tin kỹ thuật');
  assert.ok(!texts().includes('Phiên bản phạm vi'));
  unchanged(); s.unmount();
});

test('Technical scope version zero is retained and unavailable geometry version is not invented', async () => {
  const { s, tap, texts, unchanged } = mount(0, false);
  await tap('Thông tin kỹ thuật');
  assert.ok(texts().includes('0'));
  assert.ok(!texts().includes('Phiên bản hình học'));
  assert.equal(texts().filter(text => text === 'Phân đoạn 3').length, 2);
  unchanged(); s.unmount();
});

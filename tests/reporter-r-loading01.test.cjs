const { test } = require('node:test');
const assert = require('node:assert/strict');
const { screen, deferred } = require('./helpers/roadfe-screen.cjs');

const report = 'app/(reporter)/report.tsx';
const flatten = (s) => (Array.isArray(s) ? Object.assign({}, ...s.filter(Boolean).map(flatten)) : s ?? {});
const allText = (s) =>
  s
    .nodes()
    .filter((n) => n.type === 'Text')
    .map((n) => (Array.isArray(n.props?.children) ? n.props.children.flat(Infinity).join('') : n.props?.children ?? ''))
    .join(' ');

test('R-LOADING-01 checking state renders unified header, card container, loading indicator and home button', async () => {
  const d = deferred();
  const s = screen(report);
  s.reporter.useReporterStore.getState().restoreStartedCommand = () => d.promise;
  s.render();

  // Header must use the standard title 'Gửi phản ánh', not 'Gửi phản ánh khuyết tật'
  const header = s.nodes().find((n) => n.type === 'ReporterHeader');
  assert.ok(header, 'ReporterHeader must be present');
  assert.equal(header.props.title, 'Gửi phản ánh');

  // Must have a scrollable or padded container, not naked Text/Button directly on SafeAreaView
  const safeArea = s.nodes().find((n) => n.type === 'SafeAreaView');
  assert.ok(safeArea, 'SafeAreaView must be present');
  assert.equal(safeArea.props.edges?.join(','), 'top,left,right');

  const scroll = s.nodes().find((n) => n.type === 'ScrollView');
  assert.ok(scroll, 'Must render ScrollView container for safe scrolling on Android 9 font scale 1.15');

  // Must render ActivityIndicator in checking state
  assert.ok(
    s.nodes().some((n) => n.type === 'ActivityIndicator'),
    'Checking state must include an ActivityIndicator'
  );

  // Must have message and safe Home button
  const text = allText(s);
  assert.match(text, /Đang kiểm tra lệnh đang gửi của phiên hiện tại/);
  assert.doesNotMatch(text, /private|uuid|stack|journal|NullPointer/i);

  const homeBtn = s.nodes().find((n) => n.type === 'Button' && n.props.title === 'Về trang chủ');
  assert.ok(homeBtn, 'Về trang chủ button must be available in checking state');
  assert.equal(homeBtn.props.variant, 'secondary');

  s.press('Về trang chủ');
  assert.deepEqual(s.nav, ['/(reporter)/home']);

  d.resolve(null);
  await s.flush();
  s.unmount();
});

test('R-LOADING-01 failed recovery renders warning card, safe Vietnamese explanation, retry and home CTAs', async () => {
  const s = screen(report);
  let attempts = 0;
  s.reporter.useReporterStore.getState().restoreStartedCommand = async () => {
    if (attempts++ === 0) throw new Error('database disk image is malformed uuid-xyz-1234');
    return null;
  };
  s.render();
  await s.flush();

  // Must show safe error message without technical details
  const text = allText(s);
  assert.match(text, /Chưa đọc được lệnh đang gửi\. Dữ liệu vẫn được giữ trên thiết bị; chưa gửi yêu cầu nào\./);
  assert.doesNotMatch(text, /malformed|uuid-xyz-1234|database disk image/);

  // Must have both Retry and Home CTAs
  const retryBtn = s.nodes().find((n) => n.type === 'Button' && n.props.title === 'Thử khôi phục lại');
  assert.ok(retryBtn, 'Thử khôi phục lại button must be present on failure');
  assert.equal(retryBtn.props.variant, 'primary');

  const homeBtn = s.nodes().find((n) => n.type === 'Button' && n.props.title === 'Về trang chủ');
  assert.ok(homeBtn, 'Về trang chủ button must be present on failure');

  // Must have warning icon
  const icon = s.nodes().find((n) => n.type === 'MaterialIcons' && n.props.name === 'error-outline');
  assert.ok(icon, 'Warning icon should be shown on failure state');

  // Pressing retry performs read-only retry without mutating backend
  s.press('Thử khôi phục lại');
  await s.flush();

  // On successful second read, form is opened
  assert.ok(s.nodes().some((n) => n.type === 'InputField' && n.props.label === 'Mô tả hiện trạng'));
  assert.equal(s.h.calls.length, 0, 'Retry recovery must never perform mutation');
  s.unmount();
});

test('R-LOADING-01 recovery view pads elements, protects safe areas, and prevents text clipping', async () => {
  const d = deferred();
  const s = screen(report);
  s.reporter.useReporterStore.getState().restoreStartedCommand = () => d.promise;
  s.render();

  const scroll = s.nodes().find((n) => n.type === 'ScrollView');
  assert.ok(scroll, 'ScrollView must wrap recovery content');
  const scrollStyle = flatten(scroll.props.contentContainerStyle);
  assert.ok(scrollStyle.padding >= 16, 'Content container must have >= 16 padding to prevent edge sticking');

  const buttons = s.nodes().filter((n) => n.type === 'Button');
  for (const b of buttons) {
    const btnStyle = flatten(b.props.style);
    if (btnStyle.minHeight) assert.ok(btnStyle.minHeight >= 48, 'Touch target must be at least 48dp');
  }

  d.resolve(null);
  await s.flush();
  s.unmount();
});

import React, { useEffect, useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useAuthStore } from '../../store/auth';
import { Card } from '../Card';
import { Button } from '../Button';
import { colors, radius, spacing, typography } from '../../design-tokens';
import { isDroneResourceId, operatorDatasetScope, readOperatorDatasetReadback } from '../../api/droneDatasetWorkflow';

const label = (value: string) => ({ PASS: 'Đạt', FAIL: 'Chưa đạt', UNKNOWN: 'Chưa xác định',
  VERIFIED: 'Đã xác minh tệp', PRESENT: 'Có dữ liệu', MISSING: 'Thiếu dữ liệu' }[value] ?? 'Chưa có nhãn trạng thái');
type Readback = Awaited<ReturnType<typeof readOperatorDatasetReadback>>;

export function DroneDatasetReadbackPanel() {
  useAuthStore(s => s.token); useAuthStore(s => s.user); useAuthStore(s => s.status);
  const scope = operatorDatasetScope();
  return scope ? <DatasetContent key={scope} scope={scope} /> : null;
}
function DatasetContent({ scope }: { scope: string }) {
  const [datasetId, setDatasetId] = useState('');
  const [result, setResult] = useState<Readback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false), mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const active = () => mounted.current && operatorDatasetScope() === scope;
  const read = async () => {
    if (lock.current || !active()) return;
    lock.current = true; setBusy(true); setError(null); setResult(null);
    try {
      const value = await readOperatorDatasetReadback(scope, datasetId.trim());
      if (active()) setResult(value);
    } catch (e) {
      if (!active()) return;
      const status = (e as { response?: { status?: number } }).response?.status;
      setError(status === 401 ? 'Phiên hết hạn. Vui lòng đăng nhập lại.' : status === 403 ? 'Bạn không có quyền đọc bộ dữ liệu này.' :
        status === 404 ? 'Không tìm thấy bộ dữ liệu.' : 'Chưa xác nhận được bộ dữ liệu và phạm vi phủ. Kiểm tra kết nối hoặc mở lại nhiệm vụ.');
    } finally {
      lock.current = false;
      if (active()) setBusy(false);
    }
  };
  return <Card style={{ marginBottom: spacing.md, gap: spacing.sm }}>
    <Text style={typography.titleMd}>Bộ dữ liệu và phạm vi phủ</Text>
    <Text style={typography.caption}>Nhập mã bộ dữ liệu máy chủ để đọc lại. Trạng thái tệp, dữ liệu GPS và phạm vi phủ được kiểm tra riêng; không thay thế nghiệm thu.</Text>
    <TextInput accessibilityLabel="Mã bộ dữ liệu máy chủ" placeholder="UUID bộ dữ liệu" autoCapitalize="none" value={datasetId} editable={!busy}
      style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, color: colors.secondary }}
      onChangeText={value => { setDatasetId(value); setResult(null); setError(null); }} />
    <Button title="Đọc bộ dữ liệu và phạm vi phủ" variant="secondary" disabled={busy || !isDroneResourceId(datasetId.trim())} loading={busy} onPress={() => void read()} />
    {!isDroneResourceId(datasetId.trim()) ? <Text style={typography.caption}>Cần UUID bộ dữ liệu từ máy chủ.</Text> : null}
    {error ? <Text accessibilityRole="alert">{error}</Text> : null}
    {result ? <View style={{ gap: spacing.sm }}>
      <Text style={typography.bodyMd}>Bộ dữ liệu: {result.dataset.id}</Text>
      <Text style={typography.bodyMd}>Toàn vẹn tệp: {label(result.dataset.integrityStatus)}</Text>
      <Text style={typography.bodyMd}>Dữ liệu GPS: {label(result.dataset.telemetryStatus)}</Text>
      {result.coverage.items.slice(0, 20).map((item, index) => <Text key={JSON.stringify(item.scope)} style={typography.bodyMd}>
        Phạm vi {index + 1}: {label(item.overallCoverage)} · Vị trí: {label(item.positionCoverage)} · Chất lượng: {label(item.qualityCoverage)}
      </Text>)}
      {result.coverage.items.length > 20 ? <Text style={typography.caption}>Hiển thị 20/{result.coverage.items.length} phạm vi.</Text> : null}
    </View> : null}
  </Card>;
}

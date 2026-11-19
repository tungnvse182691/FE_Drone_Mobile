import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuthStore } from '../../store/auth';
import { Card } from '../Card';
import { Button } from '../Button';
import { CrewContentTransition } from '../crew/CrewMotion';
import { colors, radius, spacing, typography } from '../../design-tokens';
import { isDroneResourceId, operatorDatasetScope, readOperatorDatasetReadback } from '../../api/droneDatasetWorkflow';

const label = (value: string) => ({ PASS: 'Đạt', FAIL: 'Chưa đạt', UNKNOWN: 'Chưa xác định',
  VERIFIED: 'Đã xác minh tệp', PRESENT: 'Có dữ liệu', MISSING: 'Thiếu dữ liệu' }[value] ?? 'Chưa có nhãn trạng thái');
type Readback = Awaited<ReturnType<typeof readOperatorDatasetReadback>>;
// Dataset integrity is independent of upload VERIFIED and coverage PASS.
const integrityLabel = (value: string) => ({ PASSED: 'Đạt kiểm tra toàn vẹn', FAIL: 'Chưa đạt', UNKNOWN: 'Chưa xác định' }[value] ?? 'Chưa có nhãn trạng thái');

export function DroneDatasetReadbackPanel({ compact = false }: { compact?: boolean } = {}) {
  useAuthStore(s => s.token); useAuthStore(s => s.user); useAuthStore(s => s.status);
  const scope = operatorDatasetScope();
  return scope ? <DatasetContent key={scope} scope={scope} compact={compact} /> : null;
}
function DatasetContent({ scope, compact = false }: { scope: string; compact?: boolean }) {
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
  return <Card style={[{ marginBottom: spacing.md, gap: spacing.sm }, compact && styles.card]}>
    <Text style={compact ? styles.title : typography.titleMd}>Bộ dữ liệu và phạm vi phủ</Text>
    <Text style={[typography.caption, compact && styles.caption]}>Nhập mã bộ dữ liệu máy chủ để đọc lại. Trạng thái tệp, dữ liệu GPS và phạm vi phủ được kiểm tra riêng; không thay thế nghiệm thu.</Text>
    <TextInput accessibilityLabel="Mã bộ dữ liệu máy chủ" placeholder="UUID bộ dữ liệu" autoCapitalize="none" value={datasetId} editable={!busy}
      style={[{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, color: colors.secondary }, compact && styles.input]}
      onChangeText={value => { setDatasetId(value); setResult(null); setError(null); }} />
    <Button style={compact ? styles.action : undefined} title="Đọc bộ dữ liệu và phạm vi phủ" variant="secondary" disabled={busy || !isDroneResourceId(datasetId.trim())} loading={busy} onPress={() => void read()} />
    {!isDroneResourceId(datasetId.trim()) ? <Text style={[typography.caption, compact && styles.caption]}>Cần UUID bộ dữ liệu từ máy chủ.</Text> : null}
    {error ? <Text accessibilityRole="alert">{error}</Text> : null}
    {result ? <CrewContentTransition ready={compact}>
    <View style={[{ gap: spacing.sm }, compact && styles.readback]} accessibilityLiveRegion="polite">
      {compact ? <Text style={styles.caption}>Kết quả từ máy chủ</Text> : null}
      <Text style={[typography.bodyMd, compact && styles.resultId]}>Bộ dữ liệu: {result.dataset.id}</Text>
      <Text style={[typography.bodyMd, compact && styles.resultValue]}>Toàn vẹn tệp: {integrityLabel(result.dataset.integrityStatus)}</Text>
      <Text style={[typography.bodyMd, compact && styles.resultValue]}>Dữ liệu GPS: {label(result.dataset.telemetryStatus)}</Text>
      {result.coverage.items.slice(0, 20).map((item, index) => <Text key={JSON.stringify(item.scope)} style={[typography.bodyMd, compact && styles.coverageRow]}>
        Phạm vi {index + 1}: {label(item.overallCoverage)} · Vị trí: {label(item.positionCoverage)} · Chất lượng: {label(item.qualityCoverage)}
      </Text>)}
      {result.coverage.items.length > 20 ? <Text style={typography.caption}>Hiển thị 20/{result.coverage.items.length} phạm vi.</Text> : null}
    </View>
    </CrewContentTransition> : null}
  </Card>;
}
const styles = StyleSheet.create({
  card: { padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg },
  title: { ...typography.bodyLg, fontFamily: 'Roboto-Medium', color: colors.neutral },
  caption: { color: colors.secondary },
  input: { ...typography.bodyMd, minHeight: 48, backgroundColor: colors.surface },
  action: { alignSelf: 'flex-start', maxWidth: '100%', borderRadius: radius.full, borderColor: '#E8D9A9', backgroundColor: '#FFF8E8' },
  readback: { backgroundColor: '#F1F3F5', borderRadius: radius.md, padding: spacing.sm },
  resultId: { ...typography.caption, color: colors.secondary },
  resultValue: { color: colors.secondary, fontFamily: 'Roboto-Medium' },
  coverageRow: { color: colors.secondary, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
});

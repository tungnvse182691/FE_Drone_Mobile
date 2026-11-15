import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography } from '../../design-tokens';
import { readAssignedFieldFacts, currentQueueIdentity, crewReadGuard } from '../../api/crewSafetyWorkflow';
import { sameQueueIdentity } from '../../offline/upload-queue';
import { crewDefectCoordinates, crewRouteCoordinates } from '../../utils/crew-map-geometry';
import { RoadGuardMapLibre } from '../map/RoadGuardMapLibre';

/** Read-only assigned task map. Source geometry and current assignment remain server authority. */
export function CrewTaskMap({ projectId, taskId }: { projectId: string; taskId: string }) {
  const [identity] = useState(currentQueueIdentity);
  const [facts, setFacts] = useState<Awaited<ReturnType<typeof readAssignedFieldFacts>> | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const sequence = useRef(0);
  const read = async () => {
    if (!identity) return;
    const n = ++sequence.current;
    setBusy(true); setFacts(null); setError(''); setSelectedSegment(null);
    try {
      const result = await readAssignedFieldFacts(identity, projectId, taskId);
      crewReadGuard(identity);
      if (n === sequence.current) setFacts(result);
    } catch (e) {
      if (n === sequence.current && sameQueueIdentity(identity)) {
        const status = (e as { response?: { status?: number } })?.response?.status;
        setError(status === 401 ? 'Phiên đã hết hạn.' : status === 403 ? 'Không có quyền đọc nhiệm vụ.' : status === 404 ? 'Nhiệm vụ không còn tồn tại.' : status === 409 ? 'Dữ liệu nhiệm vụ đã thay đổi. Vui lòng tải lại.' : 'Chưa tải được bản đồ. Vui lòng thử lại.');
      }
    } finally { if (n === sequence.current) setBusy(false); }
  };
  useEffect(() => { void read(); return () => { sequence.current++; }; }, []);
  try { if (!identity) return null; crewReadGuard(identity); } catch { return null; }
  const target = crewDefectCoordinates(facts?.defectTarget);
  const source = selectedSegment ? facts?.geometry?.segments.find(s => s.id === selectedSegment) : facts?.geometry?.route;
  const coordinates = source ? crewRouteCoordinates(source) : [];
  const center = coordinates[0] ?? (target ? [target.longitude, target.latitude] as [number, number] : null);
  return <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.screen}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Quay lại nhiệm vụ" onPress={() => router.back()} style={styles.iconButton}><MaterialIcons name="arrow-back" size={24} color={colors.neutral} /></Pressable>
      <Text style={[typography.titleMd, styles.title]}>Bản đồ nhiệm vụ</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Tải lại bản đồ" accessibilityState={{ disabled: busy, busy }} disabled={busy} onPress={() => void read()} style={styles.iconButton}><MaterialIcons name="refresh" size={24} color={colors.secondary} /></Pressable>
    </View>
    {busy ? <View style={styles.center}><ActivityIndicator color={colors.brandGold} /><Text style={typography.bodyMd}>Đang tải bản đồ…</Text></View> : error ? <View style={styles.center}><Text accessibilityRole="alert" style={typography.bodyMd}>{error}</Text></View> : <>
      {facts?.geometry ? <View style={styles.selector}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choices}>
        {[{ id: null, label: 'Tuyến' }, ...facts.geometry.segments.map(s => ({ id: s.id, label: `Đoạn ${s.sequence}` }))].map(choice => <Pressable key={choice.id ?? 'route'} accessibilityRole="button" accessibilityState={{ selected: selectedSegment === choice.id }} onPress={() => setSelectedSegment(choice.id)} style={[styles.choice, selectedSegment === choice.id && styles.active]}><Text style={typography.labelSm}>{choice.label}</Text></Pressable>)}
      </ScrollView></View> : null}
      <View style={styles.canvas}>{center ? <RoadGuardMapLibre key={selectedSegment ?? 'route'} style={styles.canvas} center={center} routeCoordinates={coordinates} fitTo="route" markers={target ? [{ id: 'defect-target', title: 'Vị trí hư hại', coordinate: [target.longitude, target.latitude], type: 'defect' }] : []} /> : <View style={styles.center}><MaterialIcons name="location-off" size={36} color={colors.secondary} /><Text style={typography.bodyMd}>Chưa có vị trí bản đồ cho phần đang chọn.</Text></View>}</View>
      <View style={styles.footer}><Text style={typography.bodyMd}>{target ? 'Điểm hư hại từ hồ sơ nhiệm vụ' : 'Chưa có vị trí hư hại'}</Text>{!coordinates.length ? <Text style={styles.hint}>{facts?.geometry ? 'Phần đang chọn chưa có hình học bản đồ.' : 'Tuyến chưa sẵn sàng.'}</Text> : null}</View>
    </>}
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: colors.border },
  iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24 },
  title: { flex: 1, color: colors.neutral },
  canvas: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  selector: { borderBottomWidth: 1, borderBottomColor: colors.border },
  choices: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  choice: { minHeight: 48, paddingHorizontal: 16, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 12 },
  active: { borderColor: colors.brandGold, backgroundColor: colors.surfaceAlt },
  footer: { padding: 16, gap: 8, borderTopWidth: 1, borderTopColor: colors.border },
  hint: { ...typography.caption, color: colors.secondary },
});

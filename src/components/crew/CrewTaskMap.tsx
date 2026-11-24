import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CrewPressable as Pressable } from './CrewMotion';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CREW_WO_DETAIL } from '../../constants/routes';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography } from '../../design-tokens';
import { readAssignedFieldFacts, currentQueueIdentity, crewReadGuard } from '../../api/crewSafetyWorkflow';
import { sameQueueIdentity } from '../../offline/upload-queue';
import { crewDefectCoordinates, crewRouteCoordinates } from '../../utils/crew-map-geometry';
import { RoadGuardMapLibre } from '../map/RoadGuardMapLibre';

/** Read-only assigned task map. Source geometry and current assignment remain server authority. */
export function CrewTaskMap({ projectId, taskId }: { projectId: string; taskId: string }) {
  const router = useRouter();
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
      <Pressable accessibilityRole="button" accessibilityLabel="Quay lại nhiệm vụ" onPress={() => {
        if (router.canGoBack()) router.back();
        else router.replace({ pathname: CREW_WO_DETAIL, params: { id: taskId, projectId } });
      }} style={styles.iconButton}><MaterialIcons name="arrow-back" size={24} color={colors.neutral} /></Pressable>
      <View style={styles.title}><Text style={styles.heading}>Bản đồ nhiệm vụ</Text><Text style={styles.hint}>Vị trí và hình học tuyến</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Tải lại bản đồ" accessibilityState={{ disabled: busy, busy }} disabled={busy} onPress={() => void read()} style={({ pressed }) => [styles.refresh, pressed && styles.pressed, busy && styles.disabled]}><MaterialIcons name="refresh" size={22} color={colors.brandGold} /><Text style={styles.actionLabel}>Tải lại</Text></Pressable>
    </View>
    {busy ? <View style={styles.center}><View style={styles.statePanel}><ActivityIndicator color={colors.brandGold} /><View style={styles.stateCopy}><Text style={styles.heading}>Đang tải bản đồ…</Text><Text style={styles.hint}>Đang đọc vị trí và hình học từ hồ sơ nhiệm vụ.</Text></View></View></View> : error ? <View style={styles.center}><View style={styles.statePanel}><MaterialIcons name="error-outline" size={28} color={colors.secondary} /><View style={styles.stateCopy}><Text style={styles.heading}>Chưa thể hiển thị bản đồ</Text><Text accessibilityRole="alert" style={styles.body}>{error}</Text></View></View></View> : <>
      {facts?.geometry ? <View style={styles.selector}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choices}>
        {[{ id: null, label: 'Tuyến' }, ...facts.geometry.segments.map(s => ({ id: s.id, label: `Đoạn ${s.sequence}` }))].map(choice => <Pressable key={choice.id ?? 'route'} accessibilityRole="button" accessibilityState={{ selected: selectedSegment === choice.id }} onPress={() => setSelectedSegment(choice.id)} style={[styles.choice, selectedSegment === choice.id && styles.active]}><Text style={styles.actionLabel}>{choice.label}</Text></Pressable>)}
      </ScrollView></View> : null}
      <View style={styles.canvas}>{center ? <RoadGuardMapLibre key={selectedSegment ?? 'route'} style={styles.canvas} center={center} routeCoordinates={coordinates} fitTo="route" markers={target ? [{ id: 'defect-target', title: 'Vị trí hư hại', coordinate: [target.longitude, target.latitude], type: 'defect' }] : []} /> : <View style={styles.center}><View style={styles.statePanel}><MaterialIcons name="location-off" size={28} color={colors.brandGold} /><View style={styles.stateCopy}><Text style={styles.heading}>Chưa có vị trí bản đồ</Text><Text style={styles.body}>Chưa có vị trí bản đồ cho phần đang chọn.</Text><Text style={styles.hint}>Có thể tải lại để kiểm tra dữ liệu mới hoặc quay lại nhiệm vụ.</Text></View></View></View>}</View>
      <View style={styles.footer}><MaterialIcons name="place" size={22} color={colors.secondary} /><View style={styles.title}><Text style={styles.sourceLabel}>Vị trí từ hồ sơ nhiệm vụ</Text><Text style={styles.body}>{target ? 'Điểm hư hại từ hồ sơ nhiệm vụ' : 'Chưa có vị trí hư hại'}</Text>{!coordinates.length ? <Text style={styles.hint}>{facts?.geometry ? 'Phần đang chọn chưa có hình học bản đồ.' : 'Tuyến chưa sẵn sàng.'}</Text> : null}</View></View>
    </>}
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24 },
  title: { flex: 1, minWidth: 0, gap: 4 },
  heading: { ...typography.titleMd, fontSize: 16, lineHeight: 24, color: '#192D40' },
  body: { ...typography.bodyMd, color: colors.secondary },
  refresh: { minHeight: 48, minWidth: 48, paddingHorizontal: 12, paddingVertical: 10, gap: 6, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#DCE2E7', backgroundColor: '#F7F0DA', maxWidth: '35%' },
  actionLabel: { ...typography.labelLg, color: colors.secondary },
  pressed: { backgroundColor: '#F3ECD6' },
  disabled: { opacity: 0.5 },
  canvas: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#F3F5F6' },
  statePanel: { width: '100%', maxWidth: 420, padding: 16, gap: 12, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: '#DCE2E7' },
  stateCopy: { gap: 8 },
  selector: { borderBottomWidth: 1, borderBottomColor: colors.border },
  choices: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  choice: { minHeight: 48, paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'center', borderWidth: 1, borderColor: '#DCE2E7', borderRadius: 12 },
  active: { borderColor: colors.brandGold, backgroundColor: '#FBF8EE' },
  footer: { padding: 16, gap: 12, flexDirection: 'row', alignItems: 'flex-start', borderTopWidth: 1, borderTopColor: '#DCE2E7', backgroundColor: '#F3F5F6' },
  sourceLabel: { ...typography.labelLg, color: '#192D40' },
  hint: { ...typography.caption, color: colors.secondary },
});

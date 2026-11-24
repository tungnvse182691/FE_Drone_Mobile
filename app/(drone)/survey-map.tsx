import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useOperatorWorkPackage } from '../../src/hooks/useOperatorWorkPackage';
import { operatorMapSegments } from '../../src/api/operatorMapGeometry';
import { operatorCachedNotice } from '../../src/api/operatorOfflineCache';
import { RoadGuardMapLibre } from '../../src/components/map/RoadGuardMapLibre';
import { EmptyState } from '../../src/components/EmptyState';
import { colors, typography } from '../../src/design-tokens';
import { AnimatedPressable } from '../../src/components/AnimatedPressable';

/** Focused MapLibre view. API-225 pins remain the authority for API-104 reads. */
export default function DroneSurveyMapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ taskId?: string; code?: string }>();
  const target = params.taskId || params.code || '';
  const { scopeKey, workPackage, geometries, loading, geometryError, error, cachedAt, reload } = useOperatorWorkPackage(target);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [accessFocused, setAccessFocused] = useState(false);
  const segments = !loading && workPackage ? workPackage.geometryRefs.flatMap(ref => {
    const source = geometries.find(g => g.route.routeVersionId === ref.routeVersionId && g.segmentSet.id === ref.segmentSetId);
    return source ? operatorMapSegments(ref, source) : [];
  }) : [];
  const selected = segments.find(s => s.id === selectedId) ?? segments[0];
  const point = !loading && workPackage?.accessPoint?.point;
  const access: [number, number] | null = point && Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180 && Number.isFinite(point.latitude) && Math.abs(point.latitude) <= 90
    ? [point.longitude, point.latitude] : null;
  const coordinates = accessFocused && access ? [] : selected?.coordinates ?? [];
  const center = coordinates[0] ?? access;

  return <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.screen}>
    <View style={styles.header}>
      <AnimatedPressable android_ripple={{color:'#C9A22720'}} accessibilityRole="button" accessibilityLabel="Quay lại gói công việc" onPress={() => router.back()} style={styles.iconButton}>
        <MaterialIcons name="arrow-back" size={24} color={colors.neutral} />
      </AnimatedPressable>
      <Text style={[typography.titleMd, styles.title]}>Bản đồ khảo sát</Text>
      <AnimatedPressable android_ripple={{color:'#C9A22720'}} accessibilityRole="button" accessibilityLabel="Tải lại bản đồ" disabled={loading} onPress={() => void reload()} style={styles.iconButton}>
        <MaterialIcons name="refresh" size={24} color={loading ? colors.secondary : colors.neutral} />
      </AnimatedPressable>
    </View>
    {loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /><Text style={styles.notice}>Đang đọc bản đồ khảo sát…</Text></View>
      : error || !workPackage ? <View style={styles.center}><EmptyState icon="map" title="Chưa tải được bản đồ" message={error ?? 'Vui lòng thử lại.'} actionLabel="Tải lại" onAction={() => void reload()} /></View>
        : <>
          {segments.length > 0 ? <View style={styles.selector}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentList}>
              {segments.map((segment, index) => <AnimatedPressable android_ripple={{color:'#C9A22720'}} pressedScale={0.98} key={segment.id} testID={`map-segment-${segment.id}`}
                accessibilityRole="button" accessibilityLabel={`Đoạn ${segment.sequence ?? index + 1}`} accessibilityState={{ selected: !accessFocused && selected?.id === segment.id }}
                onPress={() => { setSelectedId(segment.id); setAccessFocused(false); }} style={[styles.segment, !accessFocused && selected?.id === segment.id && styles.activeSegment]}>
                <Text style={[typography.labelLg, styles.segmentLabel, !accessFocused && selected?.id === segment.id && styles.activeLabel]}>Đoạn {segment.sequence ?? index + 1}</Text>
              </AnimatedPressable>)}
            </ScrollView>
          </View> : null}
          <View testID="survey-map-canvas" style={styles.canvas}>
            {center ? <RoadGuardMapLibre key={`${scopeKey}:${accessFocused ? 'access' : selected?.id ?? 'access'}`} style={styles.canvas}
              center={center} routeCoordinates={coordinates} fitTo="route"
              markers={access ? [{ id: 'access-point', title: 'Điểm tiếp cận', label: 'Điểm tiếp cận', type: 'survey', coordinate: access }] : []} />
              : <View style={styles.center}><EmptyState icon="location-off" title="Chưa có vị trí bản đồ" message="Nhiệm vụ chưa có điểm tiếp cận hoặc hình học WGS84." /></View>}
          </View>
          <View style={styles.footer}>
            <Pressable testID="focus-map-access" accessibilityRole="button" accessibilityLabel="Xem điểm tiếp cận" disabled={!access}
              onPress={() => setAccessFocused(true)} android_ripple={{color:'#C9A22720'}} style={[styles.legend, accessFocused && styles.focusedLegend, !access && styles.unavailableLegend]}>
              <MaterialIcons name="place" size={22} color="#192D40" />
              <Text style={[typography.bodyMd, styles.title]}>{access ? 'Điểm tiếp cận' : 'Chưa có điểm tiếp cận'}</Text>
              {access ? <MaterialIcons name="my-location" size={22} color="#192D40" /> : null}
            </Pressable>
            {geometryError || !accessFocused && coordinates.length === 0 || cachedAt ? <Text accessibilityRole="alert" style={styles.notice}>
              {geometryError ?? (!accessFocused && coordinates.length === 0 ? 'Đoạn này chưa có hình học WGS84.' : operatorCachedNotice(cachedAt!))}
            </Text> : null}
          </View>
        </>}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  title: { flex:1, color:'#192D40', fontFamily:'Roboto-Medium', lineHeight:24 },
  center: { flex:1, alignItems:'center', justifyContent:'center', padding:20, gap:12 },
  canvas: { flex: 1 },
  selector: { borderBottomWidth: 1, borderBottomColor: colors.border },
  segmentList: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  segment: { minHeight: 48, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.border, borderRadius:12, overflow:'hidden' },
  segmentLabel: { color:'#192D40', paddingVertical:10, fontVariant:['tabular-nums'] },
  activeLabel: { color:'#FFFFFF' },
  activeSegment: { backgroundColor:'#192D40', borderColor:'#192D40' },
  footer: { padding: 16, gap: 8, borderTopWidth: 1, borderTopColor: colors.border },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, padding: 12, borderRadius: 12, backgroundColor:'#F3F5F6', borderWidth:1, borderColor:'#DCE2E7' },
  focusedLegend: { backgroundColor:'#FFF7DE', borderColor:'#C9A227' },
  unavailableLegend: { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
  notice: { ...typography.caption, color: colors.secondary, lineHeight: 19 },
});

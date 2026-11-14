import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useOperatorWorkPackage } from '../../src/hooks/useOperatorWorkPackage';
import { operatorMapSegments } from '../../src/api/operatorMapGeometry';
import { operatorCachedNotice } from '../../src/api/operatorOfflineCache';
import { RoadGuardMapLibre } from '../../src/components/map/RoadGuardMapLibre';
import { EmptyState } from '../../src/components/EmptyState';
import { colors, typography } from '../../src/design-tokens';

/** Focused MapLibre view. API-225 pins remain the authority for API-104 reads. */
export default function DroneSurveyMapScreen() {
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
      <Pressable accessibilityRole="button" accessibilityLabel="Quay lại gói công việc" onPress={() => router.back()} style={styles.iconButton}>
        <MaterialIcons name="arrow-back" size={24} color={colors.neutral} />
      </Pressable>
      <Text style={[typography.titleMd, styles.title]}>Bản đồ khảo sát</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Tải lại bản đồ" disabled={loading} onPress={() => void reload()} style={styles.iconButton}>
        <MaterialIcons name="refresh" size={24} color={loading ? colors.secondary : colors.neutral} />
      </Pressable>
    </View>
    {loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      : error || !workPackage ? <View style={styles.center}><EmptyState icon="map" title="Chưa tải được bản đồ" message={error ?? 'Vui lòng thử lại.'} actionLabel="Tải lại" onAction={() => void reload()} /></View>
        : <>
          {segments.length > 0 ? <View style={styles.selector}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentList}>
              {segments.map((segment, index) => <Pressable key={segment.id} testID={`map-segment-${segment.id}`}
                accessibilityRole="button" accessibilityLabel={`Đoạn ${segment.sequence ?? index + 1}`} accessibilityState={{ selected: !accessFocused && selected?.id === segment.id }}
                onPress={() => { setSelectedId(segment.id); setAccessFocused(false); }} style={[styles.segment, !accessFocused && selected?.id === segment.id && styles.activeSegment]}>
                <MaterialIcons name="route" size={18} color={!accessFocused && selected?.id === segment.id ? colors.brandGold : colors.secondary} />
                <Text style={typography.labelSm}>Đoạn {segment.sequence ?? index + 1}</Text>
              </Pressable>)}
            </ScrollView>
          </View> : null}
          <View testID="survey-map-canvas" style={styles.canvas}>
            {center ? <RoadGuardMapLibre key={`${scopeKey}:${accessFocused ? 'access' : selected?.id ?? 'access'}`} style={styles.canvas}
              center={center} routeCoordinates={coordinates}
              markers={access ? [{ id: 'access-point', title: 'Điểm tiếp cận', label: 'Điểm tiếp cận', type: 'survey', coordinate: access }] : []} />
              : <View style={styles.center}><EmptyState icon="location-off" title="Chưa có vị trí bản đồ" message="Nhiệm vụ chưa có điểm tiếp cận hoặc hình học WGS84." /></View>}
          </View>
          <View style={styles.footer}>
            <Pressable testID="focus-map-access" accessibilityRole="button" accessibilityLabel="Xem điểm tiếp cận" disabled={!access}
              onPress={() => setAccessFocused(true)} style={styles.legend}>
              <MaterialIcons name="place" size={22} color={colors.brandGold} />
              <Text style={[typography.bodyMd, styles.title]}>{access ? 'Điểm tiếp cận' : 'Chưa có điểm tiếp cận'}</Text>
              {access ? <MaterialIcons name="my-location" size={22} color={colors.brandGold} /> : null}
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, gap: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24 },
  title: { flex: 1, color: colors.neutral },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  canvas: { flex: 1 },
  selector: { borderBottomWidth: 1, borderBottomColor: colors.border },
  segmentList: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  segment: { minHeight: 48, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.border, borderRadius: 14 },
  activeSegment: { backgroundColor: colors.surfaceAlt, borderColor: colors.brandGold },
  footer: { padding: 16, gap: 8, borderTopWidth: 1, borderTopColor: colors.border },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48 },
  notice: { ...typography.caption, color: colors.secondary, lineHeight: 19 },
});

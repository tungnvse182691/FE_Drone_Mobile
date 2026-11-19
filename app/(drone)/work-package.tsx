import { useOperatorWorkPackage } from '../../src/hooks/useOperatorWorkPackage';
import { DRONE_SURVEY_MAP } from '../../src/constants/routes';
import { operatorCachedNotice } from '../../src/api/operatorOfflineCache';
import { operatorTaskDisplayCode, operatorTaskTargetBand } from '../../src/api/operator-task-view';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Card } from '../../src/components/Card';
import { Chip } from '../../src/components/Chip';
import { EmptyState } from '../../src/components/EmptyState';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { operatorAppearance } from '../../src/components/drone/appearance';
import { operatorMapSegments } from '../../src/api/operatorMapGeometry';
import { AnimatedPressable } from '../../src/components/AnimatedPressable';

/**
 * O-05 — Gói công việc (CHỈ ĐỌC).
 *
 * Đọc API-225 (gói công việc đã ghim) + API-104 (gói hình học tuyến) để hiển thị
 * phạm vi hình học/phân đoạn đã ghim và mục đích tải lên. KHÔNG có hành động ghi,
 * KHÔNG cấp quyền xem bản đồ toàn dự án — chỉ phạm vi được ghim.
 */

function formatDateTime(iso: string | null): string {
  if (!iso) {
    return '—';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return `${date.toLocaleDateString('vi-VN')} ${date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function formatCoord(longitude: number, latitude: number): string {
  return `${Math.abs(latitude).toFixed(6)}°${latitude < 0 ? 'N' : 'B'}, ${Math.abs(longitude).toFixed(6)}°${longitude < 0 ? 'T' : 'Đ'}`;
}

const ACCESS_POINT_SOURCE_LABEL: Record<string, string> = {
  PLANNED_RENDEZVOUS: 'Theo kế hoạch',
  MANUAL: 'Do quản lý cung cấp',
  SURVEY: 'Theo khảo sát',
  EXIF: 'Theo thông tin ảnh',
  DERIVED: 'Theo dữ liệu tính toán',
};

const METADATA_STATUS_LABEL: Record<string, string> = {
  Approved: 'Đã duyệt',
  Pending: 'Chờ duyệt',
  COMPLETE: 'Đầy đủ',
  PARTIAL: 'Còn thiếu thông tin',
};

function metadataStatusLabel(status: string | null): string {
  if (!status) {
    return 'Đang cập nhật';
  }
  return METADATA_STATUS_LABEL[status] ?? 'Đang cập nhật';
}

function optionalMeters(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? `${value} m` : 'Chưa có dữ liệu';
}

export default function DroneWorkPackageScreen() {
  const params = useLocalSearchParams<{ code?: string; taskId?: string }>();
  const target = params.taskId || params.code || '';
  const { workPackage, geometries, loading, geometryError, error, cachedAt, reload: load } = useOperatorWorkPackage(target);
  const [technicalExpanded, setTechnicalExpanded] = useState(false);
  const [expandedSegments,setExpandedSegments] = useState<string[]>([]);

  const renderBody = () => {
    if (loading) {
      return (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[typography.caption, styles.loadingText]}>Đang đọc gói công việc…</Text>
        </View>
      );
    }

    if (error || !workPackage) {
      return (
        <EmptyState
          icon="error-outline"
          title="Không đọc được gói công việc"
          message={error ?? 'Vui lòng thử lại.'}
          actionLabel="Tải lại"
          onAction={() => void load()}
        />
      );
    }

    const point = workPackage.accessPoint?.point;
    const accessPoint = point && Number.isFinite(point.latitude) && Math.abs(point.latitude) <= 90 && Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180 ? workPackage.accessPoint : null;
    const accessSourceLabel = accessPoint
      ? ACCESS_POINT_SOURCE_LABEL[accessPoint.source]
      : undefined;
    const segments = workPackage.geometryRefs.flatMap(entry => {
      const source = geometries.find(value => value.route.routeVersionId === entry.routeVersionId && value.segmentSet.id === entry.segmentSetId);
      return source ? operatorMapSegments(entry, source) : [];
    });
    const selected = segments[0];
    const ref = workPackage.geometryRefs.find(entry => entry.segmentIds.includes(selected?.id ?? '')) ?? workPackage.geometryRefs[0];
    const geometry = geometries.find(entry => entry.route.routeVersionId === ref?.routeVersionId && entry.segmentSet.id === ref?.segmentSetId);

    return (
      <>
        {cachedAt ? <Card style={styles.card}><Text style={typography.bodyMd}>{operatorCachedNotice(cachedAt)}</Text></Card> : null}
        {geometryError ? <Card style={styles.card}><Text style={styles.mapNoticeText} accessibilityRole="alert">{geometryError}</Text></Card> : null}

        <Card style={styles.scopeCard}>
          <View style={styles.cardHeader}>
            <Text style={[typography.labelSm, styles.scopeOverline]}>Nhiệm vụ khảo sát</Text>
            <Text style={styles.taskCode}>Mã {operatorTaskDisplayCode(workPackage.task.id)}</Text>
          </View>
          <Text style={[typography.titleMd, styles.scopeTitle]}>Phạm vi đã ghim</Text>
          <View style={styles.infoRow}>
            <Text style={[typography.bodyMd, styles.infoLabel]}>Dải mục tiêu</Text>
            <Text style={[typography.bodyMd, styles.infoValue]}>{operatorTaskTargetBand(workPackage.task)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[typography.bodyMd, styles.infoLabel]}>Phân đoạn đã tải</Text>
            <Text testID="displayed-segment-count" style={[typography.bodyMd, styles.infoValue]}>{`${segments.length}`}</Text>
          </View>
        </Card>

        <Card style={styles.mapCard}>
          <AnimatedPressable testID="open-survey-map" accessibilityRole="button" accessibilityLabel="Mở bản đồ khảo sát"
            android_ripple={{ color: '#C9A22720' }} pressedScale={0.99}
            onPress={() => router.push({ pathname: DRONE_SURVEY_MAP, params: { taskId: target } })}
            style={styles.mapEntry}>
            <View style={styles.mapEntryIcon}><MaterialIcons name="map" size={26} color="#C9A227" /></View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[typography.titleMd, { color: '#FFFFFF' }]}>Mở bản đồ</Text>
              <Text style={[typography.caption, { color: '#DCE5EC' }]}>Phân đoạn khảo sát và điểm tiếp cận</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#FFFFFF" />
          </AnimatedPressable>
        </Card>

        <Card style={styles.card}>
          <View style={styles.cardHeader}><Text style={[typography.titleMd, styles.sectionTitle]}>Hạn bay và điểm tiếp cận</Text></View>
          <Text style={styles.groupLabel}>Thời hạn</Text>
          <View style={styles.infoRow}>
            <Text style={[typography.bodyMd, styles.infoLabel]}>Hạn bay</Text>
            <Text style={[typography.bodyMd, styles.infoValue]}>{formatDateTime(workPackage.dueAt ?? null)}</Text>
          </View>
          <View style={styles.divider} />
          <Text style={styles.groupLabel}>Điểm tiếp cận</Text>
          {accessPoint ? (
            <>
              <View style={styles.infoRow}>
                <Text style={[typography.caption, styles.infoLabel]}>Toạ độ WGS84</Text>
                <Text style={[typography.bodyMd, styles.infoValue]}>
                  {formatCoord(accessPoint.point.longitude, accessPoint.point.latitude)}
                </Text>
              </View>
              {accessSourceLabel ? (
                <View style={styles.infoRow}>
                  <Text style={[typography.caption, styles.infoLabel]}>Nguồn</Text>
                  <Text style={[typography.bodyMd, styles.infoValue]}>{accessSourceLabel}</Text>
                </View>
              ) : null}
              <View style={styles.infoRow}>
                <Text style={[typography.caption, styles.infoLabel]}>Độ chính xác vị trí</Text>
                <Text style={[typography.bodyMd, styles.infoValue]}>
                  {typeof accessPoint.accuracyMeters === 'number' && Number.isFinite(accessPoint.accuracyMeters) && accessPoint.accuracyMeters >= 0
                    ? `${accessPoint.accuracyMeters} m`
                    : 'Chưa có dữ liệu độ chính xác'}
                </Text>
              </View>
            </>
          ) : (
            <Text style={[typography.bodyMd, { color: colors.secondary }]}>
              Máy chủ chưa cung cấp điểm tiếp cận cho nhiệm vụ này.
            </Text>
          )}
        </Card>

        {geometry ? (
          <Card style={styles.card}>
            <View style={styles.cardHeader}><Text style={[typography.titleMd, styles.sectionTitle]}>Gói hình học tuyến</Text></View>
            <Text style={styles.groupLabel}>Phân đoạn đã ghim</Text>
            <View style={styles.chipRow}>
              <Chip variant="status-pending" label={cachedAt ? "Phiên bản đã lưu" : geometry.route.isCurrent ? "Bản hiện hành" : "Phiên bản đã ghim"} uppercase={false} />
            </View>
            <Text style={[typography.caption, styles.noticeText]}>Phiên bản tuyến: {geometry.route.versionNo}</Text>
            {geometry.segmentSet.segments.filter(segment => ref?.segmentIds.includes(segment.id)).map(segment => (
              <View key={segment.id} style={styles.segmentCard}>
                <AnimatedPressable android_ripple={{color:'#C9A22720'}} pressedScale={0.99} accessibilityRole="button" accessibilityLabel={`Chi tiết phân đoạn ${segment.sequence ?? ''}`} accessibilityState={{expanded:expandedSegments.includes(segment.id)}} onPress={()=>setExpandedSegments(ids=>ids.includes(segment.id)?ids.filter(id=>id!==segment.id):[...ids,segment.id])} style={styles.segmentToggle}>
                  <View style={{flex:1,gap:4}}><Text style={typography.titleMd}>{segment.sequence == null ? 'Phân đoạn chưa có mã' : `Phân đoạn ${segment.sequence}`}</Text>
                    <Text style={styles.guidanceNote}>{optionalMeters(segment.fromOffsetMeters)} → {optionalMeters(segment.toOffsetMeters)}</Text></View>
                  <MaterialIcons name={expandedSegments.includes(segment.id)?'expand-less':'expand-more'} size={22} color={colors.secondary}/>
                </AnimatedPressable>
                {expandedSegments.includes(segment.id)?<View style={styles.segmentDetails}>
                  <Text style={styles.guidanceNote}>Trạm đầu: {optionalMeters(segment.startStationMeters)}</Text>
                  <Text style={styles.guidanceNote}>Trạm cuối: {optionalMeters(segment.endStationMeters)}</Text>
                  <Text style={styles.guidanceNote}>Chiều dài: {optionalMeters(segment.lengthMeters)}</Text>
                </View>:null}
              </View>
            ))}
            <View style={styles.infoRow}>
              <Text style={[typography.caption, styles.infoLabel]}>Hiệu lực từ</Text>
              <Text style={[typography.bodyMd, styles.infoValue]}>
                {formatDateTime(geometry.route.effectiveFrom)}
              </Text>
            </View>
            <View style={styles.metrics}>
              <View style={styles.metric}><Text style={styles.guidanceNote}>Rộng khảo sát</Text><Text style={styles.metricValue}>{optionalMeters(geometry.route.surveyWidthMeters)}</Text></View>
              <View style={styles.metric}><Text style={styles.guidanceNote}>Dài tuyến</Text><Text style={styles.metricValue}>{optionalMeters(geometry.route.lengthMeters)}</Text></View>
            </View>
            <View style={styles.infoRow}>
              <Text style={[typography.caption, styles.infoLabel]}>Thông tin tuyến</Text>
              <Text style={[typography.bodyMd, styles.infoValue]}>
                {metadataStatusLabel(geometry.route.metadataStatus)}
              </Text>
            </View>
          </Card>
        ) : null}

        <Card style={styles.card}>
          <AnimatedPressable android_ripple={{color:'#C9A22720'}} pressedScale={0.995} accessibilityRole="button" accessibilityLabel="Thông tin kỹ thuật"
            accessibilityState={{ expanded: technicalExpanded }} onPress={() => setTechnicalExpanded(value => !value)} style={styles.technicalToggle}>
            <Text style={[typography.bodyMd, styles.sectionTitle]}>Thông tin kỹ thuật</Text>
            <MaterialIcons name={technicalExpanded ? 'expand-less' : 'expand-more'} size={22} color={colors.secondary} />
          </AnimatedPressable>
          {technicalExpanded ? <View style={styles.segmentDetails}>
            <Text selectable style={typography.caption}>Phiên bản phạm vi: {workPackage.scopeVersion ?? '—'}</Text>
            {workPackage.geometryRefs.map((entry) => <View key={`${entry.routeVersionId}:${entry.segmentSetId}`} style={styles.segmentCard}>
              <Text style={typography.labelSm}>{entry.routeVersionId === ref?.routeVersionId && entry.segmentSetId === ref?.segmentSetId ? 'Bộ hình học đang xem' : 'Bộ hình học đã ghim'}</Text>
              <Text selectable style={typography.caption}>Tuyến: {entry.routeVersionId}</Text>
              <Text selectable style={typography.caption}>Bộ phân đoạn: {entry.segmentSetId}</Text>
              <Text selectable style={typography.caption}>Phân đoạn: {entry.segmentIds.join(', ')}</Text>
            </View>)}
            {geometry ? <Text selectable style={typography.caption}>Phiên bản hình học: {geometry.route.versionNo}</Text> : null}
          </View> : null}
        </Card>

        <Card style={styles.card}>
            <View style={styles.cardHeader}><Text style={[typography.titleMd, styles.sectionTitle]}>Dữ liệu cần gửi</Text></View>
          <View style={styles.uploadGuidance}>
            <View style={styles.guidanceRow}><MaterialIcons name="videocam" size={22} color={colors.secondary}/><Text style={styles.guidanceText}>Video 4K RGB</Text><Text style={styles.guidanceNote}>Bắt buộc</Text></View>
          </View>
        </Card>
      </>
    );
  };

  return (
    <View style={styles.screen}>
      <SafeAreaScreen
        scroll
        header={
          <View style={styles.topBar}>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Quay lại"
              hitSlop={8}
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            >
              <MaterialIcons name="arrow-back" size={20} color={colors.neutral} />
            </Pressable>
            <Text style={[typography.titleMd, styles.topBarTitle]}>Gói công việc</Text>
          </View>
        }
      >
        {renderBody()}
      </SafeAreaScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  metrics:{flexDirection:'row',flexWrap:'wrap',gap:12,marginTop:16},
  metric:{flex:1,minWidth:120,gap:6,padding:14,borderRadius:12,backgroundColor:colors.surfaceAlt},
  metricValue:{...typography.titleMd,color:'#192D40',fontVariant:['tabular-nums']},
  segmentCard:{marginTop:12,borderTopWidth:1,borderTopColor:'#DCE2E7',paddingTop:12},
  segmentToggle:{flexDirection:'row',alignItems:'center',gap:12,minHeight:48},
  segmentNumber:{width:40,height:40,borderRadius:10,backgroundColor:colors.surface,alignItems:'center',justifyContent:'center'},
  segmentDetails:{gap:6,paddingTop:12,marginTop:12,borderTopWidth:1,borderTopColor:colors.border},
  guidanceRow:{flexDirection:'row',alignItems:'center',gap:10,minHeight:44,flexWrap:'wrap'},
  mapEntry: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, overflow: 'hidden' },
  mapEntryIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#2B4053', alignItems: 'center', justifyContent: 'center' },
  mapNotice: { flexDirection: 'row', gap: 8, padding: 12, marginTop: 12, backgroundColor: colors.surfaceAlt, borderRadius: 10 },
  mapNoticeText: { ...typography.caption, color: colors.secondary, flex: 1, lineHeight: 19 },
  segmentChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  segmentChoice: { paddingHorizontal: 12, minHeight: 44, justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  segmentActive: { backgroundColor: colors.surfaceAlt, borderColor: colors.brandGold },
  uploadGuidance: { gap: 8, marginTop: 12 },
  guidanceText: { ...typography.bodyMd, color: colors.neutral,flex:1,minWidth:120 },
  guidanceNote: { ...typography.caption, color: colors.secondary, lineHeight: 18 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  taskCode: { ...typography.bodyMd, fontFamily:'Roboto-Medium', fontVariant:['tabular-nums'], color:'#192D40', backgroundColor:'#EEF2F5', paddingHorizontal:10, paddingVertical:6, borderRadius:8 },
  groupLabel: { ...typography.labelSm, color: colors.secondary, marginTop: 16, marginBottom: 4 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 12 },
  emptyEvidence: { minHeight: 150, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.border, borderRadius: 12, alignItems: 'center', justifyContent: 'center', padding: 16, gap: 12, backgroundColor: colors.surfaceAlt, marginTop: 16 },
  screen: {
    flex: 1,
  },
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  loadingText: {
    color: colors.secondary,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: spacing.md,
  },
  noticeText: {
    color: colors.neutral,
    flex: 1,
  },
  mapCard: { ...operatorAppearance.card, borderRadius:16, borderColor:'#192D40', backgroundColor:'#192D40', marginBottom:12 },
  card: { ...operatorAppearance.card, borderRadius:16, borderColor:'#DCE2E7', marginBottom:12 },
  scopeCard: { ...operatorAppearance.card, borderRadius:16, borderColor:'#DCE2E7', marginBottom:12 },
  scopeTitle: {
    color: colors.neutral,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  scopeOverline: {
    color: colors.secondary,
    flex: 1,
  },
  scopeNote: {
    color: colors.secondary,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    flex:1, color:'#192D40', fontSize:16, lineHeight:24, fontFamily:'Roboto-Medium',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection:'row', flexWrap:'wrap', alignItems:'baseline', gap:8, marginTop:8, paddingVertical:6,
  },
  infoLabel: {
    color: colors.secondary,
    flexGrow:1, flexBasis:112,
  },
  infoValue: {
    color:'#192D40', flexGrow:1, flexBasis:160, flexShrink:1, fontFamily:'Roboto-Medium', textAlign:'right',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.screenMargin,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topBarTitle: {
    color: colors.neutral,
  },
  backButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  technicalToggle: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.7,
  },
});

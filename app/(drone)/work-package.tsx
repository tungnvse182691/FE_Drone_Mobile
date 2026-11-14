import { useOperatorReadScope } from '../../src/hooks/useOperatorReadScope';
import { readOperatorSnapshot, operatorCachedNotice } from '../../src/api/operatorOfflineCache';
import { operatorTaskDisplayCode, operatorTaskTargetBand } from '../../src/api/operator-task-view';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Card } from '../../src/components/Card';
import { Chip } from '../../src/components/Chip';
import { EmptyState } from '../../src/components/EmptyState';
import { messageFor } from '../../src/api/errorCatalog';
import { parseProblemDetails } from '../../src/api/problemDetails';
import {
  getOperatorGeometryPackageReal,
  getOperatorWorkPackageReal,
  type GeometryPackageViewDto,
  type SurveyTaskWorkPackageDto,
} from '../../src/api/droneApi';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { operatorAppearance } from '../../src/components/drone/appearance';
import { RoadGuardMapLibre } from '../../src/components/map/RoadGuardMapLibre';
import { operatorMapSegments } from '../../src/api/operatorMapGeometry';

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

function segmentMetadata(segment: GeometryPackageViewDto['segmentSet']['segments'][number]): string {
  const parts = [
    `Từ ${optionalMeters(segment.fromOffsetMeters)}`,
    `đến ${optionalMeters(segment.toOffsetMeters)}`,
    `trạm đầu ${optionalMeters(segment.startStationMeters)}`,
    `trạm cuối ${optionalMeters(segment.endStationMeters)}`,
    `dài ${optionalMeters(segment.lengthMeters)}`,
  ];
  return parts.join(' · ');
}

function operatorErrorMessage(error: unknown): string {
  const response = (error as { response?: { data?: unknown; status?: number } }).response;
  const code = parseProblemDetails(response?.data).code;
  if (code) {
    return messageFor(code);
  }
  const parsed = parseProblemDetails(response?.data);
  return 'Không đọc được gói công việc. Vui lòng thử lại.';
}

export default function DroneWorkPackageScreen() {
  const params = useLocalSearchParams<{ code?: string; taskId?: string }>();
  const target = params.taskId || params.code || '';
  const scope = useOperatorReadScope(target);
  const [dataScope, setDataScope] = useState<string | null>(null);

  const [workPackage, setWorkPackage] = useState<SurveyTaskWorkPackageDto | null>(null);
  const [geometries, setGeometries] = useState<GeometryPackageViewDto[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [geometryError, setGeometryError] = useState<string | null>(null);
  const [technicalExpanded, setTechnicalExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cachedAt, setCachedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    const isCurrent = scope.capture();
    if (!isCurrent()) return;
    setDataScope(scope.key);
    setWorkPackage(null);
    setGeometries([]);
    setSelectedSegment(null);
    setLoading(true);
    setError(null);
    setCachedAt(null);
    setGeometryError(null);
    try {
      const wp = await readOperatorSnapshot(`work:${target}`, () => getOperatorWorkPackageReal(target));
      if (!isCurrent()) return;
      setWorkPackage(wp.data);
      setCachedAt(wp.cachedAt);
      if (wp.data.geometryRefs?.length && wp.data.task.projectId) {
        const loaded: GeometryPackageViewDto[] = [];
        for (const ref of wp.data.geometryRefs) {
          try {
            const gp = await readOperatorSnapshot(`geometry:${target}:${ref.routeVersionId}:${ref.segmentSetId}`, () => getOperatorGeometryPackageReal(wp.data.task.projectId, {
              routeVersionId: ref.routeVersionId,
              segmentSetId: ref.segmentSetId,
            }));
            if (!isCurrent()) return;
            if (gp.data.projectId !== wp.data.task.projectId || gp.data.route.routeVersionId !== ref.routeVersionId || gp.data.segmentSet.id !== ref.segmentSetId || gp.data.segmentSet.routeVersionId !== ref.routeVersionId) throw Error('geometry_source_mismatch');
            operatorMapSegments(ref, gp.data);
            loaded.push(gp.data);
            if (gp.cachedAt) setCachedAt(gp.cachedAt);
          } catch { if (isCurrent()) setGeometryError('Chưa đọc được hình học đã ghim. Thông tin nhiệm vụ vẫn được giữ.'); }
        }
        if (!isCurrent()) return;
        setGeometries(loaded);
      }
    } catch (err) {
      if (!isCurrent()) return;
      setError(operatorErrorMessage(err));
      setWorkPackage(null);
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [target, scope.key, scope.capture]);

  useEffect(() => {
    void load();
  }, [load]);

  const renderBody = () => {
    if (!scope.key || dataScope !== scope.key || loading) {
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
    const selected = segments.find(segment => segment.id === selectedSegment) ?? segments[0];
    const ref = workPackage.geometryRefs.find(entry => entry.segmentIds.includes(selected?.id ?? '')) ?? workPackage.geometryRefs[0];
    const geometry = geometries.find(entry => entry.route.routeVersionId === ref?.routeVersionId && entry.segmentSet.id === ref?.segmentSetId);
    const coordinates = selected?.coordinates ?? [];
    const accessCoordinate: [number, number] | null = accessPoint ? [accessPoint.point.longitude, accessPoint.point.latitude] : null;

    return (
      <>
        {cachedAt ? <Card style={styles.card}><Text style={typography.bodyMd}>{operatorCachedNotice(cachedAt)}</Text></Card> : null}
        {geometryError ? <Card style={styles.card}><Text style={styles.mapNoticeText} accessibilityRole="alert">{geometryError}</Text></Card> : null}

        <Card style={styles.scopeCard}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="assignment" size={16} color={colors.brandGold} />
            <Text style={[typography.labelSm, styles.scopeOverline]}>NHIỆM VỤ</Text>
            <Text style={[typography.caption, { color: colors.secondary }]}>{operatorTaskDisplayCode(workPackage.task.id)}</Text>
          </View>
          <Text style={[typography.titleMd, styles.scopeTitle]}>Phạm vi đã ghim</Text>
          <View style={styles.infoRow}>
            <MaterialIcons name="layers" size={16} color={colors.brandGold} />
            <Text style={[typography.bodyMd, styles.infoLabel]}>Dải mục tiêu</Text>
            <Text style={[typography.bodyMd, styles.infoValue]}>{operatorTaskTargetBand(workPackage.task)}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="route" size={16} color={colors.brandGold} />
            <Text style={[typography.bodyMd, styles.infoLabel]}>Phân đoạn đã tải</Text>
            <Text testID="displayed-segment-count" style={[typography.bodyMd, styles.infoValue]}>{`${segments.length}`}</Text>
          </View>
        </Card>

        <Card style={styles.card}>
          <View style={styles.cardHeader}><MaterialIcons name="map" size={18} color={colors.brandGold} /><Text style={[typography.titleMd, styles.sectionTitle]}>Bản đồ khảo sát</Text></View>
          {segments.length > 0 ? <View style={styles.segmentChoices}>
            {segments.map((segment, index) => <Pressable key={segment.id} testID={`map-segment-${segment.id}`}
              accessibilityRole="button" accessibilityState={{ selected: selected?.id === segment.id }}
              onPress={() => setSelectedSegment(segment.id)}
              style={[styles.segmentChoice, selected?.id === segment.id && styles.segmentActive]}>
              <Text style={typography.labelSm}>Đoạn {segment.sequence ?? index + 1}</Text>
            </Pressable>)}
          </View> : null}
          {coordinates.length > 0 || accessCoordinate ? <View style={styles.mapFrame}>
            <RoadGuardMapLibre key={`${scope.key}:${selected?.id ?? 'access'}`} style={{ flex: 1 }}
              center={coordinates[0] ?? accessCoordinate!} routeCoordinates={coordinates}
              markers={accessCoordinate ? [{ id: 'access-point', title: 'Điểm tiếp cận', label: 'Điểm tiếp cận', type: 'survey', coordinate: accessCoordinate }] : []} />
          </View> : null}
          {coordinates.length === 0 ? <View style={styles.mapNotice}>
            <MaterialIcons name="info-outline" size={18} color={colors.secondary} />
            <Text style={styles.mapNoticeText}>{accessCoordinate ? 'Đang hiển thị điểm tiếp cận. Phân đoạn chưa có hình học WGS84.' : 'Chưa có tọa độ WGS84 để hiển thị bản đồ.'}</Text>
          </View> : null}
        </Card>

        <Card style={styles.card}>
          <View style={styles.cardHeader}><MaterialIcons name="flight-takeoff" size={16} color={colors.brandGold} /><Text style={[typography.titleMd, styles.sectionTitle]}>Hạn bay và điểm tiếp cận</Text></View>
          <Text style={styles.groupLabel}>THỜI HẠN</Text>
          <View style={styles.infoRow}>
            <MaterialIcons name="event" size={16} color={colors.brandGold} />
            <Text style={[typography.bodyMd, styles.infoLabel]}>Hạn bay</Text>
            <Text style={[typography.bodyMd, styles.infoValue]}>{formatDateTime(workPackage.dueAt ?? null)}</Text>
          </View>
          <View style={styles.divider} />
          <Text style={styles.groupLabel}>ĐIỂM TIẾP CẬN</Text>
          {accessPoint ? (
            <>
              <View style={styles.infoRow}>
                <MaterialIcons name="my-location" size={16} color={colors.brandGold} />
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
            <View style={styles.cardHeader}><MaterialIcons name="map" size={16} color={colors.brandGold} /><Text style={[typography.titleMd, styles.sectionTitle]}>Gói hình học tuyến</Text></View>
            <Text style={styles.groupLabel}>PHÂN ĐOẠN ĐÃ GHIM</Text>
            <View style={styles.chipRow}>
              <Chip variant="status-pending" label={cachedAt ? "Phiên bản đã lưu" : geometry.route.isCurrent ? "Bản hiện hành" : "Phiên bản đã ghim"} uppercase={false} />
            </View>
            <Text style={[typography.caption, styles.noticeText]}>Phiên bản tuyến: {geometry.route.versionNo}</Text>
            {geometry.segmentSet.segments.filter(segment => ref?.segmentIds.includes(segment.id)).map(segment => (
              <View key={segment.id} style={styles.infoRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[typography.bodyMd, styles.infoValue]}>{segment.sequence == null ? 'Phân đoạn chưa có mã' : `Phân đoạn ${segment.sequence}`}</Text>
                  <Text style={[typography.caption, styles.infoLabel]}>{segmentMetadata(segment)}</Text>
                </View>
              </View>
            ))}
            <View style={styles.infoRow}>
              <Text style={[typography.caption, styles.infoLabel]}>Hiệu lực từ</Text>
              <Text style={[typography.bodyMd, styles.infoValue]}>
                {formatDateTime(geometry.route.effectiveFrom)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[typography.caption, styles.infoLabel]}>Chiều rộng khảo sát</Text>
              <Text style={[typography.bodyMd, styles.infoValue]}>
                {geometry.route.surveyWidthMeters} m
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[typography.caption, styles.infoLabel]}>Chiều dài tuyến</Text>
              <Text style={[typography.bodyMd, styles.infoValue]}>
                {geometry.route.lengthMeters} m
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[typography.caption, styles.infoLabel]}>Trạng thái siêu dữ liệu</Text>
              <Text style={[typography.bodyMd, styles.infoValue]}>
                {metadataStatusLabel(geometry.route.metadataStatus)}
              </Text>
            </View>
          </Card>
        ) : null}

        <Card style={styles.card}>
          <Pressable accessibilityRole="button" accessibilityLabel="Thông tin kỹ thuật"
            accessibilityState={{ expanded: technicalExpanded }} onPress={() => setTechnicalExpanded(value => !value)} style={styles.technicalToggle}>
            <Text style={[typography.bodyMd, styles.infoValue]}>Thông tin kỹ thuật</Text>
            <MaterialIcons name={technicalExpanded ? 'expand-less' : 'expand-more'} size={22} color={colors.secondary} />
          </Pressable>
          {technicalExpanded ? <View style={{ gap: spacing.sm }}>
            <Text selectable style={typography.caption}>Phiên bản phạm vi: {workPackage.scopeVersion ?? '—'}</Text>
            {workPackage.geometryRefs.map((entry) => <View key={`${entry.routeVersionId}:${entry.segmentSetId}`} style={{ gap: spacing.xs }}>
              <Text style={typography.labelSm}>{entry.routeVersionId === ref?.routeVersionId && entry.segmentSetId === ref?.segmentSetId ? 'Bộ hình học đang xem' : 'Bộ hình học đã ghim'}</Text>
              <Text selectable style={typography.caption}>Tuyến: {entry.routeVersionId}</Text>
              <Text selectable style={typography.caption}>Bộ phân đoạn: {entry.segmentSetId}</Text>
              <Text selectable style={typography.caption}>Phân đoạn: {entry.segmentIds.join(', ')}</Text>
            </View>)}
            {geometry ? <Text selectable style={typography.caption}>Phiên bản hình học: {geometry.route.versionNo}</Text> : null}
          </View> : null}
        </Card>

        <Card style={styles.card}>
            <View style={styles.cardHeader}><MaterialIcons name="folder-open" size={16} color={colors.brandGold} /><Text style={[typography.titleMd, styles.sectionTitle]}>Mục đích tải lên</Text></View>
          <View style={styles.uploadGuidance}>
            <Text style={styles.guidanceText}>Video khảo sát 4K RGB và tệp hành trình SRT/GPS.</Text>
            <Text style={styles.guidanceNote}>Thiếu dữ liệu hành trình thì chưa đủ bằng chứng đánh giá phủ tuyến.</Text>
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
  mapFrame: { height: 320, overflow: 'hidden', borderRadius: 12, marginTop: 12 },
  mapNotice: { flexDirection: 'row', gap: 8, padding: 12, marginTop: 12, backgroundColor: colors.surfaceAlt, borderRadius: 10 },
  mapNoticeText: { ...typography.caption, color: colors.secondary, flex: 1, lineHeight: 19 },
  segmentChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  segmentChoice: { paddingHorizontal: 12, minHeight: 44, justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  segmentActive: { backgroundColor: colors.surfaceAlt, borderColor: colors.brandGold },
  uploadGuidance: { gap: 8, marginTop: 12 },
  guidanceText: { ...typography.bodyMd, color: colors.neutral },
  guidanceNote: { ...typography.caption, color: colors.secondary, lineHeight: 18 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
  card: { ...operatorAppearance.card, marginBottom: 12 },
  scopeCard: { ...operatorAppearance.card, marginBottom: 12 },
  scopeTitle: {
    color: colors.neutral,
    marginBottom: spacing.sm,
  },
  scopeOverline: {
    color: colors.brandGold,
    flex: 1,
  },
  scopeNote: {
    color: colors.secondary,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    flex: 1, color: colors.neutral,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  infoLabel: {
    color: colors.secondary,
    flex: 1,
  },
  infoValue: {
    color: colors.neutral,
    flexShrink: 1,
    maxWidth: '65%',
    fontFamily: 'Roboto-Medium',
    textAlign: 'left',
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

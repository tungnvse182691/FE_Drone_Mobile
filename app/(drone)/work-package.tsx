import { useOperatorReadScope } from '../../src/hooks/useOperatorReadScope';
import { operatorTaskTargetBand } from '../../src/api/operator-task-view';
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
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

const ACCESS_POINT_SOURCE_LABEL: Record<string, string> = {
  PLANNED_RENDEZVOUS: 'Theo kế hoạch',
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
  const [geometry, setGeometry] = useState<GeometryPackageViewDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [geometryError, setGeometryError] = useState<string | null>(null);
  const [technicalExpanded, setTechnicalExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const isCurrent = scope.capture();
    if (!isCurrent()) return;
    setDataScope(scope.key);
    setWorkPackage(null);
    setGeometry(null);
    setLoading(true);
    setError(null);
    setGeometryError(null);
    try {
      const wp = await getOperatorWorkPackageReal(target);
      if (!isCurrent()) return;
      setWorkPackage(wp.data);
      const ref = wp.data.geometryRefs?.[0];
      if (ref && wp.data.task.projectId) {
        try {
        const gp = await getOperatorGeometryPackageReal(wp.data.task.projectId, {
          routeVersionId: ref.routeVersionId,
          segmentSetId: ref.segmentSetId,
        });
        if (!isCurrent()) return;
        if (gp.data.projectId !== wp.data.task.projectId || gp.data.route.routeVersionId !== ref.routeVersionId || gp.data.segmentSet.id !== ref.segmentSetId || gp.data.segmentSet.routeVersionId !== ref.routeVersionId) throw Error('geometry_source_mismatch');
        setGeometry(gp.data);
        } catch { if (isCurrent()) setGeometryError('Chưa đọc được hình học đã ghim. Thông tin nhiệm vụ vẫn được giữ.'); }
      }
    } catch (err) {
      if (!isCurrent()) return;
      setError(operatorErrorMessage(err));
      setWorkPackage(null);
      setGeometry(null);
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

    const ref = workPackage.geometryRefs[0];
    const point = workPackage.accessPoint?.point;
    const accessPoint = point && Number.isFinite(point.latitude) && Math.abs(point.latitude) <= 90 && Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180 ? workPackage.accessPoint : null;
    const accessSourceLabel = accessPoint
      ? ACCESS_POINT_SOURCE_LABEL[accessPoint.source]
      : undefined;

    return (
      <>
        {geometryError ? <Text accessibilityRole="alert">{geometryError}</Text> : null}
        <View style={styles.notice}>
          <MaterialIcons name="lock-outline" size={18} color={colors.brandGold} />
          <Text style={[typography.caption, styles.noticeText]}>
            Gói chỉ đọc theo phạm vi nhiệm vụ được giao.
          </Text>
        </View>

        <Card style={styles.card}>
          <Text style={[typography.labelSm, styles.sectionTitle]}>NHIỆM VỤ</Text>
          <View style={styles.infoRow}>
            <Text style={[typography.caption, styles.infoLabel]}>Hạn bay</Text>
            <Text style={[typography.bodyMd, styles.infoValue]}>
              {formatDateTime(workPackage.dueAt ?? null)}
            </Text>
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={[typography.labelSm, styles.sectionTitle]}>ĐIỂM TIẾP CẬN (ĐIỂM HẸN)</Text>
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
            <Text style={[typography.bodyMd, styles.infoValue]}>
              Máy chủ chưa công bố điểm tiếp cận cho nhiệm vụ này.
            </Text>
          )}
        </Card>

        <Card style={styles.card}>
          <Text style={[typography.labelSm, styles.sectionTitle]}>PHẠM VI ĐÃ GHIM</Text>
          <View style={styles.infoRow}>
            <Text style={[typography.caption, styles.infoLabel]}>Số phân đoạn</Text>
            <Text style={[typography.bodyMd, styles.infoValue]}>
              {workPackage.geometryRefs.length ? `${workPackage.geometryRefs.reduce((count, entry) => count + entry.segmentIds.length, 0)}` : '—'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[typography.caption, styles.infoLabel]}>Dải mục tiêu</Text>
            <Text style={[typography.bodyMd, styles.infoValue]}>
              {operatorTaskTargetBand(workPackage.task)}
            </Text>
          </View>
        </Card>

        {geometry ? (
          <Card style={styles.card}>
            <Text style={[typography.labelSm, styles.sectionTitle]}>GÓI HÌNH HỌC TUYẾN</Text>
            <View style={styles.chipRow}>
              <Chip variant="status-pending" label={geometry.route.isCurrent ? "Bản hiện hành" : "Phiên bản đã ghim"} uppercase={false} />
            </View>
            <Text style={[typography.caption, styles.noticeText]}>Hình học của gói đầu tiên đã ghim.</Text>
            {geometry.segmentSet.segments.filter(segment => ref?.segmentIds.includes(segment.id)).map(segment => (
              <View key={segment.id} style={styles.infoRow}>
                <Text style={[typography.bodyMd, styles.infoValue]}>{segment.code?.trim() || 'Phân đoạn chưa có mã'}</Text>
                <Text style={[typography.caption, styles.infoValue]}>{segment.lengthMeters} m</Text>
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
            {workPackage.geometryRefs.map((entry, index) => <View key={index} style={{ gap: spacing.xs }}>
              <Text selectable style={typography.caption}>Tuyến: {entry.routeVersionId}</Text>
              <Text selectable style={typography.caption}>Bộ phân đoạn: {entry.segmentSetId}</Text>
              <Text selectable style={typography.caption}>Phân đoạn: {entry.segmentIds.join(', ')}</Text>
            </View>)}
            {geometry ? <Text selectable style={typography.caption}>Phiên bản hình học: {geometry.route.versionNo}</Text> : null}
          </View> : null}
        </Card>

        <Card style={styles.card}>
          <Text style={[typography.labelSm, styles.sectionTitle]}>MỤC ĐÍCH TẢI LÊN</Text>
          <View style={styles.infoRow}>
            <Text style={[typography.caption, styles.infoLabel]}>Dữ liệu bay</Text>
            <Text style={[typography.bodyMd, styles.infoValue]}>
              Video khảo sát 4K RGB kèm dữ liệu telemetry/SRT/GPS theo nhiệm vụ.
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[typography.caption, styles.infoLabel]}>Ghi chú</Text>
            <Text style={[typography.bodyMd, styles.infoValue]}>
              Thiếu SRT/GPS thì KHÔNG đạt điều kiện phủ tuyến.
            </Text>
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
    backgroundColor: '#FEF9E7',
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: spacing.md,
  },
  noticeText: {
    color: colors.neutral,
    flex: 1,
  },
  card: {
    borderRadius: radius.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.secondary,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  infoLabel: {
    color: colors.secondary,
    flexShrink: 1,
  },
  infoValue: {
    color: colors.neutral,
    flexShrink: 1,
    textAlign: 'left',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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

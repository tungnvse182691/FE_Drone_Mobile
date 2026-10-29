import { useOperatorReadScope } from '../../src/hooks/useOperatorReadScope';
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
            CHỈ ĐỌC. Phạm vi được ghim theo nhiệm vụ; không có quyền xem bản đồ toàn dự án và
            không có thao tác ghi trên gói công việc.
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
                <Text style={[typography.caption, styles.infoLabel]}>Bán kính an toàn</Text>
                <Text style={[typography.bodyMd, styles.infoValue]}>
                  {accessPoint.accuracyMeters != null
                    ? `${accessPoint.accuracyMeters}m`
                    : 'Theo quy định an toàn hiện trường'}
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
              {ref ? `${ref.segmentIds.length}` : '—'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[typography.caption, styles.infoLabel]}>Dải mục tiêu</Text>
            <Text style={[typography.bodyMd, styles.infoValue]}>
              {workPackage.task.scope[0]?.targetBand ?? '—'}
            </Text>
          </View>
        </Card>

        {geometry ? (
          <Card style={styles.card}>
            <Text style={[typography.labelSm, styles.sectionTitle]}>GÓI HÌNH HỌC TUYẾN</Text>
            <View style={styles.chipRow}>
              <Chip variant="approved" label="Bản hiện hành" uppercase={false} />
              <Chip variant="measure-only" label="BTXM TCVN 10380" uppercase={false} />
            </View>
            <View style={styles.infoRow}>
              <Text style={[typography.caption, styles.infoLabel]}>Số phiên bản</Text>
              <Text style={[typography.bodyMd, styles.infoValue]}>v{geometry.route.versionNo}</Text>
            </View>
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
          <Text style={[typography.labelSm, styles.sectionTitle]}>MỤC ĐÍCH TẢI LÊN</Text>
          <View style={styles.infoRow}>
            <Text style={[typography.caption, styles.infoLabel]}>Dữ liệu bay</Text>
            <Text style={[typography.bodyMd, styles.infoValue]}>
              4K RGB + DSM (OpenDroneMap), video kèm tệp SRT/GPS
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  infoLabel: {
    color: colors.secondary,
    flexShrink: 0,
  },
  infoValue: {
    color: colors.neutral,
    flexShrink: 1,
    textAlign: 'right',
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
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.7,
  },
});

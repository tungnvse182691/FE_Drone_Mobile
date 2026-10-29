import { useOperatorReadScope } from '../../src/hooks/useOperatorReadScope';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Card } from '../../src/components/Card';
import { Chip } from '../../src/components/Chip';
import { Button } from '../../src/components/Button';
import { EmptyState } from '../../src/components/EmptyState';
import { DRONE_REQUEST_DETAIL, DRONE_REQUESTS } from '../../src/constants/routes';
import { messageFor } from '../../src/api/errorCatalog';
import { parseProblemDetails } from '../../src/api/problemDetails';
import {
  getOperatorSurveyTaskDetailReal,
  getOperatorWorkPackageReal,
  type SurveyTaskV2ResponseDto,
  type SurveyTaskWorkPackageDto,
} from '../../src/api/droneApi';
import {
  operatorTaskDisplayCode,
  operatorTaskSegmentCount,
  operatorTaskStatusLabel,
  operatorTaskTargetBand,
} from '../../src/api/operator-task-view';
import { DroneTaskCommandPanel } from '../../src/components/drone/DroneTaskCommandPanel';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

/**
 * O-04 — Từ chối nhiệm vụ khảo sát (API-230).
 *
 * Lệnh ghi đi qua journal bất biến và xác nhận gửi riêng.
 * API-226/API-225 vẫn phục vụ đọc nhiệm vụ và gói công việc.
 * Việc điều phối lại/bổ sung thuộc về PM trên Web — Operator không được gọi.
 */

function formatDateTime(iso: string | null): string {
  if (!iso) {
    return 'Chưa đặt hạn';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return 'Chưa đặt hạn';
  }
  return `${date.toLocaleDateString('vi-VN')} ${date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function operatorErrorCode(error: unknown): string | null {
  const response = (error as { response?: { data?: unknown } }).response;
  return parseProblemDetails(response?.data).code;
}

function operatorErrorMessage(error: unknown): string {
  const code = operatorErrorCode(error);
  if (code) {
    return messageFor(code);
  }
  const parsed = parseProblemDetails((error as { response?: { data?: unknown } }).response?.data);
  return 'Không đọc được nhiệm vụ. Vui lòng thử lại.';
}

export default function DroneRequestDeclineScreen() {
  const params = useLocalSearchParams<{ code?: string; taskId?: string }>();
  const target = params.taskId || params.code || '';
  const scope = useOperatorReadScope(target);
  const [dataScope, setDataScope] = useState<string | null>(null);

  const [detail, setDetail] = useState<SurveyTaskV2ResponseDto | null>(null);
  const [workPackage, setWorkPackage] = useState<SurveyTaskWorkPackageDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadDetail = useCallback(async () => {
    const isCurrent = scope.capture();
    if (!isCurrent()) return;
    setDataScope(scope.key);
    setWorkPackage(null);
    setDetail(null);
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await getOperatorSurveyTaskDetailReal(target);
      if (!isCurrent()) return;
      setDetail(data);
      try {
        const work = await getOperatorWorkPackageReal(target);
        if (!isCurrent()) return;
        setWorkPackage(work.data);
      } catch {
        if (!isCurrent()) return;
        setWorkPackage(null);
      }
    } catch (error) {
      if (!isCurrent()) return;
      setLoadError(operatorErrorMessage(error));
      setDetail(null);
      setWorkPackage(null);
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [target, scope.key, scope.capture]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const point = workPackage?.accessPoint?.point;
  const accessPoint = point && Number.isFinite(point.latitude) && Math.abs(point.latitude)<=90 &&
    Number.isFinite(point.longitude) && Math.abs(point.longitude)<=180 ? point : null;

  const renderBody = () => {
    if (!scope.key || dataScope !== scope.key || loading) {
      return (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[typography.caption, styles.loadingText]}>
            Đang đọc nhiệm vụ khảo sát…
          </Text>
        </View>
      );
    }

    if (loadError || !detail) {
      return (
        <EmptyState
          icon="error-outline"
          title="Không đọc được nhiệm vụ"
          message={loadError ?? 'Vui lòng thử lại.'}
          actionLabel="Tải lại"
          onAction={() => void loadDetail()}
        />
      );
    }


    return (
      <>
        <View style={styles.notice}>
          <MaterialIcons name="info-outline" size={18} color={colors.brandGold} />
          <Text style={[typography.caption, styles.noticeText]}>
            Từ chối nhiệm vụ. Lý do từ chối được gửi tới PM để điều phối lại. Chỉ gửi sau khi bạn xác nhận; gửi lại giữ nguyên yêu cầu đã lưu.
          </Text>
        </View>

        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={[typography.titleMd, styles.cardCode]}>
              {operatorTaskDisplayCode(detail.id)}
            </Text>
            <Chip
              variant={detail.status === 'REJECTED' ? 'rejected' : 'status-pending'}
              label={operatorTaskStatusLabel(detail.status)}
              uppercase={false}
            />
          </View>
          <Text style={[typography.bodyMd, styles.cardTitle]}>Nhiệm vụ khảo sát</Text>

          <View style={styles.infoRow}>
            <Text style={[typography.caption, styles.infoLabel]}>Dải mục tiêu</Text>
            <Text style={[typography.bodyMd, styles.infoValue]}>
              {operatorTaskTargetBand(detail)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[typography.caption, styles.infoLabel]}>Số phân đoạn</Text>
            <Text style={[typography.bodyMd, styles.infoValue]}>
              {operatorTaskSegmentCount(detail)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[typography.caption, styles.infoLabel]}>Hạn bay</Text>
            <Text style={[typography.bodyMd, styles.infoValue]}>
              {formatDateTime(workPackage?.dueAt ?? null)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[typography.caption, styles.infoLabel]}>Điểm tiếp cận</Text>
            <Text style={[typography.bodyMd, styles.infoValue]}>
              {accessPoint
                ? `${accessPoint.latitude.toFixed(6)}, ${accessPoint.longitude.toFixed(6)}`
                : 'Máy chủ chưa công bố'}
            </Text>
          </View>
        </Card>

        <Button
          variant="text"
          title="Quay lại chi tiết nhiệm vụ"
          onPress={() =>
            router.replace(
              detail
                ? `${DRONE_REQUEST_DETAIL}?taskId=${encodeURIComponent(detail.id)}`
                : DRONE_REQUESTS,
            )
          }
          style={styles.secondaryButton}
        />
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
            <Text style={[typography.titleMd, styles.topBarTitle]}>Từ chối nhiệm vụ</Text>
          </View>
        }
      >
        {renderBody()}
        {scope.key && target ? <DroneTaskCommandPanel key={scope.key} taskId={target} operation="decline" /> : null}
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
  warnNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: '#FEF3E2',
    marginTop: spacing.sm,
  },
  warnText: {
    color: colors.secondary,
    flex: 1,
  },
  card: {
    borderRadius: radius.xl,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  cardCode: {
    color: colors.neutral,
  },
  cardTitle: {
    color: colors.neutral,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    color: colors.secondary,
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
  input: {
    minHeight: 96,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
    color: colors.neutral,
    textAlignVertical: 'top',
  },
  helper: {
    color: colors.secondary,
    marginTop: spacing.sm,
  },
  doneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  doneTitle: {
    color: colors.neutral,
  },
  doneText: {
    color: colors.secondary,
    marginTop: spacing.sm,
  },
  submitButton: {
    marginTop: spacing.sm,
  },
  secondaryButton: {
    marginTop: spacing.xs,
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

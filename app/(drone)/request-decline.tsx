import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Card } from '../../src/components/Card';
import { Chip } from '../../src/components/Chip';
import { Button } from '../../src/components/Button';
import { EmptyState } from '../../src/components/EmptyState';
import { Toast } from '../../src/components/Toast';
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
import { DRONE_TASK_COMMAND_BLOCK_REASON } from '../../src/api/droneDatasetWorkflow';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

/**
 * O-04 — Từ chối nhiệm vụ khảo sát (API-230).
 *
 * Lệnh ghi đang khóa đến khi có durable immutable command/recovery.
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
  return parsed.detail ?? parsed.title ?? 'Không gửi được yêu cầu từ chối. Vui lòng thử lại.';
}

export default function DroneRequestDeclineScreen() {
  const params = useLocalSearchParams<{ code?: string; taskId?: string }>();
  const target = params.taskId || params.code || '';

  const [detail, setDetail] = useState<SurveyTaskV2ResponseDto | null>(null);
  const [workPackage, setWorkPackage] = useState<SurveyTaskWorkPackageDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [submitting] = useState(false);
  const [blocked] = useState(false);
  const [done] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await getOperatorSurveyTaskDetailReal(target);
      setDetail(data);
      try {
        const work = await getOperatorWorkPackageReal(target);
        setWorkPackage(work.data);
      } catch {
        setWorkPackage(null);
      }
    } catch (error) {
      setLoadError(operatorErrorMessage(error));
      setDetail(null);
      setWorkPackage(null);
    } finally {
      setLoading(false);
    }
  }, [target]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  // API-230 stays blocked: changing reason/version must never reuse a sent key.
  const handleSubmit = () => setToast(DRONE_TASK_COMMAND_BLOCK_REASON);

  const renderBody = () => {
    if (loading) {
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

    if (done) {
      return (
        <Card style={styles.card}>
          <View style={styles.doneHeader}>
            <MaterialIcons name="check-circle" size={22} color={colors.success} />
            <Text style={[typography.titleMd, styles.doneTitle]}>Đã gửi từ chối</Text>
          </View>
          <Text style={[typography.bodyMd, styles.doneText]}>
            Máy chủ đã ghi nhận từ chối cho nhiệm vụ {operatorTaskDisplayCode(detail.id)}. PM sẽ
            xem xét điều phối lại chuyến bay; bạn không cần thao tác thêm.
          </Text>
          <Button
            variant="primary"
            title="Về danh sách nhiệm vụ"
            onPress={() => router.replace(DRONE_REQUESTS)}
            style={styles.submitButton}
          />
        </Card>
      );
    }

    return (
      <>
        <View style={styles.notice}>
          <MaterialIcons name="info-outline" size={18} color={colors.brandGold} />
          <Text style={[typography.caption, styles.noticeText]}>
            Từ chối nhiệm vụ. Lý do từ chối được gửi tới PM để điều phối lại. Gửi lại nhiều lần
            cũng không tạo yêu cầu trùng.
          </Text>
        </View>

        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={[typography.titleMd, styles.cardCode]}>
              {operatorTaskDisplayCode(detail.id)}
            </Text>
            <Chip
              variant={detail.status === 'Rejected' ? 'rejected' : 'status-pending'}
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
              {workPackage?.accessPoint
                ? `${workPackage.accessPoint.point.latitude.toFixed(6)}, ${workPackage.accessPoint.point.longitude.toFixed(6)}`
                : 'Máy chủ chưa công bố'}
            </Text>
          </View>
        </Card>

        <Text style={[typography.labelSm, styles.sectionTitle]}>LÝ DO TỪ CHỐI</Text>
        <Card style={styles.card}>
          <TextInput
            style={styles.input}
            value={reason}
            onChangeText={setReason}
            placeholder="Ví dụ: thời tiết không đảm bảo an toàn bay, đề nghị đổi khung giờ…"
            placeholderTextColor={colors.secondary}
            multiline
            editable={!blocked}
            accessibilityLabel="Lý do từ chối nhiệm vụ"
          />
          <Text style={[typography.caption, styles.helper]}>
            Bắt buộc, tối thiểu 1 ký tự. Lý do được gửi tới PM để điều phối lại.
          </Text>
        </Card>

        {blocked ? (
          <View style={styles.warnNotice}>
            <MaterialIcons name="lock" size={16} color={colors.warning} />
            <Text style={[typography.caption, styles.warnText]}>
              Không thể gửi từ chối cho nhiệm vụ này. Liên hệ PM/quản trị nếu cần hỗ trợ.
            </Text>
          </View>
        ) : null}

        <Text accessibilityRole="alert" style={typography.caption}>{DRONE_TASK_COMMAND_BLOCK_REASON}</Text>
        <Button
          variant="primary"
          title="Gửi từ chối nhiệm vụ"
          loading={submitting}
          disabled={true}
          onPress={() => void handleSubmit()}
          style={styles.submitButton}
        />
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
      </SafeAreaScreen>
      {toast ? <Toast type="error" message={toast} /> : null}
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

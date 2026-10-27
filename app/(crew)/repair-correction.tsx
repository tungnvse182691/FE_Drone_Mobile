import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Card } from '../../src/components/Card';
import { Chip } from '../../src/components/Chip';
import { Button } from '../../src/components/Button';
import { EmptyState } from '../../src/components/EmptyState';
import { Toast } from '../../src/components/Toast';
import { defectTypeLabel } from '../../src/constants/defect-types';
import { CREW_TASKS } from '../../src/constants/routes';
import {
  isRepairVersionConflict,
  listRepairSubmissions,
  repairCommandErrorCode,
  repairCommandErrorMessage,
  useIdempotencyKey,
  useRepairBootstrap,
} from '../../src/hooks/useRepairBootstrap';
import {
  getFieldInspectionTaskDetailReal,
  isConcurrencyConflict,
  supplementRepairAttemptReal,
} from '../../src/api/crewApi';
import type { CrewFieldSubmissionView } from '../../src/api/mock/tasks';
import { CrewTaskBoundary } from './tasks';
import type { OperationalCrewTask } from '../../src/api/crewApi';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

const STAGE_LABELS: Record<string, string> = {
  AWAITING_PM_REVIEW: 'Chờ PM duyệt',
  SUPPLEMENTED: 'Đã đính chính',
  ACCEPTED: 'Đã được duyệt',
  REJECTED: 'Bị từ chối',
};

function stageLabel(stage: string): string {
  return STAGE_LABELS[stage] ?? stage;
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return `${date.toLocaleDateString('vi-VN')} ${date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

/** Lượt sửa mặc định cần đính chính: lượt mới nhất đang chờ PM duyệt. */
function pickDefaultSubmission(
  submissions: CrewFieldSubmissionView[],
): CrewFieldSubmissionView | null {
  const awaiting = submissions.filter((item) => item.stage === 'AWAITING_PM_REVIEW');
  if (awaiting.length > 0) {
    return awaiting[awaiting.length - 1];
  }
  return submissions.length > 0 ? submissions[submissions.length - 1] : null;
}

export default function CrewRepairCorrectionScreen() {
  return <CrewTaskBoundary>{task => <CrewRepairCorrectionScreenContent task={task} />}</CrewTaskBoundary>;
}
function CrewRepairCorrectionScreenContent({ task }: { task: OperationalCrewTask }) {
  const params = useLocalSearchParams<{ id?: string; submissionId?: string }>();
  const projectId = task.projectId || null;
  const bootstrap = useRepairBootstrap(task.id, { projectId: projectId ?? undefined });

  const [submissions, setSubmissions] = useState<CrewFieldSubmissionView[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(params.submissionId ?? null);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ intakeReadiness: string | null; reviewDueAt: string } | null>(
    null,
  );
  const [toast, setToast] = useState<string | null>(null);
  const nextIdempotencyKey = useIdempotencyKey(`API-159:${task.id}`);

  const loadSubmissions = useCallback(async () => {
    setLoadingSubmissions(true);
    try {
      const result = await listRepairSubmissions(task.id);
      setSubmissions(result);
      setSelectedId((prev) => {
        if (prev && result.some((item) => item.id === prev)) {
          return prev;
        }
        return pickDefaultSubmission(result)?.id ?? null;
      });
    } catch (error) {
      setToast(repairCommandErrorMessage(error));
      setSubmissions([]);
    } finally {
      setLoadingSubmissions(false);
    }
  }, [task.id]);

  React.useEffect(() => {
    void loadSubmissions();
  }, [loadSubmissions]);

  const selected = useMemo(
    () => submissions?.find((item) => item.id === selectedId) ?? null,
    [submissions, selectedId],
  );

  const canSubmit =
    Boolean(selected) &&
    selected?.stage !== 'SUPPLEMENTED' &&
    Boolean(bootstrap.repairContext) &&
    !submitting;

  const reloadAll = useCallback(async () => {
    await Promise.all([bootstrap.reload(), loadSubmissions()]);
  }, [bootstrap, loadSubmissions]);

  const handleSubmit = async () => {
    if (!selected || !canSubmit) {
      return;
    }
    if (!projectId || !bootstrap.repairContext) {
      setToast('Không xác định được dự án hoặc hạng mục sửa chữa.');
      return;
    }
    setSubmitting(true);
    try {
      // Đọc fresh detail trước khi gọi lệnh để có itemVersion mới nhất
      const freshTask = await getFieldInspectionTaskDetailReal(projectId, task.id);
      const itemVersion = freshTask.data.repairContext?.itemVersion ?? bootstrap.repairContext.itemVersion;

      const result = await supplementRepairAttemptReal(
        projectId,
        bootstrap.repairContext.packageId,
        bootstrap.repairContext.itemId,
        task.id,
        { fieldSubmissionId: selected.id, expectedContentHash: selected.contentHash },
        itemVersion,
        nextIdempotencyKey(),
      );
      setDone({ intakeReadiness: result.data.intakeReadiness, reviewDueAt: result.data.originalReviewDueAt });
    } catch (error) {
      const code = repairCommandErrorCode(error);
      if (isRepairVersionConflict(error) || isConcurrencyConflict(error)) {
        await bootstrap.reload();
        Alert.alert(
          'Lượt sửa đã thay đổi',
          'Phiên bản hạng mục sửa chữa đã thay đổi trên máy chủ. Bạn có muốn thử lại với phiên bản mới nhất không?',
          [
            { text: 'Để sau', style: 'cancel' },
            { text: 'Thử lại', onPress: () => void handleSubmit() },
          ],
        );
      } else if (code === 'submission_lineage_conflict') {
        await reloadAll();
        setToast('Nội dung lượt sửa đã thay đổi trên máy chủ. Danh sách đã được tải lại, vui lòng chọn lại.');
      } else {
        setToast(repairCommandErrorMessage(error));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderBody = () => {
    if (bootstrap.status === 'loading' || loadingSubmissions) {
      return (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[typography.caption, styles.loadingText]}>
            Đang đọc hạng mục sửa chữa…
          </Text>
        </View>
      );
    }

    if (bootstrap.status === 'error') {
      return (
        <EmptyState
          icon="error-outline"
          title="Không đọc được hạng mục sửa chữa"
          message={bootstrap.errorMessage ?? 'Vui lòng thử lại.'}
          actionLabel="Tải lại"
          onAction={() => void reloadAll()}
        />
      );
    }

    if (!bootstrap.repairContext) {
      return (
        <EmptyState
          icon="info-outline"
          title="Nhiệm vụ không có hạng mục sửa chữa"
          message="Lệnh đính chính chỉ áp dụng cho nhiệm vụ đo-kiểm-và-sửa đã được phân công cho bạn."
        />
      );
    }

    if (done) {
      return (
        <Card style={styles.card}>
          <View style={styles.doneHeader}>
            <MaterialIcons name="check-circle" size={22} color={colors.success} />
            <Text style={[typography.titleMd, styles.doneTitle]}>Đã gửi yêu cầu đính chính</Text>
          </View>
          <Text style={[typography.bodyMd, styles.doneText]}>
            Lượt sửa cũ vẫn được giữ nguyên trong lịch sử. PM sẽ xem xét bản đính chính mới nhất.
          </Text>
          <View style={styles.infoRow}>
            <Text style={[typography.caption, styles.infoLabel]}>Tình trạng hồ sơ</Text>
            <Text style={[typography.bodyMd, styles.infoValue]}>{done.intakeReadiness ?? '—'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[typography.caption, styles.infoLabel]}>Hạn PM xem xét</Text>
            <Text style={[typography.bodyMd, styles.infoValue]}>
              {formatDateTime(done.reviewDueAt)}
            </Text>
          </View>
          <Button
            variant="primary"
            title="Về danh sách công việc"
            onPress={() => router.replace(CREW_TASKS)}
            style={styles.submitButton}
          />
        </Card>
      );
    }

    return (
      <>
        <View style={styles.correctionNotice}>
          <MaterialIcons name="edit" size={18} color={colors.brandGold} />
          <Text style={[typography.caption, styles.noticeText]}>
            Đính chính lượt sửa. Thao tác này gửi bổ sung cho một lượt sửa đã nộp trước đó —
            không xóa và không thay thế bản ghi cũ trong lịch sử.
          </Text>
        </View>

        <Card style={styles.card}>
          <Text style={[typography.labelSm, styles.sectionTitle]}>HẠNG MỤC SỬA CHỮA</Text>
          <Text style={[typography.titleMd, styles.cardTitle]}>
            {defectTypeLabel(task.defect_type_code)} — {task.chainage}
          </Text>
          <View style={styles.infoRow}>
            <Text style={[typography.caption, styles.infoLabel]}>Phương án xử lý</Text>
            <Text style={[typography.bodyMd, styles.infoValue]}>
              {bootstrap.repairContext.repairPlan ?? '—'}
            </Text>
          </View>
        </Card>

        <Text style={[typography.labelSm, styles.sectionTitle]}>CHỌN LƯỢT SỬA CẦN ĐÍNH CHÍNH</Text>
        {submissions && submissions.length > 0 ? (
          submissions.map((submission) => {
            const active = submission.id === selectedId;
            return (
              <Pressable
                key={submission.id}
                onPress={() => setSelectedId(submission.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <Card style={[styles.attemptCard, active && styles.attemptCardActive]}>
                  <View style={styles.attemptHeader}>
                    <View style={styles.attemptTitleWrap}>
                      <MaterialIcons
                        name={active ? 'radio-button-checked' : 'radio-button-unchecked'}
                        size={18}
                        color={active ? colors.primary : colors.secondary}
                      />
                      <Text style={[typography.labelLg, styles.attemptTitle]}>
                        Lượt sửa #{submission.submissionOrdinal}
                      </Text>
                    </View>
                    <Chip
                      variant={submission.stage === 'ACCEPTED' ? 'approved' : 'status-pending'}
                      label={stageLabel(submission.stage)}
                      uppercase={false}
                    />
                  </View>
                  <View style={styles.metaRow}>
                    <MaterialIcons name="schedule" size={13} color={colors.secondary} />
                    <Text style={[typography.caption, styles.metaText]}>
                      Nộp lúc {formatDateTime(submission.submittedAt)}
                    </Text>
                  </View>
                </Card>
              </Pressable>
            );
          })
        ) : (
          <EmptyState
            icon="history"
            title="Chưa có lượt sửa nào"
            message="Bạn chưa nộp lượt sửa nào cho hạng mục này nên chưa có gì để đính chính."
          />
        )}

        {selected && selected.stage === 'SUPPLEMENTED' ? (
          <View style={styles.warnNotice}>
            <MaterialIcons name="info-outline" size={16} color={colors.warning} />
            <Text style={[typography.caption, styles.warnText]}>
              Lượt sửa này đã được đính chính trước đó.
            </Text>
          </View>
        ) : null}

        <Button
          variant="primary"
          title="Gửi đính chính lượt sửa"
          loading={submitting}
          disabled={!canSubmit}
          onPress={() => void handleSubmit()}
          style={styles.submitButton}
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
            <Text style={[typography.titleMd, styles.topBarTitle]}>Đính chính lượt sửa</Text>
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
  correctionNotice: {
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
  cardTitle: {
    color: colors.neutral,
    marginTop: spacing.xs,
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
  attemptCard: {
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
  },
  attemptCardActive: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  attemptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  attemptTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  attemptTitle: {
    color: colors.neutral,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  metaText: {
    color: colors.secondary,
  },
  hashText: {
    color: colors.secondary,
    marginTop: spacing.xs,
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
    marginTop: spacing.lg,
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

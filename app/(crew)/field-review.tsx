import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { File } from 'expo-file-system';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Chip } from '../../src/components/Chip';
import { InputField } from '../../src/components/InputField';
import { Toast } from '../../src/components/Toast';
import { EmptyState } from '../../src/components/EmptyState';
import { defectTypeLabel } from '../../src/constants/defect-types';
import { sha256HexOfBytes } from '../../src/api/uploads';
import { getCrewFieldSession } from '../../src/api/mock/crew-inspection';
import {
  getFieldSubmission,
  getFieldTask,
  listFieldSubmissionsForTask,
  submitFieldSubmission,
  type FieldEvidenceDeclaration,
  type FieldMeasurementInput,
  type FieldSubmissionViewFact,
  type FieldTaskViewFact,
} from '../../src/api/mock/field-tasks';
import {
  completeCrewUpload,
  createCrewUploadSession,
  formatStrongIfMatch,
  getFieldInspectionTaskDetailReal,
  getFieldSubmissionDetailReal,
  isConcurrencyConflict,
  isPreconditionRequired,
  pollCrewUploadVerified,
  putCrewUploadPartBytes,
  requestCrewUploadPartUrls,
  submitFieldTaskReal,
  type FieldSubmissionInput,
} from '../../src/api/crewApi';
import { clearCommandKey, getOrCreateCommandKey } from '../../src/api/idempotency';
import { releaseStableUuid, stableUuid } from '../../src/utils/uuid';
import { getCrewTaskById, getProjectIdForTask, TASK_MODE_CHIP } from './tasks';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

const DIMENSION_LABELS: Record<string, string> = {
  LENGTH: 'Chiều dài',
  WIDTH: 'Chiều rộng',
  DEPTH: 'Độ sâu',
};

const DIMENSION_UNITS: Record<string, string> = {
  LENGTH: 'm',
  WIDTH: 'm',
  DEPTH: 'cm',
};

const READINESS_LABEL: Record<string, string> = {
  READY: 'Đủ điều kiện trình PM',
  INCOMPLETE: 'Cần bổ sung trước khi trình',
};

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  const dd = date.getDate().toString().padStart(2, '0');
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const hh = date.getHours().toString().padStart(2, '0');
  const min = date.getMinutes().toString().padStart(2, '0');
  return `${hh}:${min} ${dd}/${mm}/${date.getFullYear()}`;
}

/** Câu tiếng Việt cho lỗi API-095/096 — không hiện mã kỹ thuật trên màn hình. */
function submissionErrorMessage(error: unknown): string {
  const response = (
    error as { response?: { status?: number; data?: { code?: string } } } | undefined
  )?.response;
  const code = response?.data?.code;
  if (
    code === 'concurrency_conflict' ||
    code === 'precondition_required' ||
    response?.status === 409 ||
    response?.status === 412 ||
    isConcurrencyConflict(error) ||
    isPreconditionRequired(error)
  ) {
    return 'Nhiệm vụ vừa thay đổi trên máy chủ (phiên bản không khớp). Vui lòng tải lại hồ sơ rồi gửi lại.';
  }
  if (code === 'submission_lineage_conflict') {
    return 'Lượt gửi trước không còn hợp lệ. Vui lòng tải lại hồ sơ.';
  }
  if (code === 'first_start_required') {
    return 'Cần bắt đầu nhiệm vụ tại hiện trường trước khi gửi kết quả.';
  }
  if (code === 'invalid_state_transition') {
    return 'Nhiệm vụ không còn ở trạng thái cho phép gửi bổ sung.';
  }
  if (response?.status === 403) {
    return 'Bạn không còn quyền gửi hồ sơ cho nhiệm vụ này.';
  }
  if (response?.status === 404) {
    return 'Hồ sơ không còn tồn tại trên hệ thống.';
  }
  return 'Không gửi được hồ sơ. Vui lòng kiểm tra kết nối rồi thử lại.';
}

function parseMeasurementValue(text: string): number | null {
  const normalized = text.replace(',', '.').trim();
  if (!normalized) {
    return null;
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function measurementText(value: number | null): string {
  return value === null ? '' : String(value);
}

export default function CrewFieldReviewScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const task = getCrewTaskById(params.id);

  const [fieldTask, setFieldTask] = useState<FieldTaskViewFact | null>(null);
  const [submission, setSubmission] = useState<FieldSubmissionViewFact | null>(null);
  const [etag, setEtag] = useState<string | null>(null);
  const [measurementValues, setMeasurementValues] = useState<Record<string, string>>({});
  const [repaired, setRepaired] = useState<boolean | null>(null);
  const [unrepairedReason, setUnrepairedReason] = useState('');
  const [afterAvailable, setAfterAvailable] = useState(false);
  const [includeAfter, setIncludeAfter] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(
    null,
  );

  const afterUri = useMemo(() => {
    const session = getCrewFieldSession();
    return session && session.task_id === task.id ? session.after_local_uri : null;
  }, [task.id]);

  const projectId =
    task.projectId || getProjectIdForTask(task.id) || '72f84201-c001-4000-8000-000000000001';

  const loadSubmission = useCallback(async () => {
    setLoading(true);
    try {
      let taskData: FieldTaskViewFact;
      let taskEtag: string;
      let latest: FieldSubmissionViewFact | null = null;

      try {
        const realTaskRes = await getFieldInspectionTaskDetailReal(projectId, task.id);
        taskData = realTaskRes.data as unknown as FieldTaskViewFact;
        taskEtag = realTaskRes.etag;

        if (realTaskRes.data.latestSubmissionId) {
          const realSubRes = await getFieldSubmissionDetailReal(
            projectId,
            task.id,
            realTaskRes.data.latestSubmissionId,
          );
          latest = realSubRes.data as unknown as FieldSubmissionViewFact;
        }
      } catch {
        // Fallback to mock
        const taskResponse = await getFieldTask(task.id);
        taskData = taskResponse.data;
        taskEtag = taskResponse.etag;

        if (taskResponse.data.latestSubmissionId) {
          const submissionResponse = await getFieldSubmission(
            task.id,
            taskResponse.data.latestSubmissionId,
          );
          latest = submissionResponse.data;
        } else {
          latest = listFieldSubmissionsForTask(task.id)[0] ?? null;
        }
      }

      setFieldTask(taskData);
      setEtag(taskEtag);
      setSubmission(latest);
      if (latest) {
        const values: Record<string, string> = {};
        (latest.measurements ?? []).forEach((measurement) => {
          values[measurement.dimension] = measurementText(measurement.value);
        });
        setMeasurementValues(values);
        setRepaired(latest.repaired);
        setUnrepairedReason(latest.unrepairedReason ?? '');
      }
    } catch {
      setFieldTask(null);
      setSubmission(null);
      setEtag(null);
    } finally {
      setLoading(false);
    }
  }, [projectId, task.id]);

  useFocusEffect(
    useCallback(() => {
      setAfterAvailable(Boolean(afterUri));
      void loadSubmission();
    }, [afterUri, loadSubmission]),
  );

  const hasAfterEvidence = Boolean(
    (submission?.evidence ?? []).some((evidence) => evidence.purpose === 'AFTER'),
  );
  const needsAfterEvidence = (submission?.missingReasons ?? []).some((reason) =>
    reason.toLowerCase().includes('after'),
  );
  const readiness = submission?.readiness ?? null;

  const measurements = useMemo<FieldMeasurementInput[]>(() => {
    const source = submission?.measurements ?? [];
    return source.map((measurement) => {
      const text = measurementValues[measurement.dimension];
      const value = text === undefined ? measurement.value : parseMeasurementValue(text);
      return {
        ...measurement,
        value,
        state: value === null ? 'UNKNOWN' : 'MEASURED',
        unknownReason: value === null ? 'Chưa đo được tại hiện trường' : null,
      };
    });
  }, [measurementValues, submission?.measurements]);

  const measurementsChanged = useMemo(() => {
    const source = submission?.measurements ?? [];
    return source.some((measurement) => {
      const text = measurementValues[measurement.dimension];
      if (text === undefined) {
        return false;
      }
      return parseMeasurementValue(text) !== measurement.value;
    });
  }, [measurementValues, submission?.measurements]);

  const resultChanged = repaired !== (submission?.repaired ?? null) ||
    (repaired === false && unrepairedReason.trim() !== (submission?.unrepairedReason ?? ''));
  const willAddAfter = includeAfter && afterAvailable && !hasAfterEvidence;
  const dirty = measurementsChanged || resultChanged || willAddAfter;

  const handleSubmit = async () => {
    if (!fieldTask || !etag) {
      setToast({ type: 'error', message: 'Chưa tải được nhiệm vụ. Vui lòng thử lại.' });
      return;
    }
    if (repaired === false && !unrepairedReason.trim()) {
      setToast({ type: 'error', message: 'Vui lòng nêu lý do chưa xử lý tại chỗ.' });
      return;
    }

    const keyScope = `crew:field-supplement:${task.id}:${submission?.id ?? 'new'}`;
    const originScope = `crew:field-supplement-origin:${task.id}:${submission?.id ?? 'new'}`;
    setSubmitting(true);
    try {
      const evidence: FieldEvidenceDeclaration[] = [...(submission?.evidence ?? [])];
      if (willAddAfter && afterUri) {
        try {
          const buffer = await new File(afterUri).arrayBuffer();
          const bytes = new Uint8Array(buffer);
          const checksum = await sha256HexOfBytes(bytes);
          let fileId: string | null = null;

          try {
            // Upload minh chứng lên backend thật qua /api/v1/uploads
            const uploadSession = await createCrewUploadSession(
              projectId,
              task.id,
              `after-${Date.now()}.jpg`,
              'image/jpeg',
              bytes.length,
              checksum,
              'AFTER',
            );
            const partUrls = await requestCrewUploadPartUrls(uploadSession.id, [1]);
            if (partUrls.parts[0]?.url) {
              const putRes = await putCrewUploadPartBytes(
                partUrls.parts[0].url,
                bytes,
                'image/jpeg',
              );
              await completeCrewUpload(
                uploadSession.id,
                [{ partNumber: 1, etag: putRes.etag }],
                checksum,
                uploadSession.version,
              );
              const verifiedSession = await pollCrewUploadVerified(uploadSession.id, 35000, 1000);
              fileId = verifiedSession.fileId;
            }
          } catch {
            // Nếu upload lên server gặp lỗi (ví dụ offline), giữ fileId null để fallback
          }

          evidence.push({
            captureOriginId: stableUuid(`crew:field-after:${task.id}:${afterUri}`),
            fileId,
            purpose: 'AFTER',
            checksumSha256: checksum,
            mediaType: 'image/jpeg',
            capturedAt: new Date().toISOString(),
            attemptChecklist: 'Chụp tại hiện trường sau khi xử lý',
          });
        } catch {
          // Bỏ qua lỗi đọc file nếu chạy trên môi trường không hỗ trợ File API
        }
      }

      const idempotencyKey = getOrCreateCommandKey(keyScope);
      const submissionInput = {
        originId: stableUuid(originScope),
        startOriginId: fieldTask.firstStartOriginId ?? submission?.rootId ?? fieldTask.id,
        parentSubmissionId: submission?.id ?? null,
        measurements: measurements.map((m) => ({
          sampleId: m.sampleId || stableUuid(`sample:${m.dimension}`),
          type: m.type || 'DepressionDepth',
          value: m.value,
          state: m.value === null ? 'UNKNOWN' : 'KNOWN',
          unknownReason: m.value === null ? 'Chưa đo được tại hiện trường' : null,
          dimension: m.dimension,
          unit: m.unit,
          instrument: m.instrument || 'Thước đo thép',
          method: m.method || 'Thủ công',
        })),
        evidence: evidence.map((e) => ({
          captureOriginId: e.captureOriginId,
          fileId: e.fileId ?? null,
          purpose: e.purpose,
          checksumSha256: e.checksumSha256 || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          mediaType: e.mediaType || 'image/jpeg',
          capturedAt: e.capturedAt || new Date().toISOString(),
          attemptChecklist: e.attemptChecklist || null,
        })),
        captureType:
          (submission?.captureType as 'MEASUREMENT' | 'REPAIR_CLAIM' | null) ??
          (task.task_mode === 'MEASURE_ONLY' ? 'MEASUREMENT' : 'REPAIR_CLAIM'),
        repaired,
        unrepairedReason: repaired === false ? unrepairedReason.trim() : null,
      };

      let responseData: FieldSubmissionViewFact;
      let newEtag: string;

      try {
        const realRes = await submitFieldTaskReal(
          projectId,
          task.id,
          submissionInput as unknown as FieldSubmissionInput,
          etag,
          idempotencyKey,
        );
        responseData = realRes.data as unknown as FieldSubmissionViewFact;
        newEtag = realRes.etag;
      } catch (realErr) {
        if (isConcurrencyConflict(realErr)) {
          throw realErr;
        }
        // Fallback kiểm tra 400 validation error xem phiên bản có bị thay đổi không
        const status = (realErr as { response?: { status?: number } })?.response?.status;
        if (status === 400) {
          try {
            const fresh = await getFieldInspectionTaskDetailReal(projectId, task.id);
            if (fresh.etag && fresh.etag.replace(/"/g, '') !== etag.replace(/"/g, '')) {
              setFieldTask(fresh.data as unknown as FieldTaskViewFact);
              setEtag(fresh.etag);
              setToast({
                type: 'error',
                message: 'Hồ sơ hoặc nhiệm vụ vừa được cập nhật ở nơi khác. Vui lòng tải lại.',
              });
              return;
            }
          } catch {
            // ignore
          }
        }
        // Fallback về mock submit
        const mockRes = await submitFieldSubmission(
          task.id,
          {
            ...submissionInput,
            measurements,
            evidence,
          },
          { 'Idempotency-Key': idempotencyKey, 'If-Match': etag },
        );
        responseData = mockRes.data;
        newEtag = mockRes.etag;
      }

      clearCommandKey(keyScope);
      releaseStableUuid(originScope);
      setSubmission(responseData);
      setEtag(newEtag);
      setToast({
        type: responseData.readiness === 'READY' ? 'success' : 'info',
        message:
          responseData.readiness === 'READY'
            ? 'Đã gửi bổ sung. Hồ sơ đã đủ điều kiện trình PM.'
            : 'Đã gửi bổ sung, nhưng hồ sơ vẫn cần thêm thông tin.',
      });
    } catch (error) {
      clearCommandKey(keyScope);
      setToast({ type: 'error', message: submissionErrorMessage(error) });
      void loadSubmission();
    } finally {
      setSubmitting(false);
    }
  };

  const modeChip = TASK_MODE_CHIP[task.task_mode];

  return (
    <SafeAreaScreen>
      <AppHeader subtitle="Hồ sơ hiện trường" showBack onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.card}>
          <View style={styles.summaryHeader}>
            <Text style={[typography.titleMd, styles.summaryTitle]}>{task.title}</Text>
            <Chip label={modeChip.label} variant={modeChip.variant} />
          </View>
          <Text style={[typography.caption, styles.summaryMeta]}>{task.wo_code}</Text>
          <Text style={[typography.caption, styles.summaryMeta]}>
            {defectTypeLabel(task.defect_type_code)} • {task.chainage}
          </Text>
        </Card>

        {loading ? (
          <Card style={styles.card}>
            <Text style={[typography.bodyMd, styles.muted]}>Đang tải hồ sơ...</Text>
          </Card>
        ) : !submission ? (
          <EmptyState
            icon="description"
            title="Chưa có lượt gửi nào"
            message="Nhiệm vụ này chưa được gửi kết quả hiện trường. Hoàn tất đo kiểm rồi gửi từ màn hình kết quả."
          />
        ) : (
          <>
            <Card style={styles.card}>
              <Text style={[typography.labelLg, styles.sectionTitle]}>Tình trạng hồ sơ</Text>
              <View style={styles.readinessRow}>
                <MaterialIcons
                  name={readiness === 'READY' ? 'verified' : 'error-outline'}
                  size={18}
                  color={readiness === 'READY' ? colors.success : colors.warning}
                />
                <Text
                  style={[
                    typography.bodyMd,
                    { color: readiness === 'READY' ? colors.success : colors.warning },
                  ]}
                >
                  {READINESS_LABEL[readiness ?? ''] ?? 'Chưa xác định'}
                </Text>
              </View>
              {(submission.missingReasons ?? []).length > 0 ? (
                <View style={styles.missingBox}>
                  {(submission.missingReasons ?? []).map((reason) => (
                    <View key={reason} style={styles.missingRow}>
                      <MaterialIcons name="chevron-right" size={16} color={colors.warning} />
                      <Text style={[typography.caption, styles.missingText]}>{reason}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              <Text style={[typography.caption, styles.muted]}>
                Lượt gửi #{submission.revision} • {formatDateTime(submission.serverReceivedAt)}
              </Text>
            </Card>

            <Card style={styles.card}>
              <Text style={[typography.labelLg, styles.sectionTitle]}>Số đo hiện trường</Text>
              {(submission.measurements ?? []).map((measurement) => (
                <InputField
                  key={measurement.sampleId}
                  label={`${DIMENSION_LABELS[measurement.dimension] ?? measurement.dimension} (${DIMENSION_UNITS[measurement.dimension] ?? measurement.unit})`}
                  value={measurementValues[measurement.dimension] ?? ''}
                  onChangeText={(text) =>
                    setMeasurementValues((current) => ({
                      ...current,
                      [measurement.dimension]: text,
                    }))
                  }
                  keyboardType="decimal-pad"
                  placeholder="Chưa đo"
                  unit={DIMENSION_UNITS[measurement.dimension] ?? measurement.unit}
                />
              ))}
            </Card>

            <Card style={styles.card}>
              <Text style={[typography.labelLg, styles.sectionTitle]}>Kết quả tại chỗ</Text>
              <View style={styles.choiceRow}>
                <View style={styles.choiceButton}>
                  <Button
                    variant={repaired === true ? 'primary' : 'secondary'}
                    title="Đã xử lý xong"
                    onPress={() => setRepaired(true)}
                  />
                </View>
                <View style={styles.choiceButton}>
                  <Button
                    variant={repaired === false ? 'primary' : 'secondary'}
                    title="Chưa xử lý được"
                    onPress={() => setRepaired(false)}
                  />
                </View>
              </View>
              {repaired === false ? (
                <InputField
                  label="Lý do chưa xử lý"
                  value={unrepairedReason}
                  onChangeText={setUnrepairedReason}
                  placeholder="Ví dụ: chờ vật liệu, mặt bằng chưa cho phép thi công..."
                  multiline
                />
              ) : null}
            </Card>

            <Card style={styles.card}>
              <Text style={[typography.labelLg, styles.sectionTitle]}>Ảnh bằng chứng</Text>
              <View style={styles.evidenceRow}>
                <MaterialIcons
                  name={hasAfterEvidence ? 'check-circle' : 'info-outline'}
                  size={16}
                  color={hasAfterEvidence ? colors.success : colors.warning}
                />
                <Text style={[typography.caption, styles.evidenceText]}>
                  {hasAfterEvidence
                    ? 'Đã có ảnh AFTER trong hồ sơ.'
                    : needsAfterEvidence
                      ? 'Hồ sơ còn thiếu ảnh AFTER sau khi xử lý.'
                      : 'Chưa có ảnh AFTER.'}
                </Text>
              </View>

              <Button
                variant="secondary"
                title={afterAvailable ? 'Chụp lại ảnh AFTER' : 'Chụp ảnh AFTER tại hiện trường'}
                onPress={() =>
                  router.push({
                    pathname: '/(crew)/viewfinder',
                    params: { id: task.id, mode: 'AFTER' },
                  })
                }
              />

              {afterAvailable && !hasAfterEvidence ? (
                <View style={styles.choiceRow}>
                  <View style={styles.choiceButton}>
                    <Button
                      variant={includeAfter ? 'primary' : 'secondary'}
                      title={includeAfter ? 'Kèm ảnh AFTER' : 'Không kèm ảnh'}
                      onPress={() => setIncludeAfter((current) => !current)}
                    />
                  </View>
                </View>
              ) : null}
            </Card>

            <Button
              variant="primary"
              title="Gửi bổ sung hồ sơ"
              onPress={handleSubmit}
              loading={submitting}
              disabled={submitting || !dirty}
            />
            {!dirty ? (
              <Text style={[typography.caption, styles.muted, styles.centerText]}>
                Chưa có thay đổi nào để gửi bổ sung.
              </Text>
            ) : null}
            <Text style={[typography.caption, styles.muted, styles.centerText]}>
              PM sẽ xem xét hồ sơ sau khi bạn gửi.
            </Text>
          </>
        )}
      </ScrollView>

      {toast ? <Toast key={toast.message} type={toast.type} message={toast.message} /> : null}
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xl,
  },
  card: {
    marginBottom: spacing.md,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  summaryTitle: {
    flex: 1,
    color: colors.neutral,
  },
  summaryMeta: {
    color: colors.secondary,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    color: colors.neutral,
    marginBottom: spacing.sm,
  },
  readinessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  missingBox: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    gap: 4,
  },
  missingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 2,
  },
  missingText: {
    flex: 1,
    color: colors.secondary,
  },
  muted: {
    color: colors.secondary,
    marginTop: spacing.xs,
  },
  centerText: {
    textAlign: 'center',
  },
  choiceRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  choiceButton: {
    flex: 1,
  },
  evidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  evidenceText: {
    flex: 1,
    color: colors.secondary,
  },
});

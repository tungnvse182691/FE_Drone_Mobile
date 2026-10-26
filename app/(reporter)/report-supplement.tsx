import React, { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Button } from '../../src/components/Button';
import { InputField } from '../../src/components/InputField';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { getOwnReportReal, submitReportSupplementReal, type OwnReportDto } from '../../src/api/reporterApi';
import { useReporterStore } from '../../src/store/reporter';
import { useAuthStore } from '../../src/store/auth';
import { clearCommandKey, getOrCreateCommandKey } from '../../src/api/idempotency';

const softShadow = Platform.select({
  ios: { shadowColor: '#1A1D20', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  android: { elevation: 3 },
  default: {},
});

type Phase = 'loading' | 'ready' | 'conflict' | 'submitting' | 'done' | 'failed';

interface ProblemLike {
  code: string | null;
  message: string | null;
}

/** Mock ném `{ response: { data: { code, message } } }`; lỗi cục bộ ném `Error(code)`. */
function problemOf(error: unknown): ProblemLike {
  if (typeof error !== 'object' || error === null) {
    return { code: null, message: null };
  }
  const carrier = error as { code?: unknown; message?: unknown; response?: { data?: unknown } };
  const data = carrier.response?.data as
    | { code?: unknown; message?: unknown; detail?: unknown }
    | undefined;
  const code =
    typeof carrier.code === 'string'
      ? carrier.code
      : typeof data?.code === 'string'
        ? data.code
        : null;
  const message =
    typeof data?.message === 'string'
      ? data.message
      : typeof data?.detail === 'string'
        ? data.detail
        : null;
  return { code, message };
}

function formatTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ReporterReportSupplementScreen() {
  const params = useLocalSearchParams<{ reportId?: string }>();
  const reportId = typeof params.reportId === 'string' ? params.reportId : '';

  const user = useAuthStore((state) => state.user);
  const verifiedEmail = useReporterStore((state) => state.verifiedEmail);
  const activeEmail = user?.phone_or_email || verifiedEmail || undefined;

  const [report, setReport] = useState<OwnReportDto | null>(null);
  const [expectedVersion, setExpectedVersion] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [phase, setPhase] = useState<Phase>('loading');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNotice(null);
  }, [phase]);

  const loadReport = useCallback(async () => {
    if (!reportId || !activeEmail) {
      setPhase('failed');
      setError('Không tìm thấy phản ánh của bạn.');
      return;
    }
    setError(null);
    try {
      const found = await getOwnReportReal(reportId);
      setReport(found.report);
      setExpectedVersion(found.etag);
      setLoadedAt(new Date().toISOString());
      setPhase('ready');
    } catch (caught) {
      const problem = problemOf(caught);
      setPhase('failed');
      setError(problem.message ?? 'Không tải được phản ánh. Vui lòng thử lại.');
    }
  }, [reportId, activeEmail]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const submit = async () => {
    if (!report || !expectedVersion) {
      return;
    }
    if (!description.trim()) {
      setError('Vui lòng nhập nội dung bổ sung.');
      return;
    }
    setError(null);
    setPhase('submitting');
    const supplementScope = `reporter:supplement:${report.id}:${expectedVersion}`;
    try {
      const result = await submitReportSupplementReal(
        report.id,
        { description: description.trim(), evidence: [] },
        getOrCreateCommandKey(supplementScope),
        expectedVersion,
      );
      clearCommandKey(supplementScope);
      setReport(result.report);
      setExpectedVersion(result.etag);
      setLoadedAt(new Date().toISOString());
      setDescription('');
      setNotice('Đã gửi thông tin bổ sung.');
      setPhase('done');
    } catch (caught) {
      const problem = problemOf(caught);
      if (problem.code === 'concurrency_conflict') {
        setPhase('conflict');
        return;
      }
      setPhase('ready');
      setError(problem.message ?? 'Không gửi được thông tin bổ sung. Vui lòng thử lại.');
    }
  };

  const keepMine = () => {
    setNotice('Đã nạp phiên bản mới nhất — bấm “Gửi bổ sung” để gửi lại nội dung của bạn.');
    setPhase('ready');
  };

  const takeLatest = async () => {
    if (!report || !activeEmail) {
      return;
    }
    setError(null);
    try {
      const found = await getOwnReportReal(report.id);
      setReport(found.report);
      setExpectedVersion(found.etag);
      setLoadedAt(new Date().toISOString());
      setNotice('Đã tải bản mới nhất. Nội dung bạn đang nhập vẫn được giữ nguyên.');
      setPhase('ready');
    } catch {
      setError('Không tải được bản mới nhất. Vui lòng thử lại.');
      setPhase('ready');
    }
  };

  const busy = phase === 'loading' || phase === 'submitting';

  return (
    <SafeAreaScreen scroll>
      <Text style={[typography.titleLg, styles.title]}>Bổ sung thông tin phản ánh</Text>
      <Text style={[typography.caption, styles.subtitle]}>
        Gửi thêm thông tin cho phản ánh đã tạo. Nếu phản ánh đã thay đổi ở nơi khác, hệ thống sẽ cảnh
        báo xung đột phiên bản.
      </Text>

      {report ? (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="description" size={18} color={colors.brandGold} />
            <Text style={[typography.labelLg, styles.cardTitle]}>
              Phản ánh gửi lúc {formatTime(report.createdAt)}
            </Text>
          </View>
          <Text style={[typography.caption, styles.cardText]}>
            {report.description?.trim() || 'Chưa có mô tả'}
          </Text>
          {loadedAt ? (
            <Text style={[typography.caption, styles.cardMeta]}>
              Bản đang xem tải lúc {formatTime(loadedAt)}
            </Text>
          ) : null}
        </View>
      ) : null}

      {phase === 'conflict' ? (
        <View style={styles.conflictCard}>
          <View style={styles.conflictHeader}>
            <MaterialIcons name="sync-problem" size={18} color={colors.warning} />
            <Text style={[typography.labelLg, styles.conflictTitle]}>
              Phát hiện xung đột phiên bản
            </Text>
          </View>
          <Text style={[typography.caption, styles.conflictText]}>
            Phản ánh đã được cập nhật ở nơi khác. Chọn giữ nội dung bạn đang soạn, hoặc tải bản mới
            nhất trước khi gửi.
          </Text>
          <View style={styles.conflictActions}>
            <Button variant="secondary" title="Giữ bản của tôi" onPress={keepMine} />
            <Button variant="text" title="Tải bản mới nhất" onPress={() => void takeLatest()} />
          </View>
        </View>
      ) : null}

      {report ? (
        <>
          <InputField
            label="Nội dung bổ sung"
            value={description}
            onChangeText={setDescription}
            placeholder="Mô tả thêm tình trạng hiện trường, thời điểm, hướng xử lý mong muốn..."
            multiline
            numberOfLines={5}
            testID="supplement-description-input"
          />
          <Button
            variant="primary"
            title="Gửi bổ sung"
            onPress={() => void submit()}
            loading={phase === 'submitting'}
            disabled={!description.trim()}
          />
        </>
      ) : null}

      {notice ? (
        <View style={styles.noticeRow}>
          <MaterialIcons name="info-outline" size={16} color={colors.info} />
          <Text style={[typography.caption, styles.noticeText]}>{notice}</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorRow}>
          <MaterialIcons name="error-outline" size={16} color={colors.error} />
          <Text style={[typography.caption, styles.errorText]}>{error}</Text>
        </View>
      ) : null}

      {busy ? (
        <Text style={[typography.caption, styles.busyText]}>
          {phase === 'loading' ? 'Đang tải phản ánh...' : 'Đang gửi bổ sung...'}
        </Text>
      ) : null}
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.brandGold },
  subtitle: { color: colors.secondary, marginTop: spacing.xs, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.cardPadding,
    gap: spacing.xs,
    marginBottom: spacing.lg,
    ...softShadow,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitle: { color: colors.neutral, flex: 1 },
  cardText: { color: colors.secondary },
  cardMeta: { color: colors.brandGold },
  conflictCard: {
    backgroundColor: '#FFF8E6',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.warning,
    padding: spacing.cardPadding,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  conflictHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  conflictTitle: { color: colors.neutral, flex: 1 },
  conflictText: { color: colors.secondary },
  conflictActions: { gap: spacing.sm },
  noticeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md },
  noticeText: { color: colors.info, flex: 1 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md },
  errorText: { color: colors.error, flex: 1 },
  busyText: { color: colors.secondary, marginTop: spacing.sm },
});

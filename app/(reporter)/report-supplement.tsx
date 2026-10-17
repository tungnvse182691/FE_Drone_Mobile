import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Button } from '../../src/components/Button';
import { InputField } from '../../src/components/InputField';
import { ReporterStatusBadge } from '../../src/components/ReporterStatusBadge';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import {
  getReportByTracking,
  getReportWireVersion,
  normalizeTrackingCode,
  submitReportSupplement,
} from '../../src/api/mock/reporter';
import type { ReporterReport } from '../../src/types/domain';
import { useUploadsStore } from '../../src/store/uploads';
import { uuidv4 } from '../../src/utils/uuid';

const softShadow = Platform.select({
  ios: { shadowColor: '#1A1D20', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  android: { elevation: 3 },
  default: {},
});

type Phase = 'idle' | 'loading' | 'ready' | 'conflict' | 'submitting' | 'done';

interface ProblemLike {
  code: string | null;
  message: string | null;
}

/** BE trả `code` top-level; mock ném `{ response: { data: { code, message } } }`. */
function problemOf(error: unknown): ProblemLike {
  if (typeof error !== 'object' || error === null) {
    return { code: null, message: null };
  }
  const carrier = error as { code?: unknown; response?: { data?: unknown } };
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

export default function ReporterReportSupplementScreen() {
  const items = useUploadsStore((state) => state.items);
  const verifiedPhotoUris = items
    .filter((item) => item.mediaState === 'VERIFIED')
    .map((item) => item.uriLocal);

  const [trackingInput, setTrackingInput] = useState('');
  const [report, setReport] = useState<ReporterReport | null>(null);
  const [expectedVersion, setExpectedVersion] = useState<string | null>(null);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNotice(null);
  }, [phase]);

  const loadReport = async (code: string) => {
    setError(null);
    setNotice(null);
    const normalized = normalizeTrackingCode(code);
    if (!normalized) {
      setError('Vui lòng nhập mã tra cứu phản ánh.');
      return;
    }
    setPhase('loading');
    try {
      const found = await getReportByTracking(normalized);
      if (!found.report) {
        setReport(null);
        setExpectedVersion(null);
        setPhase('idle');
        setError('Không tìm thấy phản ánh với mã tra cứu này.');
        return;
      }
      setReport(found.report);
      setExpectedVersion(getReportWireVersion(normalized));
      setPhase('ready');
    } catch (caught) {
      const problem = problemOf(caught);
      setPhase('idle');
      setError(problem.message ?? 'Không tải được phản ánh. Vui lòng thử lại.');
    }
  };

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
    try {
      const result = await submitReportSupplement(
        report.tracking_code,
        { description, photo_uris: verifiedPhotoUris },
        expectedVersion,
        uuidv4(),
      );
      setReport(result.report);
      setExpectedVersion(result.version);
      setLatestVersion(null);
      setDescription('');
      setNotice('Đã gửi phản ánh bổ sung.');
      setPhase('done');
    } catch (caught) {
      const problem = problemOf(caught);
      if (problem.code === 'concurrency_conflict') {
        setLatestVersion(getReportWireVersion(report.tracking_code));
        setPhase('conflict');
        return;
      }
      setPhase('ready');
      setError(problem.message ?? 'Không gửi được phản ánh bổ sung. Vui lòng thử lại.');
    }
  };

  const keepMine = () => {
    if (latestVersion) {
      setExpectedVersion(latestVersion);
    }
    setLatestVersion(null);
    setNotice('Đã nạp phiên bản mới nhất — bấm “Gửi bổ sung” để thử lại với nội dung của bạn.');
    setPhase('ready');
  };

  const takeLatest = async () => {
    if (!report) {
      return;
    }
    setError(null);
    const found = await getReportByTracking(report.tracking_code);
    if (found.report) {
      setReport(found.report);
    }
    setExpectedVersion(getReportWireVersion(report.tracking_code));
    setLatestVersion(null);
    setNotice('Đã tải bản mới nhất. Nội dung bạn đang nhập vẫn được giữ nguyên.');
    setPhase('ready');
  };

  const busy = phase === 'loading' || phase === 'submitting';

  return (
    <SafeAreaScreen scroll>
      <Text style={[typography.titleLg, styles.title]}>Phản ánh bổ sung</Text>
      <Text style={[typography.caption, styles.subtitle]}>
        Gửi thông tin bổ sung theo mã tra cứu. Nếu phản ánh đã thay đổi ở nơi khác, hệ thống sẽ cảnh báo
        xung đột phiên bản.
      </Text>

      <InputField
        label="Mã tra cứu phản ánh"
        value={trackingInput}
        onChangeText={setTrackingInput}
        placeholder="#HH-882910"
        autoCapitalize="characters"
        testID="supplement-tracking-input"
      />
      <View style={styles.loadRow}>
        <Button
          variant="secondary"
          title="Tải phản ánh"
          onPress={() => void loadReport(trackingInput)}
          loading={phase === 'loading'}
        />
      </View>

      {report ? (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={[typography.labelLg, styles.cardTitle]}>{report.tracking_code}</Text>
            <ReporterStatusBadge status={report.status} />
          </View>
          <Text style={[typography.caption, styles.cardText]}>{report.description}</Text>
          <Text style={[typography.caption, styles.cardMeta]}>
            Phiên bản đang giữ: {expectedVersion ?? '—'}
          </Text>
        </View>
      ) : null}

      {phase === 'conflict' ? (
        <View style={styles.conflictCard}>
          <View style={styles.conflictHeader}>
            <MaterialIcons name="sync-problem" size={18} color={colors.warning} />
            <Text style={[typography.labelLg, styles.conflictTitle]}>Phát hiện xung đột phiên bản</Text>
          </View>
          <Text style={[typography.caption, styles.conflictText]}>
            Phản ánh đã được cập nhật ở nơi khác. Chọn giữ nội dung bạn đang soạn, hoặc tải bản mới nhất
            trước khi gửi.
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
          <Text style={[typography.caption, styles.photoHint]}>
            Ảnh đã xác minh sẽ được gửi kèm: {verifiedPhotoUris.length} ảnh
          </Text>
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
  loadRow: { marginBottom: spacing.lg },
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
  photoHint: { color: colors.secondary, marginBottom: spacing.md },
  noticeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md },
  noticeText: { color: colors.info, flex: 1 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md },
  errorText: { color: colors.error, flex: 1 },
  busyText: { color: colors.secondary, marginTop: spacing.sm },
});

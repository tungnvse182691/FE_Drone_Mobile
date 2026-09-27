import React, { useEffect, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { InputField } from '../../src/components/InputField';
import { ReporterStatusBadge } from '../../src/components/ReporterStatusBadge';
import { TrackingTimeline } from '../../src/components/TrackingTimeline';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { defectTypeLabel } from '../../src/constants/defect-types';
import { buildTrackingTimeline, getReportByTracking, normalizeTrackingCode } from '../../src/api/mock/reporter';
import { useReporterStore } from '../../src/store/reporter';
import { REPORTER_FEEDBACK, REPORTER_REPORT } from '../../src/constants/routes';
import { ReporterReport } from '../../src/types/domain';
import { ReporterReportStatus } from '../../src/types/enums';

export default function ReporterTrackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const trackingCodes = useReporterStore((state) => state.trackingCodes);

  const [input, setInput] = useState(params.code ?? '');
  const [report, setReport] = useState<ReporterReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const autoLookupRef = useRef(false);

  useEffect(() => {
    if (params.code) {
      setInput(params.code);
    }
  }, [params.code]);

  const lookup = async (raw: string) => {
    const code = normalizeTrackingCode(raw);
    if (!code || code === '#') {
      setError('Vui lòng nhập mã phản ánh, ví dụ: #HH-882910');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getReportByTracking(code);
      if (!result.report) {
        setReport(null);
        setError('Không tìm thấy phản ánh với mã này. Vui lòng kiểm tra lại mã.');
      } else {
        setReport(result.report);
      }
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  useEffect(() => {
    if (autoLookupRef.current || !params.code) {
      return;
    }
    autoLookupRef.current = true;
    lookup(params.code);
  }, []);

  const timeline = report
    ? buildTrackingTimeline(report.status, report.submitted_at)
    : [];

  const isCompleted = report?.status === ReporterReportStatus.COMPLETED;
  const isRejected = report?.status === ReporterReportStatus.REJECTED;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[typography.titleLg, styles.title]}>Tra cứu tiến độ xử lý</Text>
          <Text style={[typography.caption, styles.subtitle]}>
            Nhập mã phản ánh được gửi qua email để theo dõi từng bước xử lý.
          </Text>

          <InputField
            label="Mã phản ánh"
            value={input}
            onChangeText={(text) => {
              setInput(text);
              setError(null);
            }}
            placeholder="#HH-882910"
            autoCapitalize="characters"
            testID="track-code-input"
          />
          <Button
            variant="primary"
            title="Tra cứu"
            onPress={() => lookup(input)}
            loading={loading}
            disabled={!input.trim()}
          />

          {trackingCodes.length > 0 ? (
            <View style={styles.recentBlock}>
              <Text style={[typography.labelLg, styles.recentLabel]}>Phản ánh của bạn</Text>
              <View style={styles.recentChips}>
                {trackingCodes.map((code) => (
                  <Pressable
                    key={code}
                    onPress={() => {
                      setInput(code);
                      lookup(code);
                    }}
                    style={({ pressed }) => [styles.recentChip, pressed && styles.recentChipPressed]}
                    accessibilityRole="button"
                    accessibilityLabel={`Tra cứu mã ${code}`}
                  >
                    <MaterialIcons name="history" size={14} color={colors.brandGold} />
                    <Text style={[typography.labelLg, styles.recentChipText]}>{code}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorRow}>
              <MaterialIcons name="error-outline" size={16} color={colors.error} />
              <Text style={[typography.caption, styles.error]}>{error}</Text>
            </View>
          ) : null}

          {report ? (
            <View style={styles.reportBlock}>
              <Card style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <Text style={[typography.titleLg, styles.reportCode]}>{report.tracking_code}</Text>
                  <ReporterStatusBadge status={report.status} />
                </View>

                {report.defect_type ? (
                  <View style={styles.metaRow}>
                    <MaterialIcons name="category" size={16} color={colors.secondary} />
                    <Text style={[typography.bodyMd, styles.metaText]}>
                      {defectTypeLabel(report.defect_type)}
                    </Text>
                  </View>
                ) : null}

                {report.route_hint ? (
                  <View style={styles.metaRow}>
                    <MaterialIcons name="place" size={16} color={colors.secondary} />
                    <Text style={[typography.bodyMd, styles.metaText]}>{report.route_hint}</Text>
                  </View>
                ) : null}

                <View style={styles.metaRow}>
                  <MaterialIcons name="my-location" size={16} color={colors.secondary} />
                  <Text style={[typography.bodyMd, styles.metaText]}>
                    {report.coordinates[1].toFixed(5)}, {report.coordinates[0].toFixed(5)}
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  <MaterialIcons name="schedule" size={16} color={colors.secondary} />
                  <Text style={[typography.bodyMd, styles.metaText]}>
                    Đã gửi lúc {formatDate(report.submitted_at)}
                  </Text>
                </View>

                <Text style={[typography.bodyMd, styles.description]}>{report.description}</Text>

                {report.photo_uris.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
                    {report.photo_uris.map((uri, index) => (
                      <Image key={`${uri}-${index}`} source={{ uri }} style={styles.photo} />
                    ))}
                  </ScrollView>
                ) : null}
              </Card>

              <Card style={styles.timelineCard}>
                <Text style={[typography.titleMd, styles.timelineTitle]}>Tiến trình xử lý</Text>
                <TrackingTimeline events={timeline} />
              </Card>

              {isRejected ? (
                <View style={styles.noticeRow}>
                  <MaterialIcons name="info-outline" size={16} color={colors.error} />
                  <Text style={[typography.caption, styles.noticeText]}>
                    Phản ánh không thuộc phạm vi tuyến ĐH.05 phụ trách. Vui lòng liên hệ Ban Quản lý dự án để được hướng dẫn.
                  </Text>
                </View>
              ) : null}

              {isCompleted ? (
                <Button
                  variant="primary"
                  title="Gửi đánh giá"
                  onPress={() =>
                    router.push({ pathname: REPORTER_FEEDBACK, params: { code: report.tracking_code } })
                  }
                />
              ) : null}
            </View>
          ) : searched && !error ? (
            <Card style={styles.emptyCard}>
              <MaterialIcons name="search-off" size={32} color={colors.secondary} />
              <Text style={[typography.bodyMd, styles.emptyText]}>
                Không có dữ liệu hiển thị. Hãy nhập mã phản ánh để tra cứu.
              </Text>
            </Card>
          ) : null}

          <Button
            variant="text"
            title="Gửi phản ánh mới"
            onPress={() => router.push(REPORTER_REPORT)}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function formatDate(iso: string) {
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceAlt },
  flex: { flex: 1 },
  content: { padding: spacing.screenMargin, paddingBottom: spacing.xl, gap: spacing.sm },
  title: { color: colors.brandGold },
  subtitle: { color: colors.secondary, marginBottom: spacing.sm },
  recentBlock: { marginTop: spacing.md, marginBottom: spacing.sm },
  recentLabel: { color: colors.secondary, marginBottom: spacing.sm },
  recentChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  recentChipPressed: { backgroundColor: colors.surfaceAlt },
  recentChipText: { color: colors.brandGold },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  error: { color: colors.error, flex: 1 },
  reportBlock: { gap: spacing.md, marginTop: spacing.lg },
  summaryCard: { gap: spacing.sm },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  reportCode: { color: colors.brandGold },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metaText: { color: colors.secondary, flex: 1 },
  description: { color: colors.onSurface, marginTop: spacing.xs },
  photoScroll: { marginTop: spacing.sm },
  photo: { width: 96, height: 96, borderRadius: radius.md, marginRight: spacing.sm, backgroundColor: colors.surfaceAlt },
  timelineCard: { gap: spacing.md },
  timelineTitle: { color: colors.onSurface },
  noticeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  noticeText: { color: colors.secondary, flex: 1 },
  emptyCard: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg },
  emptyText: { color: colors.secondary, textAlign: 'center' },
});

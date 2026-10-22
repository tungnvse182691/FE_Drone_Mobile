import React, { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { listMyReports, type OwnReportDto } from '../../src/api/mock/reporter';
import { useReporterStore } from '../../src/store/reporter';
import { useAuthStore } from '../../src/store/auth';
import { REPORTER_REPORT, REPORTER_REPORT_DETAIL } from '../../src/constants/routes';
import { reporterReportCode } from '../../src/api/report-display-code';

const softShadow = Platform.select({
  ios: { shadowColor: '#1A1D20', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  android: { elevation: 3 },
  default: {},
});

const LOAD_ERROR = 'Không tải được danh sách phản ánh. Vui lòng thử lại.';

export default function ReporterTrackScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const verifiedEmail = useReporterStore((state) => state.verifiedEmail);

  const activeEmail = user?.phone_or_email || verifiedEmail || undefined;

  const [reports, setReports] = useState<OwnReportDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeEmail) {
      setReports([]);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const page = await listMyReports(activeEmail);
      setReports(page.items);
    } catch {
      setError(LOAD_ERROR);
    } finally {
      setLoading(false);
    }
  }, [activeEmail]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[typography.titleLg, styles.title]}>Phản ánh của tôi</Text>
        <Text style={[typography.caption, styles.subtitle]}>
          Danh sách phản ánh đã gửi bằng email {activeEmail ?? 'chưa xác thực'}.
        </Text>

        {error ? (
          <View style={styles.errorRow}>
            <MaterialIcons name="error-outline" size={16} color={colors.error} />
            <Text style={[typography.caption, styles.error]}>{error}</Text>
          </View>
        ) : null}

        {!loading && reports.length === 0 ? (
          <EmptyState
            icon="inbox"
            title="Chưa có phản ánh nào"
            message="Bạn chưa gửi phản ánh nào bằng email này."
            actionLabel="Gửi phản ánh mới"
            onAction={() => router.push(REPORTER_REPORT)}
          />
        ) : null}

        <View style={styles.list}>
          {reports.map((report) => (
            <Pressable
              key={report.id}
              onPress={() =>
                router.push({ pathname: REPORTER_REPORT_DETAIL, params: { reportId: report.id } })
              }
              accessibilityRole="button"
              accessibilityLabel={`Xem chi tiết phản ánh ${reporterReportCode(report.id)} gửi lúc ${formatDate(report.createdAt)}`}
            >
              <Card style={styles.reportCard}>
                <View style={styles.reportHeader}>
                  <MaterialIcons name="description" size={18} color={colors.brandGold} />
                  <Text style={[typography.labelLg, styles.reportCode]}>
                    {reporterReportCode(report.id)}
                  </Text>
                  <Text style={[typography.titleMd, styles.reportDate]}>
                    {formatDate(report.createdAt)}
                  </Text>
                  <MaterialIcons name="chevron-right" size={20} color={colors.secondary} />
                </View>
                <Text style={[typography.bodyMd, styles.reportDescription]} numberOfLines={2}>
                  {report.description?.trim() || 'Chưa có mô tả'}
                </Text>
                <View style={styles.metaRow}>
                  <MaterialIcons name="photo-library" size={14} color={colors.secondary} />
                  <Text style={[typography.caption, styles.metaText]}>
                    {report.evidence.length} ảnh hiện trường
                  </Text>
                  {report.supplements.length > 0 ? (
                    <Text style={[typography.caption, styles.metaText]}>
                      · {report.supplements.length} bổ sung
                    </Text>
                  ) : null}
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      </ScrollView>
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
  content: { padding: spacing.screenMargin, paddingBottom: spacing.xl, gap: spacing.sm },
  title: { color: colors.brandGold },
  subtitle: { color: colors.secondary, marginBottom: spacing.sm },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  error: { color: colors.error, flex: 1 },
  list: { gap: spacing.md, marginTop: spacing.sm },
  reportCard: {
    gap: spacing.sm,
    borderRadius: radius.xl,
    ...softShadow,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reportCode: { color: colors.brandGold },
  reportDate: { color: colors.secondary, flex: 1 },
  reportDescription: { color: colors.secondary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metaText: { color: colors.secondary },
});

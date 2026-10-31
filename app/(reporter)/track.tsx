import { ReporterHeader } from '../../src/components/ReporterHeader';
import React, { useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { reporterReportsOptions, reportItemsFromPages, canShowReportPages } from '../../src/api/reporterApi';
import { passwordSessionIdentity } from '../../src/api/authApi';
import { isReporterSession } from '../../src/api/uploads';
import { Button } from '../../src/components/Button';
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
  const token = useAuthStore(state => state.token);
  const status = useAuthStore(state => state.status);
  const scope = passwordSessionIdentity(token);
  const enabled = isReporterSession({ user, token, status }) && !!scope;
  const query = useInfiniteQuery({ ...reporterReportsOptions(scope ?? 'guest'), enabled });
  const { refetch } = query;
  useFocusEffect(useCallback(() => { if (enabled) void refetch(); }, [enabled, refetch]));
  const reports = enabled && canShowReportPages(query) ? reportItemsFromPages(query.data?.pages) : [];
  const activeEmail = enabled ? user?.phone_or_email : undefined;
  const loading = enabled && query.isFetching && !query.isFetchingNextPage;
  const error = query.isError && enabled ? (canShowReportPages(query) ? 'Không tải thêm được. Đang hiển thị phản ánh đã tải; thử tải thêm hoặc làm mới.' : LOAD_ERROR) : null;
  const load = () => { if (enabled) void query.refetch(); };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ReporterHeader title="Phản ánh của tôi" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[typography.caption, styles.subtitle]}>
          Danh sách phản ánh đã gửi bằng email {activeEmail ?? 'chưa xác thực'}.
        </Text>

        {error ? (
          <View style={styles.errorRow}>
            <MaterialIcons name="error-outline" size={16} color={colors.error} />
            <Text style={[typography.caption, styles.error]}>{error}</Text>
          </View>
        ) : null}

        <Button variant="secondary" title="Làm mới" loading={loading} onPress={load} disabled={!enabled} />
        {!enabled ? <Text>Vui lòng đăng nhập để xem phản ánh của bạn.</Text> : null}
        {enabled && !query.isPending && !error && reports.length === 0 ? (
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
        {enabled && query.hasNextPage ? <Button variant="secondary" title="Tải thêm phản ánh" loading={query.isFetchingNextPage} disabled={query.isFetching} onPress={() => void query.fetchNextPage()} /> : null}
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

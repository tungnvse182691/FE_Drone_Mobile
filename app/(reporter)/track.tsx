import { reporterAppearance } from '../../src/components/reporter/appearance';
import { ReporterHeader } from '../../src/components/ReporterHeader';
import React, { useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { reporterReportsOptions, reportItemsFromPages, canShowReportPages } from '../../src/api/reporterApi';
import { passwordSessionIdentity } from '../../src/api/authApi';
import { isReporterSession } from '../../src/api/uploads';
import { Button } from '../../src/components/reporter/Button';
import { useAuthStore } from '../../src/store/auth';
import { REPORTER_REPORT, REPORTER_REPORT_DETAIL } from '../../src/constants/routes';
import { publishedRepairProgress } from '../../src/api/reporterProgress';

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
  const loading = enabled && query.isFetching && !query.isFetchingNextPage;
  const error = query.isError && enabled ? (canShowReportPages(query) ? 'Không tải thêm được. Đang hiển thị phản ánh đã tải; thử tải thêm hoặc làm mới.' : LOAD_ERROR) : null;
  const load = () => { if (enabled) void query.refetch(); };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ReporterHeader title="Phản ánh của tôi" rightAction={
        <Pressable testID="refresh-reports" accessibilityRole="button" accessibilityLabel="Làm mới phản ánh"
          accessibilityState={{ disabled: !enabled || loading, busy: loading }} disabled={!enabled || loading}
          onPress={load} style={styles.refreshButton}>
          {loading ? <ActivityIndicator size="small" color={colors.secondary} /> : <MaterialIcons name="refresh" size={24} color={colors.secondary} />}
        </Pressable>
      } />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View style={styles.errorRow}>
            <MaterialIcons name="error-outline" size={16} color={colors.error} />
            <Text style={[typography.caption, styles.error]}>{error}</Text>
          </View>
        ) : null}

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
          {reports.map((report) => {
            const progress = publishedRepairProgress(report.repairProgress);
            return (
            <Pressable
              key={report.id}
              style={styles.reportTouch}
              android_ripple={{ color: reporterAppearance.pressed, foreground: true }}
              onPress={() =>
                router.push({ pathname: REPORTER_REPORT_DETAIL, params: { reportId: report.id } })
              }
              accessibilityRole="button"
              accessibilityLabel={`Xem chi tiết phản ánh gửi lúc ${formatDate(report.createdAt)}`}
            >
              <Card style={styles.reportCard}>
                <View style={styles.reportHeader}>
                  <Text style={[typography.bodyMd, styles.description]} numberOfLines={2}>
                    {report.description || 'Chưa có mô tả'}
                  </Text>
                  <MaterialIcons name="chevron-right" size={20} color={colors.secondary} />
                </View>
                <View style={styles.routingChip}>
                  <Text style={[typography.caption, styles.metaText]}>
                    {report.routingStatus === 'UNASSIGNED' ? 'Chưa phân tuyến' : report.routingStatus === 'ASSIGNED' ? 'Đã phân tuyến' : 'Chưa có thông tin phân tuyến'}
                  </Text>
                </View>
                {progress ? <View testID="repair-progress" style={[styles.progressChip, { borderColor: colors[progress.tone] }]}>
                  <MaterialIcons name={progress.tone === 'success' ? 'check-circle' : 'construction'} size={16} color={colors[progress.tone]} />
                  <Text style={[typography.caption, { color: colors[progress.tone], flexShrink: 1 }]}>{progress.label}</Text>
                </View> : null}
                <View style={styles.metaRow}>
                  <Text style={[typography.caption, styles.reportDate]}>{formatDate(report.createdAt)}</Text>
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
          );})}
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
  refreshButton: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  routingChip: { alignSelf: 'flex-start', backgroundColor: colors.surfaceAlt, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full },
  progressChip: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderWidth: 1, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 6, maxWidth: '100%' },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  error: { color: colors.error, flex: 1 },
  list: { gap: spacing.md, marginTop: spacing.sm },
  reportTouch: { borderRadius: radius.lg, overflow: 'hidden' },
  reportCard: {
    gap: spacing.sm,
    ...reporterAppearance.card,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reportDate: { color: colors.secondary, marginRight: spacing.xs },
  description: { color: colors.neutral, flex: 1, fontFamily: 'Roboto-Medium' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs },
  metaText: { color: colors.secondary },
});

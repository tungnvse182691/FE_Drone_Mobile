import React, { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Image, Platform, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { getOwnReportReal, downloadReportEvidenceReal, downloadPublicationEvidenceReal, type OwnReportDto } from '../../src/api/reporterApi';
import { passwordSessionIdentity } from '../../src/api/authApi';
import { isReporterSession } from '../../src/api/uploads';
import { useAuthStore } from '../../src/store/auth';
import { REPORTER_REPORT_SUPPLEMENT } from '../../src/constants/routes';
import { reporterReportCode } from '../../src/api/report-display-code';

const softShadow = Platform.select({
  ios: { shadowColor: '#1A1D20', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  android: { elevation: 3 },
  default: {},
});

const LOCATION_SOURCE_LABELS: Record<string, string> = {
  CAPTURE: 'Vị trí lúc chụp ảnh',
  EXIF: 'Vị trí từ dữ liệu ảnh',
  MANUAL: 'Vị trí nhập tay',
  UNKNOWN: 'Chưa có vị trí',
};

const LOAD_ERROR = 'Không tải được chi tiết phản ánh. Vui lòng thử lại.';

export default function ReporterReportDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ reportId?: string }>();
  const reportId = typeof params.reportId === 'string' ? params.reportId : '';

  const user = useAuthStore((state) => state.user);
  const token = useAuthStore(state => state.token);
  const status = useAuthStore(state => state.status);
  const scope = passwordSessionIdentity(token);
  const enabled = isReporterSession({ user, token, status }) && !!scope && !!reportId;
  const query = useQuery({
    queryKey: ['reporter-detail', scope, reportId], enabled, retry: false, gcTime: 0,
    queryFn: ({ signal }) => getOwnReportReal(reportId, signal),
  });
  const { refetch } = query;
  useFocusEffect(useCallback(() => { if (enabled) void refetch(); }, [enabled, refetch]));
  // A failed ownership check must hide previously loaded detail and its controls.
  const report = enabled && !query.isError ? query.data?.report : undefined;
  const loading = enabled && query.isFetching;
  const error = !enabled ? 'Vui lòng đăng nhập và chọn phản ánh của bạn.' : query.isError ? LOAD_ERROR : null;
  const load = () => { if (enabled) void query.refetch(); };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[typography.titleLg, styles.title]}>Chi tiết phản ánh</Text>
        {reportId ? (
          <Text style={[typography.labelLg, styles.reportCode]}>{reporterReportCode(reportId)}</Text>
        ) : null}

        <Button variant="secondary" title="Làm mới" loading={loading} disabled={!enabled} onPress={load} />
        {enabled && query.isPending ? <Text>Đang tải phản ánh…</Text> : null}
        {error ? (
          <View style={styles.errorRow}>
            <MaterialIcons name="error-outline" size={16} color={colors.error} />
            <Text style={[typography.caption, styles.error]}>{error}</Text>
          </View>
        ) : null}

        {report ? (
          <>
            <Card style={styles.card}>
              <View style={styles.metaRow}>
                <MaterialIcons name="schedule" size={16} color={colors.secondary} />
                <Text style={[typography.bodyMd, styles.metaText]}>
                  Đã gửi lúc {formatDate(report.createdAt)}
                </Text>
              </View>
              <Text style={[typography.caption, styles.metaText]}>
                {report.routingStatus === 'UNASSIGNED' ? 'Chưa phân tuyến' : report.routingStatus === 'ASSIGNED' ? 'Đã phân tuyến' : 'Chưa có thông tin phân tuyến'}
              </Text>
              <Text style={[typography.bodyMd, styles.description]}>
                {report.description?.trim() || 'Chưa có mô tả'}
              </Text>
            </Card>

            <Card style={styles.card}>
              <Text style={[typography.titleMd, styles.sectionTitle]}>
                Ảnh hiện trường ({report.evidence.length})
              </Text>
              {report.evidence.length === 0 ? (
                <Text style={[typography.caption, styles.metaText]}>Chưa có ảnh đính kèm.</Text>
              ) : (
                report.evidence.map((item, index) => (
                  <View key={item.id} style={styles.evidenceRow}>
                    <MaterialIcons name="image" size={16} color={colors.brandGold} />
                    <View style={styles.evidenceText}>
                      <Text style={[typography.bodyMd, styles.metaText]}>Ảnh {index + 1}{item.supplementId ? ' · Bổ sung' : ''}</Text>
                      <EvidencePreview key={`${scope}:${report.id}:${item.id}`} scope={scope!} reportId={report.id} evidenceId={item.id} />
                      <Text style={[typography.caption, styles.metaText]}>
                        {LOCATION_SOURCE_LABELS[item.locationSource ?? 'UNKNOWN'] ??
                          'Chưa có vị trí'}
                        {item.capturedAt ? ` · ${formatDate(item.capturedAt)}` : ''}
                      </Text>
                      {item.location?.latitude != null && item.location?.longitude != null ? (
                        <Text style={[typography.caption, styles.metaText]}>
                          {item.location.latitude.toFixed(5)}, {item.location.longitude.toFixed(5)}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))
              )}
            </Card>

            {report.supplements.length > 0 ? (
              <Card style={styles.card}>
                <Text style={[typography.titleMd, styles.sectionTitle]}>
                  Thông tin bổ sung ({report.supplements.length})
                </Text>
                {report.supplements.map((item) => (
                  <View key={item.id} style={styles.evidenceRow}>
                    <MaterialIcons name="note-add" size={16} color={colors.secondary} />
                    <View style={styles.evidenceText}>
                      <Text style={[typography.bodyMd, styles.metaText]}>
                        {item.description?.trim() || 'Bổ sung thông tin'}
                      </Text>
                      <Text style={[typography.caption, styles.metaText]}>
                        {formatDate(item.createdAt)}
                      </Text>
                    </View>
                  </View>
                ))}
              </Card>
            ) : null}

            {report.publicUpdates.length > 0 ? (
              <Card style={styles.card}>
                <Text style={[typography.titleMd, styles.sectionTitle]}>Cập nhật từ Ban QLDA</Text>
                {report.publicUpdates.map((update) => (
                  <View key={update.id} style={styles.evidenceRow}>
                    <MaterialIcons name="campaign" size={16} color={colors.secondary} />
                    <View style={styles.evidenceText}>
                      <Text style={[typography.bodyMd, styles.metaText]}>
                        {update.summary?.trim() || 'Cập nhật tiến độ'}
                      </Text>
                      <Text style={[typography.caption, styles.metaText]}>
                        {formatDate(update.publishedAt)}
                      </Text>
                      {update.evidenceIds.map(evidenceId => (
                        <EvidencePreview key={`${scope}:${report.id}:${update.id}:${evidenceId}`}
                          scope={scope!} reportId={report.id} evidenceId={evidenceId}
                          publication={{ id: update.id, report }} />
                      ))}
                    </View>
                  </View>
                ))}
              </Card>
            ) : null}

            <Button
              variant="primary"
              title="Bổ sung thông tin"
              onPress={() =>
                router.push({
                  pathname: REPORTER_REPORT_SUPPLEMENT,
                  params: { reportId: report.id },
                })
              }
            />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function EvidencePreview({ scope, reportId, evidenceId, publication }: {
  scope: string; reportId: string; evidenceId: string;
  publication?: { id: string; report: OwnReportDto };
}) {
  const [requested, setRequested] = useState(false);
  const [imageError, setImageError] = useState(false);
  const query = useQuery({
    queryKey: publication ? ['reporter-publication-evidence', scope, reportId, publication.id, evidenceId] :
      ['reporter-private-evidence', scope, reportId, evidenceId],
    enabled: requested, retry: false, gcTime: 0,
    queryFn: ({ signal }) => publication
      ? downloadPublicationEvidenceReal(publication.report, publication.id, evidenceId, signal)
      : downloadReportEvidenceReal(reportId, evidenceId, signal),
  });
  // Leave no image visible when returning from navigation. Each
  // new opt-in rechecks the current recipient/source on the server.
  useFocusEffect(useCallback(() => () => { setRequested(false); setImageError(false); }, []));
  const label = publication ? 'ảnh được chia sẻ' : 'ảnh riêng tư';
  return <View>
    <Button variant="secondary" title={publication ? 'Xem ảnh được chia sẻ' : 'Xem ảnh riêng tư'} loading={query.isFetching} onPress={() => {
      setImageError(false);
      if (requested) void query.refetch(); else setRequested(true);
    }} />
    {requested && (query.isError || imageError) ? <Text style={{ color: colors.error }}>Không tải được {label}. Vui lòng thử lại.</Text> : null}
    {requested && !query.isFetching && !query.isError && !imageError && query.data ? <Image source={{ uri: query.data }}
      style={{ width: '100%', height: 220 }} resizeMode="contain" accessibilityLabel={publication ? 'Ảnh bằng chứng được chia sẻ cho phản ánh này' : 'Ảnh bằng chứng riêng tư'}
      onError={() => setImageError(true)} /> : null}
  </View>;
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
  content: { padding: spacing.screenMargin, paddingBottom: spacing.xl, gap: spacing.md },
  title: { color: colors.brandGold },
  reportCode: { color: colors.secondary },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  error: { color: colors.error, flex: 1 },
  card: { gap: spacing.sm, borderRadius: radius.xl, ...softShadow },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metaText: { color: colors.secondary, flex: 1 },
  description: { color: colors.onSurface },
  sectionTitle: { color: colors.onSurface },
  evidenceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  evidenceText: { flex: 1, gap: 2 },
});

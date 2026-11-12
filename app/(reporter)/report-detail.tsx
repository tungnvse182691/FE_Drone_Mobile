import { ReporterHeader } from '../../src/components/ReporterHeader';
import React, { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../src/components/reporter/Button';
import { Card } from '../../src/components/Card';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { getOwnReportReal, downloadReportEvidenceReal, downloadPublicationEvidenceReal, type OwnReportDto } from '../../src/api/reporterApi';
import { passwordSessionIdentity } from '../../src/api/authApi';
import { isReporterSession } from '../../src/api/uploads';
import { useAuthStore } from '../../src/store/auth';
import { REPORTER_REPORT_SUPPLEMENT } from '../../src/constants/routes';

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
      <ReporterHeader title="Chi tiết phản ánh" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.toolbar}>
          <Text style={[typography.caption, styles.metaText]}>Thông tin phản ánh của bạn</Text>
          <Pressable testID="refresh-report" accessibilityRole="button" accessibilityLabel="Làm mới phản ánh"
            accessibilityState={{ disabled: !enabled || loading, busy: loading }} disabled={!enabled || loading}
            onPress={load} style={styles.iconButton}>
            {loading ? <ActivityIndicator color={colors.secondary} /> : <MaterialIcons name="refresh" size={22} color={colors.secondary} />}
          </Pressable>
        </View>
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
              <Text style={[typography.titleMd, styles.sectionTitle]}>Mô tả hiện trạng</Text>
              <ExpandableDescription key={`${scope}:${report.id}`} value={report.description} />
              <Text style={[typography.caption, styles.status]}>
                {report.routingStatus === 'UNASSIGNED' ? 'Chưa phân tuyến' : report.routingStatus === 'ASSIGNED' ? 'Đã phân tuyến' : 'Chưa có thông tin phân tuyến'}
              </Text>
              <View style={styles.metaRow}>
                <MaterialIcons name="schedule" size={16} color={colors.secondary} />
                <Text style={[typography.caption, styles.metaText]}>
                  Đã gửi lúc {formatDate(report.createdAt)}
                </Text>
              </View>
            </Card>

            <Card style={styles.card}>
              <Text style={[typography.titleMd, styles.sectionTitle]}>
                Ảnh hiện trường ({report.evidence.length})
              </Text>
              {report.evidence.length === 0 ? (
                <Text style={[typography.caption, styles.metaText]}>Chưa có ảnh đính kèm.</Text>
              ) : (
                <View style={styles.evidenceGrid}>{report.evidence.map((item, index) => (
                  <View key={item.id} testID="evidence-cell" style={styles.evidenceCell}>
                      <Text style={[typography.bodyMd, styles.metaText]}>Ảnh {index + 1}{item.supplementId ? ' · Bổ sung' : ''}</Text>
                      <EvidencePreview key={`${scope}:${report.id}:${item.id}`} scope={scope!} reportId={report.id} evidenceId={item.id} />
                  </View>
                ))}</View>
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
                      <ExpandableDescription value={item.description} />
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
                <Text style={[typography.titleMd, styles.sectionTitle]}>Cập nhật từ Ban quản lý dự án</Text>
                {report.publicUpdates.map((update) => (
                  <View key={update.id} style={styles.evidenceRow}>
                    <MaterialIcons name="campaign" size={16} color={colors.secondary} />
                    <View style={styles.evidenceText}>
                      <ExpandableDescription value={update.summary} />
                      <Text style={[typography.caption, styles.metaText]}>
                        Công bố lúc {formatDate(update.publishedAt)}
                      </Text>
                      <View style={styles.evidenceGrid}>{update.evidenceIds.map(evidenceId => (
                        <View key={evidenceId} style={styles.evidenceCell}>
                        <EvidencePreview key={`${scope}:${report.id}:${update.id}:${evidenceId}`}
                          scope={scope!} reportId={report.id} evidenceId={evidenceId}
                          publication={{ id: update.id, report }} />
                        </View>
                      ))}</View>
                    </View>
                  </View>
                ))}
              </Card>
            ) : null}

            <Card style={styles.card}>
              <Text style={[typography.titleMd, styles.sectionTitle]}>Vị trí & thông tin ảnh</Text>
              {report.evidence.length ? report.evidence.map((item, index) =>
                <EvidenceMetadata key={`${scope}:${report.id}:${item.id}`} item={item} index={index} />)
                : <Text style={[typography.caption, styles.metaText]}>Chưa có thông tin vị trí.</Text>}
            </Card>

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

function ExpandableDescription({ value }: { value: string | null | undefined }) {
  const [expanded, setExpanded] = useState(false);
  const [overflow, setOverflow] = useState(false);
  return <View style={styles.descriptionBlock}>
    <Text testID="report-description" style={[typography.bodyMd, styles.description]} numberOfLines={expanded ? undefined : 3}
      onTextLayout={event => { if (event.nativeEvent.lines.length >= 3) setOverflow(true); }}>
      {value || 'Chưa có mô tả'}
    </Text>
    {overflow ? <Pressable testID="toggle-description" accessibilityRole="button" accessibilityState={{ expanded }}
      accessibilityLabel={expanded ? 'Thu gọn mô tả' : 'Xem thêm mô tả'} onPress={() => setExpanded(v => !v)} style={styles.textButton}>
      <Text style={[typography.caption, styles.link]}>{expanded ? 'Thu gọn' : 'Xem thêm'}</Text>
      <MaterialIcons name={expanded ? 'expand-less' : 'expand-more'} size={20} color={colors.secondary} />
    </Pressable> : null}
  </View>;
}

function EvidenceMetadata({ item, index }: { item: OwnReportDto['evidence'][number]; index: number }) {
  const [expanded, setExpanded] = useState(false);
  return <View>
    <Pressable testID={`metadata-${index}`} accessibilityRole="button" accessibilityState={{ expanded }}
      accessibilityLabel={`Thông tin ảnh ${index + 1}`} onPress={() => setExpanded(v => !v)} style={styles.metadataButton}>
      <MaterialIcons name="location-on" size={18} color={colors.secondary} />
      <Text style={[typography.caption, styles.metaText]}>Ảnh {index + 1} · {LOCATION_SOURCE_LABELS[item.locationSource ?? 'UNKNOWN'] ?? 'Chưa có vị trí'}</Text>
      <MaterialIcons name={expanded ? 'expand-less' : 'expand-more'} size={20} color={colors.secondary} />
    </Pressable>
    {expanded ? <View style={styles.metadataContent}>
      <Text style={[typography.caption, styles.metaText]}>{item.capturedAt ? formatDate(item.capturedAt) : 'Chưa có thời gian chụp'}</Text>
      {item.location ? <Text selectable style={[typography.caption, styles.metaText]}>
        {item.location.latitude}, {item.location.longitude}
        {item.location.accuracyMeters != null ? ` · Sai số ${item.location.accuracyMeters} m` : ''}
      </Text> : null}
    </View> : null}
  </View>;
}

function EvidencePreview({ scope, reportId, evidenceId, publication }: {
  scope: string; reportId: string; evidenceId: string;
  publication?: { id: string; report: OwnReportDto };
}) {
  const [requested, setRequested] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);
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
  useFocusEffect(useCallback(() => () => { setRequested(false); setImageError(false); setImageLoaded(false); setExpanded(false); }, []));
  const label = publication ? 'ảnh được chia sẻ' : 'ảnh riêng tư';
  const request = () => {
      setImageError(false); setImageLoaded(false);
      if (requested) void query.refetch(); else setRequested(true);
  };
  return <View>
    <Pressable accessibilityRole="button" accessibilityLabel={query.isError || imageError ? 'Thử tải lại ảnh' : imageLoaded ? 'Phóng to ảnh' : publication ? 'Xem ảnh được chia sẻ' : 'Xem ảnh đính kèm'}
      disabled={requested && (query.isFetching || (!imageLoaded && !imageError && !query.isError))}
      onPress={() => imageLoaded && !imageError && !query.isError ? setExpanded(true) : request()} style={styles.previewFrame}>
      {!requested ? <><MaterialIcons name="image" size={28} color={colors.secondary} /><Text style={[typography.caption, styles.link]}>Xem ảnh</Text></> :
      query.isError || imageError ? <><MaterialIcons name="refresh" size={22} color={colors.error} /><Text accessibilityLiveRegion="polite" style={styles.previewError}>Không tải được {label}. Thử lại</Text></> : <>
        {!query.isFetching && query.data ? <Image source={{ uri: query.data }}
          style={styles.previewImage} resizeMode="contain" accessibilityLabel={publication ? 'Ảnh bằng chứng được chia sẻ cho phản ánh này' : 'Ảnh bằng chứng riêng tư'}
          onLoad={() => setImageLoaded(true)} onError={() => setImageError(true)} /> : null}
        {query.isFetching || !imageLoaded ? <View style={styles.previewLoading}><ActivityIndicator color={colors.secondary} /><Text accessibilityLiveRegion="polite" style={typography.caption}>Đang tải ảnh…</Text></View> : null}
      </>}
    </Pressable>
    {requested && expanded && !query.isError && !imageError && query.data ? <Modal visible onRequestClose={() => setExpanded(false)} animationType="fade">
      <SafeAreaView style={styles.imageModal}>
        <Pressable accessibilityRole="button" accessibilityLabel="Đóng ảnh" onPress={() => setExpanded(false)} style={styles.iconButton}>
          <MaterialIcons name="close" size={24} color={colors.onSurface} />
        </Pressable>
        <Image source={{ uri: query.data }} resizeMode="contain" style={styles.fullImage} onError={() => { setImageError(true); setExpanded(false); }} />
      </SafeAreaView>
    </Modal> : null}
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
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconButton: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end' },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  error: { color: colors.error, flex: 1 },
  card: { gap: spacing.sm, borderRadius: radius.lg },
  status: { color: colors.onSurface, alignSelf: 'flex-start', backgroundColor: colors.surfaceAlt, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metaText: { color: colors.secondary, flex: 1 },
  descriptionBlock: { minWidth: 0, flexShrink: 1 },
  description: { color: colors.onSurface, flexShrink: 1 },
  textButton: { minHeight: 48, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  link: { color: colors.secondary },
  evidenceGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.md },
  evidenceCell: { width: '48%', minWidth: 0, gap: spacing.xs },
  metadataButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metadataContent: { paddingBottom: spacing.sm, gap: spacing.xs },
  sectionTitle: { color: colors.onSurface },
  evidenceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  evidenceText: { flex: 1, gap: 2 },
  previewFrame: { height: 120, minHeight: 48, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', gap: spacing.xs },
  previewImage: { width: '100%', height: 120 },
  previewLoading: { position: 'absolute', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.surfaceAlt, padding: spacing.xs },
  previewError: { color: colors.error, padding: spacing.xs, textAlign: 'center', ...typography.caption },
  imageModal: { flex: 1, backgroundColor: colors.surface },
  fullImage: { flex: 1, width: '100%' },
});

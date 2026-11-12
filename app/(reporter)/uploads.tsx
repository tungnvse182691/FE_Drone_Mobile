import { ReporterHeader } from '../../src/components/ReporterHeader';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Button } from '../../src/components/reporter/Button';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { PhotoUploadStatus } from '../../src/components/reporter/PhotoUploadStatus';
import {
  isTerminalMediaState,
  uploadedRatio,
  useUploadsStore,
  reporterContext,
  type UploadMediaState,
  type UploadQueueItem,
} from '../../src/store/uploads';
import { useAuthStore } from '../../src/store/auth';
import { useReporterDraftScope } from '../../src/store/reporter';
import {
  REPORTER_REPORT,
} from '../../src/constants/routes';

const softShadow = Platform.select({
  ios: { shadowColor: '#1A1D20', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  android: { elevation: 1 },
  default: {},
});

function stateColor(state: UploadMediaState): string {
  if (state === 'VERIFIED') {
    return colors.success;
  }
  if (state === 'FAILED') {
    return colors.error;
  }
  if (state === 'VERIFYING' || state === 'COMPLETE_REQUESTED') {
    return colors.info;
  }
  return colors.warning;
}

export default function ReporterUploadsScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const partitionId = `reporter-${user?.id ?? 'guest'}`;

  const expectedPartition = reporterContext().partition;
  const items = useUploadsStore((state) => state.items).filter(item => item.partitionId === expectedPartition);
  const hydrated = useUploadsStore((state) => state.hydrated && state.partitionId === expectedPartition);
  const busyItemIds = useUploadsStore((state) => state.busyItemIds);
  const cancelBusyItemIds = useUploadsStore((state) => state.cancelBusyItemIds);
  const hydrate = useUploadsStore((state) => state.hydrate);
  const advanceAll = useUploadsStore((state) => state.advanceAll);
  const retryItem = useUploadsStore(state => state.retryItem);
  const cancelItem = useUploadsStore(state => state.cancelItem);
  const stopWatch = useUploadsStore((state) => state.stopWatch);
  const scope = useReporterDraftScope();
  const [showRecovery, setShowRecovery] = useState(false);
  const [hydrateFailed, setHydrateFailed] = useState(false);
  const [hydrateAttempt, setHydrateAttempt] = useState(0);
  const [dataScope, setDataScope] = useState('');

  useEffect(() => {
    let active = true;
    const isCurrent = scope.capture();
    setHydrateFailed(false); setDataScope('');
    void hydrate(partitionId).then(() => { if (active && isCurrent()) setDataScope(scope.key); })
      .catch(() => { if (active && isCurrent()) setHydrateFailed(true); });
    return () => { active = false; stopWatch(); };
  }, [hydrate, partitionId, scope.key, hydrateAttempt, stopWatch]);

  const pending = items.filter((item) => !isTerminalMediaState(item.mediaState)).length;
  const verifiedCount = items.filter((item) => item.mediaState === 'VERIFIED' && item.fileId && item.verifiedVersion && !item.lastErrorCode && !item.cancelState).length;
  const canSubmit = verifiedCount > 0;

  const renderRow = (item: UploadQueueItem, index: number) => {
    const busy = busyItemIds.includes(item.id);
    const cancelBusy = cancelBusyItemIds.includes(item.id);
    const ratio = Math.round(uploadedRatio(item) * 100);
    return (
      <View key={item.id} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.preview}>
          <Image source={{ uri: item.uriLocal }} style={styles.thumbnail} accessibilityLabel={`Ảnh hiện trường ${index + 1}`} />
          <PhotoUploadStatus item={item} index={index} />
          </View>
          <View style={styles.cardBody}>
          <Text style={[typography.labelLg, styles.cardTitle]} numberOfLines={1}>
            Ảnh {index + 1}
          </Text>
          <Text style={[typography.caption, styles.cardMeta]}>
            {item.sizeBytes < 1024 * 1024 ? `${Math.max(1, Math.round(item.sizeBytes / 1024))} KB` : `${(item.sizeBytes / (1024 * 1024)).toFixed(1)} MB`}
          </Text>
        <Text style={[typography.caption, styles.cardMeta]}>
          {item.cancelState === 'CONFIRMED' ? 'Đã hủy phiên tải' :
            item.cancelState ? 'Cần kiểm tra kết quả hủy' :
            item.lastErrorCode || item.mediaState === 'FAILED' ? 'Chưa hoàn tất. Kiểm tra lại bên dưới.' :
            item.mediaState === 'VERIFIED' ? 'Có thể dùng cho phản ánh' :
            item.mediaState === 'VERIFYING' || item.mediaState === 'COMPLETE_REQUESTED' ? 'Đang kiểm tra ảnh trên máy chủ' :
            'Ảnh đang được chuẩn bị để gửi'}
        </Text>
          </View>
        </View>

        {item.mediaState === 'UPLOADING' && !item.cancelState ? <View style={styles.progressTrack} testID={`uploads-progress-${item.id}`}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${ratio}%`,
                backgroundColor: stateColor(item.mediaState),
              },
            ]}
          />
        </View> : null}

        <View style={styles.actions}>
          {(item.mediaState === 'FAILED' || item.lastErrorCode) && !item.cancelState ? (
            <Pressable
              disabled={busy}
              onPress={() => { if (scope.capture()()) void retryItem(item.id); }}
              style={({ pressed }) => [styles.action, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Kiểm tra lại kết quả tải ảnh"
              testID={`uploads-retry-${item.id}`}
            >
              <MaterialIcons name="refresh" size={16} color={colors.brandGold} />
              <Text style={[typography.caption, styles.actionMuted]}>{busy ? 'Đang kiểm tra…' : 'Kiểm tra lại ảnh'}</Text>
            </Pressable>
          ) : null}
          {item.uploadId && (item.cancelState === 'UNKNOWN' || item.cancelState === 'REQUESTED' || item.cancelState === 'BLOCKED' ||
            (!item.cancelState && (item.mediaState === 'SESSION_CREATED' || item.mediaState === 'UPLOADING'))) ? (
            <Pressable
              disabled={cancelBusy}
              onPress={() => {
                if (!scope.capture()()) return;
                if (item.cancelState === 'BLOCKED') { void cancelItem(item.id); return; }
                Alert.alert('Hủy phiên tải ảnh?', 'Ảnh trên thiết bị vẫn được giữ. Phiên đã hủy không thể tiếp tục tải.', [
                  { text: 'Giữ phiên', style: 'cancel' },
                  { text: 'Hủy tải lên', style: 'destructive', onPress: () => { if (scope.capture()()) void cancelItem(item.id); } },
                ]);
              }}
              style={({ pressed }) => [styles.action, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={item.cancelState ? 'Đối soát lệnh hủy tải ảnh' : 'Hủy tải ảnh'}
              testID={`uploads-cancel-${item.id}`}
            >
              <MaterialIcons name="cancel" size={16} color={colors.error} />
              <Text style={[typography.caption, styles.cardError]}>{cancelBusy ? 'Đang kiểm tra…' : item.cancelState ? 'Kiểm tra kết quả hủy' : 'Hủy tải lên'}</Text>
            </Pressable>
          ) : null}
        </View>

      </View>
    );
  };

  if (dataScope !== scope.key) return <SafeAreaScreen header={<ReporterHeader title="Trạng thái ảnh" onBack={() => router.canGoBack() ? router.back() : router.replace(REPORTER_REPORT)} />}>
    <View style={styles.card}>
      {!hydrateFailed ? <ActivityIndicator color={colors.neutral} /> : null}
      <Text style={typography.labelLg}>{hydrateFailed ? 'Chưa tải được hàng đợi' : 'Đang đọc trạng thái ảnh'}</Text>
      <Text style={[typography.caption, styles.cardMeta]}>Ảnh và dữ liệu tải lên trên thiết bị vẫn được giữ.</Text>
    </View>
    {hydrateFailed ? <Button variant="primary" title="Thử tải lại" onPress={() => setHydrateAttempt(value => value + 1)} /> : null}
    <Button title="Về trang chủ" variant="secondary" onPress={() => router.replace('/(reporter)/home')} />
  </SafeAreaScreen>;
  return (
    <SafeAreaScreen scroll header={<ReporterHeader title="Trạng thái ảnh" onBack={() => router.canGoBack() ? router.back() : router.replace(REPORTER_REPORT)} />}>
      <View style={styles.gateCard}>
        <Text style={[typography.labelLg, styles.gateTitle]}>{verifiedCount}/{items.length} ảnh sẵn sàng</Text>
        <Text style={[typography.caption, styles.gateText]}>Ảnh sẵn sàng chưa có nghĩa phản ánh đã được nộp.</Text>
        {items.length > 0 ? <>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: showRecovery }} testID="uploads-recovery-toggle" onPress={() => setShowRecovery(value => !value)} style={styles.action}>
            <Text style={[typography.caption, styles.gateTitle]}>{showRecovery ? 'Thu gọn' : 'Thông tin lưu ảnh'}</Text>
            <MaterialIcons name={showRecovery ? 'expand-less' : 'expand-more'} size={20} color={colors.neutral} />
          </Pressable>
          {showRecovery ? <Text testID="uploads-retention" style={[typography.caption, styles.gateText]}>Ảnh được giữ trên thiết bị để tiếp tục khi gián đoạn. Nếu đang chờ kết quả gửi, hãy giữ nguyên ảnh và nội dung. Chọn “Kiểm tra lại ảnh” khi cần kiểm tra kết quả tải.</Text> : null}
        </> : null}
      </View>

      {!hydrated ? (
        <Text style={[typography.caption, styles.loadingText]}>Đang tải hàng đợi...</Text>
      ) : null}

      {items.length === 0 && hydrated ? (
        <Text style={[typography.caption, styles.emptyText]}>
          Chưa có ảnh nào trong hàng đợi. Hãy chụp ảnh hiện trường trước.
        </Text>
      ) : null}

      <View style={styles.list}>{items.map(renderRow)}</View>

      <View style={styles.footer}>
        {pending > 0 ? <Button
          variant="secondary"
          title="Kiểm tra lại ngay"
          onPress={() => void advanceAll()}
          disabled={pending === 0}
        /> : null}
        <Button
          variant="primary"
          title={canSubmit ? 'Dùng ảnh để phản ánh' : 'Về màn gửi phản ánh'}
          onPress={() => router.push(REPORTER_REPORT)}
        />
        <Button
          variant="text"
          title="Bổ sung ảnh cho phản ánh đã gửi"
          onPress={() => router.push('/(reporter)/track')}
        />
      </View>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  subtitle: { color: colors.secondary, marginTop: spacing.xs, marginBottom: spacing.lg },
  gateCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.cardPadding,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  gateTitle: { color: colors.neutral },
  gateText: { color: colors.secondary },
  loadingText: { color: colors.secondary, marginBottom: spacing.sm },
  emptyText: { color: colors.secondary, marginBottom: spacing.md },
  list: { gap: spacing.sm, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.cardPadding,
    gap: spacing.xs,
    ...softShadow,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitle: { color: colors.neutral },
  cardBody: { flex: 1, minWidth: 0, gap: spacing.xs },
  preview: { width: 88, height: 88, borderRadius: radius.md, overflow: 'hidden' },
  cardMeta: { color: colors.secondary },
  cardError: { color: colors.error },
  progressTrack: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  progressFill: { height: 6, borderRadius: radius.full },
  thumbnail: { width: 88, height: 88, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  retention: { color: colors.secondary, marginBottom: spacing.md },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: { minHeight: 48, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  actionText: { color: colors.brandGold },
  actionMuted: { color: colors.secondary },
  pressed: { opacity: 0.85 },
  footer: { gap: spacing.sm },
});

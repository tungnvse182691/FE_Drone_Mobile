import React, { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Button } from '../../src/components/Button';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import {
  UPLOAD_STATE_LABELS,
  isTerminalMediaState,
  uploadedRatio,
  useUploadsStore,
  type UploadMediaState,
  type UploadQueueItem,
} from '../../src/store/uploads';
import { useAuthStore } from '../../src/store/auth';
import {
  REPORTER_CAPTURE,
  REPORTER_REPORT,
  REPORTER_REPORT_SUPPLEMENT,
} from '../../src/constants/routes';

const softShadow = Platform.select({
  ios: { shadowColor: '#1A1D20', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  android: { elevation: 3 },
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

function stateIcon(state: UploadMediaState): React.ComponentProps<typeof MaterialIcons>['name'] {
  if (state === 'VERIFIED') {
    return 'verified';
  }
  if (state === 'FAILED') {
    return 'error-outline';
  }
  if (state === 'VERIFYING' || state === 'COMPLETE_REQUESTED') {
    return 'hourglass-top';
  }
  return 'cloud-upload';
}

export default function ReporterUploadsScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const partitionId = `reporter-${user?.id ?? 'guest'}`;

  const items = useUploadsStore((state) => state.items);
  const hydrated = useUploadsStore((state) => state.hydrated);
  const watching = useUploadsStore((state) => state.watching);
  const busyItemIds = useUploadsStore((state) => state.busyItemIds);
  const hydrate = useUploadsStore((state) => state.hydrate);
  const advanceAll = useUploadsStore((state) => state.advanceAll);
  const retryItem = useUploadsStore((state) => state.retryItem);
  const removeItem = useUploadsStore((state) => state.removeItem);
  const startWatch = useUploadsStore((state) => state.startWatch);
  const stopWatch = useUploadsStore((state) => state.stopWatch);

  useEffect(() => {
    void hydrate(partitionId);
  }, [hydrate, partitionId]);

  useEffect(() => {
    startWatch();
    return () => stopWatch();
  }, [startWatch, stopWatch]);

  const pending = items.filter((item) => !isTerminalMediaState(item.mediaState)).length;
  const verifiedCount = items.filter((item) => item.mediaState === 'VERIFIED').length;
  const canSubmit = items.length > 0 && verifiedCount === items.length;

  const renderRow = (item: UploadQueueItem) => {
    const busy = busyItemIds.includes(item.id);
    const ratio = Math.round(uploadedRatio(item) * 100);
    return (
      <View key={item.id} style={styles.card}>
        <View style={styles.cardHeader}>
          <MaterialIcons name={stateIcon(item.mediaState)} size={18} color={stateColor(item.mediaState)} />
          <Text style={[typography.labelLg, styles.cardTitle]} numberOfLines={1}>
            {item.fileName}
          </Text>
          <Text style={[typography.caption, styles.cardMeta]}>
            {(item.sizeBytes / (1024 * 1024)).toFixed(1)} MB
          </Text>
        </View>

        <Text style={[typography.caption, { color: stateColor(item.mediaState) }]}>
          {UPLOAD_STATE_LABELS[item.mediaState]}
          {item.mediaState === 'UPLOADING' ? ` · ${ratio}%` : ''}
        </Text>

        {item.mediaState === 'FAILED' && item.lastErrorMessage ? (
          <Text style={[typography.caption, styles.cardError]}>{item.lastErrorMessage}</Text>
        ) : null}

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${item.mediaState === 'VERIFIED' ? 100 : ratio}%`,
                backgroundColor: stateColor(item.mediaState),
              },
            ]}
          />
        </View>

        <View style={styles.actions}>
          {item.mediaState === 'FAILED' ? (
            <Pressable
              onPress={() => void retryItem(item.id).then(() => advanceAll())}
              disabled={busy}
              style={({ pressed }) => [styles.action, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`Tải lại ảnh ${item.fileName}`}
              testID={`uploads-retry-${item.id}`}
            >
              <MaterialIcons name="refresh" size={16} color={colors.brandGold} />
              <Text style={[typography.caption, styles.actionText]}>Tải lại</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => void removeItem(item.id)}
            disabled={busy}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`Xoá ảnh ${item.fileName}`}
            testID={`uploads-remove-${item.id}`}
          >
            <MaterialIcons name="delete-outline" size={16} color={colors.secondary} />
            <Text style={[typography.caption, styles.actionText, styles.actionMuted]}>Xoá</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaScreen scroll>
      <Text style={[typography.titleLg, styles.title]}>Hàng đợi xác minh ảnh</Text>
      <Text style={[typography.caption, styles.subtitle]}>
        {watching
          ? `Đang theo dõi ${pending} ảnh chờ xử lý · đã xác minh ${verifiedCount}/${items.length}`
          : 'Tạm dừng theo dõi khi ứng dụng ở nền.'}
      </Text>

      <View style={styles.gateCard}>
        <Text style={[typography.labelLg, styles.gateTitle]}>
          Chỉ gửi phản ánh khi mọi ảnh đã xác minh
        </Text>
        <Text style={[typography.caption, styles.gateText]}>
          Máy chủ đã nhận tệp, nhưng tệp chỉ được ghi vào phản ánh khi đã xác minh xong.
        </Text>
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
        <Button variant="primary" title="Thêm ảnh hiện trường" onPress={() => router.push(REPORTER_CAPTURE)} />
        <Button
          variant="secondary"
          title="Kiểm tra lại ngay"
          onPress={() => void advanceAll()}
          disabled={pending === 0}
        />
        <Button
          variant="primary"
          title={
            canSubmit
              ? 'Gửi phản ánh'
              : items.length === 0
                ? 'Chưa có ảnh nào để xác minh'
                : `Đã xác minh ${verifiedCount}/${items.length} ảnh`
          }
          onPress={() => router.push(REPORTER_REPORT)}
          disabled={!canSubmit}
        />
        <Button
          variant="text"
          title="Tạo phản ánh bổ sung"
          onPress={() => router.push(REPORTER_REPORT_SUPPLEMENT)}
        />
      </View>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.brandGold },
  subtitle: { color: colors.secondary, marginTop: spacing.xs, marginBottom: spacing.lg },
  gateCard: {
    backgroundColor: colors.surfaceAlt,
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
  cardTitle: { color: colors.neutral, flex: 1 },
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
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  actionText: { color: colors.brandGold },
  actionMuted: { color: colors.secondary },
  pressed: { opacity: 0.85 },
  footer: { gap: spacing.sm },
});

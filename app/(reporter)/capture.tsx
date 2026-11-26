import { ReporterHeader } from '../../src/components/ReporterHeader';
import React, { useEffect, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { preserveReporterPhoto, reporterPhotoFailureMessage } from '../../src/api/reporterLocalMedia';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Button } from '../../src/components/reporter/Button';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import {
  locationSourceFor,
  normalizePhotoMediaType,
} from '../../src/api/uploads';
import { hasUsableCoordinate } from '../../src/types/position';
import {
  UPLOAD_STATE_LABELS,
  useUploadsStore, reporterContext,
  UPLOAD_RETENTION_NOTICE,
  type UploadQueueItem,
} from '../../src/store/uploads';
import { useAuthStore } from '../../src/store/auth';
import { REPORTER_REPORT, REPORTER_UPLOADS } from '../../src/constants/routes';
import { useReporterDraftScope } from '../../src/store/reporter';

const softShadow = Platform.select({
  ios: { shadowColor: '#1A1D20', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  android: { elevation: 1 },
  default: {},
});


interface Coordinates {
  latitude: number;
  longitude: number;
  /** Bán kính sai số GPS (mét, 68%); `null` khi thiết bị không cung cấp. */
  accuracyMeters: number | null;
}

function formatBytes(size: number): string {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

export default function ReporterCaptureScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const partitionId = `reporter-${user?.id ?? 'guest'}`;

  const items = useUploadsStore((state) => state.items).filter(item => item.partitionId === reporterContext().partition);
  const hydrated = useUploadsStore(state => state.hydrated && state.partitionId === reporterContext().partition);
  const hydrate = useUploadsStore((state) => state.hydrate);
  const enqueuePhoto = useUploadsStore((state) => state.enqueuePhoto);
  const advanceItem = useUploadsStore((state) => state.advanceItem);

  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [locationStatus, setLocationStatus] = useState('Đang lấy vị trí...');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scope = useReporterDraftScope();
  const [dataScope, setDataScope] = useState('');
  const [hydrateAttempt, setHydrateAttempt] = useState(0);
  const [hydrateFailed, setHydrateFailed] = useState(false);

  useEffect(() => {
    const isCurrent = scope.capture();
    let active = true;
    setCoordinates(null); setBusy(false); setError(null); setDataScope(''); setHydrateFailed(false);
    void hydrate(partitionId).then(() => { if (active && isCurrent()) setDataScope(scope.key); })
      .catch(() => { if (active && isCurrent()) setHydrateFailed(true); });
    return () => { active = false; };
  }, [hydrate, partitionId, scope.key, hydrateAttempt]);

  // This legacy route retains the queue; all new captures enter the bounded report form.
  const takePhoto = () => router.push(REPORTER_REPORT);

  const verifiedCount = items.filter((item) => item.mediaState === 'VERIFIED').length;
  const canSubmit = verifiedCount > 0;

  const renderState = (item: UploadQueueItem) => {
    if (item.mediaState === 'VERIFIED') {
      return (
        <View style={styles.stateRow}>
          <MaterialIcons name="verified" size={14} color={colors.success} />
          <Text style={[typography.caption, styles.stateVerified]}>
            {UPLOAD_STATE_LABELS.VERIFIED}
          </Text>
        </View>
      );
    }
    if (item.mediaState === 'FAILED') {
      return (
        <View style={styles.stateRow}>
          <MaterialIcons name="error-outline" size={14} color={colors.error} />
          <Text style={[typography.caption, styles.stateFailed]}>
            {item.lastErrorMessage ?? UPLOAD_STATE_LABELS.FAILED}
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.stateRow}>
        <MaterialIcons name="cloud-upload" size={14} color={colors.info} />
        <Text style={[typography.caption, styles.statePending]}>
          {UPLOAD_STATE_LABELS[item.mediaState]}
        </Text>
      </View>
    );
  };

  if (dataScope !== scope.key) return <SafeAreaScreen header={<ReporterHeader title="Ảnh hiện trường" onBack={() => router.canGoBack() ? router.back() : router.replace(REPORTER_REPORT)} />}>
    <Text>{hydrateFailed ? 'Chưa tải được hàng đợi. Ảnh và dữ liệu tải lên vẫn được giữ.' : 'Đang tải hàng đợi của phiên hiện tại...'}</Text>
    {hydrateFailed ? <Button variant="primary" title="Thử tải lại" onPress={() => setHydrateAttempt(value => value + 1)} /> : null}
    <Button title="Về trang chủ" variant="secondary" onPress={() => router.replace('/(reporter)/home')} />
  </SafeAreaScreen>;

  return (
    <SafeAreaScreen scroll header={<ReporterHeader title="Ảnh hiện trường" onBack={() => router.canGoBack() ? router.back() : router.replace(REPORTER_REPORT)} />}>
      <Text style={[typography.caption, styles.subtitle]}>
        Chụp tối đa 2 ảnh trong từng phản ánh. Ảnh và lượt tải cũ vẫn được giữ trong hàng đợi.
      </Text>

      <Text style={[typography.labelLg, styles.label]}>
        Ảnh được lưu trong phiên ({items.length})
      </Text>
      <View style={styles.grid}>
        {items.map((item) => (
          <View key={item.id} style={styles.thumbWrapper}>
            <Image source={{ uri: item.uriLocal }} style={styles.thumb} />
          </View>
        ))}
        {(
          <Pressable
            onPress={() => void takePhoto()}
            disabled={busy}
            style={({ pressed }) => [styles.addTile, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Chụp ảnh hiện trường"
            testID="capture-take-photo"
          >
            <MaterialIcons name="photo-camera" size={24} color={colors.brandGold} />
            <Text style={[typography.caption, styles.addText]}>Chụp ảnh</Text>
          </Pressable>
        )}
      </View>
      <Text style={typography.caption} testID="capture-retention-notice">{UPLOAD_RETENTION_NOTICE}</Text>

      {!hydrated ? (
        <Text style={[typography.caption, styles.loadingText]}>Đang tải hàng đợi ảnh...</Text>
      ) : null}

      <View style={styles.list}>
        {items.map((item, index) => (
          <View key={`row-${item.id}`} style={styles.row}>
            <View style={styles.rowHeader}>
              <Text style={[typography.labelLg, styles.rowTitle]} numberOfLines={1}>
                Ảnh {index + 1}
              </Text>
              <Text style={[typography.caption, styles.rowSize]}>{formatBytes(item.sizeBytes)}</Text>
            </View>
            {renderState(item)}
          </View>
        ))}
        {items.length === 0 ? (
          <Text style={[typography.caption, styles.emptyText]}>
            Chưa có ảnh nào. Mở phản ánh để chụp ảnh hiện trường.
          </Text>
        ) : null}
      </View>

      {error ? (
        <View style={styles.errorRow}>
          <MaterialIcons name="error-outline" size={16} color={colors.error} />
          <Text style={[typography.caption, styles.errorText]}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.footer}>
        <Button
          variant="primary"
          title={
            canSubmit
              ? 'Mở phản ánh'
              : items.length === 0
                ? 'Chưa chọn ảnh nào'
                : `Đã xác minh ${verifiedCount}/${items.length} ảnh`
          }
          onPress={() => router.push(REPORTER_REPORT)}
          disabled={!canSubmit}
        />
        <Button
          variant="secondary"
          title="Trạng thái ảnh"
          onPress={() => router.push(REPORTER_UPLOADS)}
        />
      </View>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  subtitle: { color: colors.secondary, marginTop: spacing.xs, marginBottom: spacing.lg },
  locationCard: {
    backgroundColor: colors.surface,
    padding: spacing.cardPadding,
    borderRadius: radius.xl,
    ...softShadow,
    marginBottom: spacing.lg,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  locationText: { color: colors.secondary, flex: 1 },
  retry: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 48, paddingHorizontal: spacing.sm },
  retryText: { color: colors.brandGold },
  pressed: { opacity: 0.85 },
  label: { color: colors.secondary, marginBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  thumbWrapper: { position: 'relative' },
  thumb: { width: 88, height: 88, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  thumbRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTile: {
    width: 88,
    height: 88,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.brandGold,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  addText: { color: colors.brandGold },
  loadingText: { color: colors.secondary, marginBottom: spacing.sm },
  list: { gap: spacing.sm, marginBottom: spacing.lg },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.cardPadding,
    gap: spacing.xs,
  },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowTitle: { color: colors.neutral, flex: 1 },
  rowSize: { color: colors.secondary },
  stateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  stateVerified: { color: colors.success },
  stateFailed: { color: colors.error, flex: 1 },
  statePending: { color: colors.info },
  emptyText: { color: colors.secondary },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  errorText: { color: colors.error, flex: 1 },
  footer: { gap: spacing.sm },
});

import React, { useEffect, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { File } from 'expo-file-system';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Button } from '../../src/components/Button';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import {
  MAX_PHOTO_BYTES,
  locationSourceFor,
  normalizePhotoMediaType,
  sha256HexOfBytes,
} from '../../src/api/uploads';
import {
  UPLOAD_STATE_LABELS,
  useUploadsStore,
  type UploadQueueItem,
} from '../../src/store/uploads';
import { useAuthStore } from '../../src/store/auth';
import { REPORTER_REPORT, REPORTER_UPLOADS } from '../../src/constants/routes';

const softShadow = Platform.select({
  ios: { shadowColor: '#1A1D20', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  android: { elevation: 3 },
  default: {},
});

/** RPT-05: tối đa 3 ảnh hiện trường cho mỗi phản ánh. */
const MAX_PHOTOS = 3;

interface Coordinates {
  latitude: number;
  longitude: number;
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

  const items = useUploadsStore((state) => state.items);
  const hydrated = useUploadsStore((state) => state.hydrated);
  const hydrate = useUploadsStore((state) => state.hydrate);
  const enqueuePhoto = useUploadsStore((state) => state.enqueuePhoto);
  const advanceAll = useUploadsStore((state) => state.advanceAll);
  const removeItem = useUploadsStore((state) => state.removeItem);

  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [locationStatus, setLocationStatus] = useState('Đang lấy vị trí...');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void hydrate(partitionId);
  }, [hydrate, partitionId]);

  const requestLocation = async () => {
    setLocationStatus('Đang lấy vị trí...');
    try {
      const current = await Location.getForegroundPermissionsAsync();
      let granted = current.status === 'granted';
      if (!granted) {
        const requested = await Location.requestForegroundPermissionsAsync();
        granted = requested.status === 'granted';
      }
      if (!granted) {
        setCoordinates(null);
        setLocationStatus('Không có tọa độ (ảnh sẽ ghi nguồn UNKNOWN)');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setCoordinates({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      setLocationStatus(
        `${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`,
      );
    } catch {
      setCoordinates(null);
      setLocationStatus('Không có tọa độ (ảnh sẽ ghi nguồn UNKNOWN)');
    }
  };

  useEffect(() => {
    void requestLocation();
  }, []);

  const ingestAsset = async (asset: ImagePicker.ImagePickerAsset) => {
    setError(null);
    const fallbackExtension = (asset.mimeType ?? '').includes('png') ? 'png' : 'jpg';
    const fileName = asset.fileName?.trim() || `hien-truong-${Date.now()}.${fallbackExtension}`;
    const mediaType = normalizePhotoMediaType(fileName, asset.mimeType);
    if (!mediaType) {
      setError('Chỉ hỗ trợ ảnh JPEG hoặc PNG.');
      return;
    }

    setBusy(true);
    try {
      const bytes = new Uint8Array(await new File(asset.uri).arrayBuffer());
      if (bytes.byteLength <= 0) {
        setError('Không đọc được nội dung ảnh. Vui lòng chụp lại.');
        return;
      }
      if (bytes.byteLength > MAX_PHOTO_BYTES) {
        setError('Ảnh vượt quá 20 MiB. Vui lòng chọn ảnh nhỏ hơn.');
        return;
      }
      const checksumSha256 = await sha256HexOfBytes(bytes);
      await enqueuePhoto({
        uriLocal: asset.uri,
        fileName,
        mediaType,
        sizeBytes: bytes.byteLength,
        checksumSha256,
        locationSource: locationSourceFor(Boolean(coordinates)),
        latitude: coordinates?.latitude ?? null,
        longitude: coordinates?.longitude ?? null,
        partitionId,
      });
      await advanceAll();
    } catch {
      setError('Không xử lý được ảnh đã chọn. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  const takePhoto = async () => {
    setError(null);
    if (items.length >= MAX_PHOTOS) {
      setError(`Chỉ được gửi tối đa ${MAX_PHOTOS} ảnh cho mỗi phản ánh.`);
      return;
    }
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('Cần cấp quyền camera để chụp ảnh hiện trường.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      exif: false,
    });
    if (!result.canceled && result.assets.length > 0) {
      await ingestAsset(result.assets[0]);
    }
  };

  const pickFromLibrary = async () => {
    setError(null);
    if (items.length >= MAX_PHOTOS) {
      setError(`Chỉ được gửi tối đa ${MAX_PHOTOS} ảnh cho mỗi phản ánh.`);
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Cần cấp quyền truy cập thư viện ảnh để chọn ảnh.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      exif: false,
      allowsMultipleSelection: false,
    });
    if (!result.canceled && result.assets.length > 0) {
      await ingestAsset(result.assets[0]);
    }
  };

  const verifiedCount = items.filter((item) => item.mediaState === 'VERIFIED').length;
  const canSubmit = items.length > 0 && verifiedCount === items.length;

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

  return (
    <SafeAreaScreen scroll>
      <Text style={[typography.titleLg, styles.title]}>Ảnh hiện trường</Text>
      <Text style={[typography.caption, styles.subtitle]}>
        Ảnh được tải lên dạng tệp riêng tư, có kiểm tra toàn vẹn SHA-256. Chỉ gửi phản ánh được khi mọi
        ảnh đã xác minh xong.
      </Text>

      <View style={styles.locationCard}>
        <View style={styles.locationRow}>
          <MaterialIcons
            name={coordinates ? 'my-location' : 'location-off'}
            size={16}
            color={coordinates ? colors.success : colors.secondary}
          />
          <Text style={[typography.caption, styles.locationText]}>{locationStatus}</Text>
          <Pressable
            onPress={requestLocation}
            style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Lấy lại vị trí"
            testID="capture-retry-location"
          >
            <MaterialIcons name="refresh" size={16} color={colors.brandGold} />
            <Text style={[typography.caption, styles.retryText]}>Thử lại</Text>
          </Pressable>
        </View>
      </View>

      <Text style={[typography.labelLg, styles.label]}>
        Ảnh đã chọn ({items.length}/{MAX_PHOTOS})
      </Text>
      <View style={styles.grid}>
        {items.map((item) => (
          <View key={item.id} style={styles.thumbWrapper}>
            <Image source={{ uri: item.uriLocal }} style={styles.thumb} />
            <Pressable
              onPress={() => void removeItem(item.id)}
              style={styles.thumbRemove}
              accessibilityRole="button"
              accessibilityLabel={`Xoá ảnh ${item.fileName}`}
              testID={`capture-remove-${item.id}`}
            >
              <MaterialIcons name="close" size={16} color={colors.onPrimary} />
            </Pressable>
          </View>
        ))}
        {items.length < MAX_PHOTOS ? (
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
        ) : null}
        {items.length < MAX_PHOTOS ? (
          <Pressable
            onPress={() => void pickFromLibrary()}
            disabled={busy}
            style={({ pressed }) => [styles.addTile, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Chọn ảnh từ thư viện"
            testID="capture-pick-photo"
          >
            <MaterialIcons name="photo-library" size={24} color={colors.primary} />
            <Text style={[typography.caption, styles.addText]}>Thư viện</Text>
          </Pressable>
        ) : null}
      </View>

      {!hydrated ? (
        <Text style={[typography.caption, styles.loadingText]}>Đang tải hàng đợi ảnh...</Text>
      ) : null}

      <View style={styles.list}>
        {items.map((item) => (
          <View key={`row-${item.id}`} style={styles.row}>
            <View style={styles.rowHeader}>
              <Text style={[typography.labelLg, styles.rowTitle]} numberOfLines={1}>
                {item.fileName}
              </Text>
              <Text style={[typography.caption, styles.rowSize]}>{formatBytes(item.sizeBytes)}</Text>
            </View>
            {renderState(item)}
          </View>
        ))}
        {items.length === 0 ? (
          <Text style={[typography.caption, styles.emptyText]}>
            Chưa có ảnh nào. Chụp hoặc chọn ảnh hiện trường để bắt đầu.
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
          title={canSubmit ? 'Tiếp tục gửi phản ánh' : `Đang xác minh ${verifiedCount}/${items.length} ảnh`}
          onPress={() => router.push(REPORTER_REPORT)}
          disabled={!canSubmit}
        />
        <Button
          variant="secondary"
          title="Mở hàng đợi xác minh"
          onPress={() => router.push(REPORTER_UPLOADS)}
        />
      </View>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.brandGold },
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
  retry: { flexDirection: 'row', alignItems: 'center', gap: 2 },
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

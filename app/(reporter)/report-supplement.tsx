import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CameraCapturedPicture, CameraView, useCameraPermissions } from 'expo-camera';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import { File } from 'expo-file-system';
import type { AxiosError } from 'axios';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Button } from '../../src/components/Button';
import { InputField } from '../../src/components/InputField';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import {
  getOwnReportReal,
  submitReportSupplementReal,
  type OwnReportDto,
  type ReportEvidenceInputDto,
} from '../../src/api/reporterApi';
import {
  MAX_PHOTO_BYTES,
  locationSourceFor,
  normalizePhotoMediaType,
  sha256HexOfBytes,
} from '../../src/api/uploads';
import { hasUsableCoordinate, isZeroCoordinate } from '../../src/types/position';
import { parseProblemDetails } from '../../src/api/problemDetails';
import { useUploadsStore } from '../../src/store/uploads';
import { useReporterStore } from '../../src/store/reporter';
import { useAuthStore } from '../../src/store/auth';
import { clearCommandKey, getOrCreateCommandKey } from '../../src/api/idempotency';
import { REPORTER_REPORT_DETAIL } from '../../src/constants/routes';
import { uuidv4 } from '../../src/utils/uuid';

const softShadow = Platform.select({
  ios: { shadowColor: '#1A1D20', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  android: { elevation: 3 },
  default: {},
});

const MAX_PHOTOS = 3;

type Phase = 'loading' | 'ready' | 'conflict' | 'submitting' | 'done' | 'failed';

function formatTime(iso: string) {
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

export default function ReporterReportSupplementScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ reportId?: string }>();
  const reportId = typeof params.reportId === 'string' ? params.reportId : '';

  const user = useAuthStore((state) => state.user);
  const verifiedEmail = useReporterStore((state) => state.verifiedEmail);
  const activeEmail = user?.phone_or_email || verifiedEmail || undefined;

  const enqueuePhoto = useUploadsStore((state) => state.enqueuePhoto);
  const advanceAll = useUploadsStore((state) => state.advanceAll);

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  const [report, setReport] = useState<OwnReportDto | null>(null);
  const [expectedVersion, setExpectedVersion] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [coords, setCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracyMeters: number | null;
  } | null>(null);

  const [phase, setPhase] = useState<Phase>('loading');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** uri cục bộ → id hàng đợi upload, tránh tạo phiên trùng khi người dân bấm gửi lại. */
  const uploadedItemIds = useRef<Map<string, string>>(new Map());
  /** uri cục bộ → metadata file gốc khi chọn qua DocumentPicker */
  const photoMetaRef = useRef<Map<string, { fileName?: string; mimeType?: string }>>(new Map());

  useEffect(() => {
    setNotice(null);
  }, [phase]);

  // Cố gắng lấy tọa độ thiết bị (không bắt buộc, nếu có thì gắn CAPTURE, không có thì UNKNOWN)
  useEffect(() => {
    (async () => {
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        if (perm.status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (!isZeroCoordinate(loc.coords.latitude, loc.coords.longitude)) {
            setCoords({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              accuracyMeters: loc.coords.accuracy ?? null,
            });
          }
        }
      } catch {
        // Không có GPS thì tiếp tục với UNKNOWN
      }
    })();
  }, []);

  const loadReport = useCallback(async () => {
    if (!reportId || !activeEmail) {
      setPhase('failed');
      setError('Không tìm thấy phản ánh của bạn.');
      return;
    }
    setError(null);
    try {
      const found = await getOwnReportReal(reportId);
      setReport(found.report);
      setExpectedVersion(found.etag);
      setLoadedAt(new Date().toISOString());
      setPhase('ready');
    } catch (caught) {
      const axErr = caught as AxiosError | undefined;
      const problem = parseProblemDetails(axErr?.response?.data);
      setPhase('failed');
      setError(problem.detail ?? problem.title ?? 'Không tải được phản ánh. Vui lòng thử lại.');
    }
  }, [reportId, activeEmail]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const handlePickImage = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        photoMetaRef.current.set(asset.uri, {
          fileName: asset.name,
          mimeType: asset.mimeType,
        });
        setPhotos((current) => [...current, asset.uri].slice(0, MAX_PHOTOS));
        if (error) {
          setError(null);
        }
      }
    } catch {
      // ignore
    }
  };

  const handleOpenCam = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        setError('Cần cấp quyền camera để chụp ảnh hiện trường.');
        return;
      }
    }
    setCameraReady(false);
    setCameraOpen(true);
  };

  const handleCapture = async () => {
    if (!cameraReady || photos.length >= MAX_PHOTOS) {
      return;
    }
    const photo: CameraCapturedPicture | undefined = await cameraRef.current?.takePictureAsync();
    if (photo?.uri) {
      setPhotos((current) => [...current, photo.uri].slice(0, MAX_PHOTOS));
      setCameraOpen(false);
      if (error) {
        setError(null);
      }
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((current) => current.filter((_, i) => i !== index));
  };

  /**
   * Đưa ảnh vào hàng đợi upload rồi chờ BE xác minh.
   * Chỉ ảnh VERIFIED mới có fileId/fileVersion để gửi kèm supplement.
   */
  const uploadEvidence = async (): Promise<ReportEvidenceInputDto[]> => {
    const usable = hasUsableCoordinate(coords?.latitude, coords?.longitude);
    for (const uri of photos) {
      if (uploadedItemIds.current.has(uri)) {
        continue;
      }
      const meta = photoMetaRef.current.get(uri);
      const rawName = meta?.fileName || uri.split('/').pop() || `bo-sung-${uuidv4()}.jpg`;
      const fileName = rawName.includes('.') ? rawName : `${rawName}.jpg`;
      const mediaType = normalizePhotoMediaType(fileName, meta?.mimeType);
      if (!mediaType) {
        throw new Error('validation_error');
      }

      let bytes: Uint8Array;
      try {
        bytes = new Uint8Array(await new File(uri).arrayBuffer());
      } catch {
        const res = await fetch(uri);
        const buf = await res.arrayBuffer();
        bytes = new Uint8Array(buf);
      }

      if (bytes.byteLength <= 0 || bytes.byteLength > MAX_PHOTO_BYTES) {
        throw new Error('validation_error');
      }

      const checksumSha256 = await sha256HexOfBytes(bytes);
      const itemId = await enqueuePhoto({
        uriLocal: uri,
        fileName,
        mediaType,
        sizeBytes: bytes.byteLength,
        checksumSha256,
        capturedAt: new Date().toISOString(),
        locationSource: locationSourceFor(usable),
        latitude: usable ? coords?.latitude ?? null : null,
        longitude: usable ? coords?.longitude ?? null : null,
        accuracyMeters: usable ? coords?.accuracyMeters ?? null : null,
      });
      uploadedItemIds.current.set(uri, itemId);
    }

    await advanceAll();

    const items = useUploadsStore.getState().items;
    const evidence: ReportEvidenceInputDto[] = [];
    for (const uri of photos) {
      const itemId = uploadedItemIds.current.get(uri);
      const item = items.find((entry) => entry.id === itemId);
      if (!item || item.mediaState !== 'VERIFIED' || !item.fileId) {
        throw new Error('source_not_ready');
      }
      evidence.push({
        fileId: item.fileId,
        fileVersion: item.verifiedVersion,
        locationSource: item.locationSource,
        capturedAt: item.capturedAt,
        location:
          item.latitude !== null && item.longitude !== null
            ? {
                latitude: item.latitude,
                longitude: item.longitude,
                accuracyMeters: item.accuracyMeters,
              }
            : null,
      });
    }
    return evidence;
  };

  const submit = async () => {
    if (!report || !expectedVersion) {
      return;
    }
    if (!description.trim()) {
      setError('Vui lòng nhập nội dung bổ sung.');
      return;
    }
    if (photos.length === 0) {
      setError('Vui lòng chọn hoặc chụp ít nhất một ảnh hiện trường bổ sung.');
      return;
    }

    setError(null);
    setPhase('submitting');
    const supplementScope = `reporter:supplement:${report.id}:${expectedVersion}`;
    const ifMatchHeader = expectedVersion.startsWith('"')
      ? expectedVersion
      : `"${expectedVersion}"`;

    try {
      const evidence = await uploadEvidence();
      const result = await submitReportSupplementReal(
        report.id,
        { description: description.trim(), evidence },
        getOrCreateCommandKey(supplementScope),
        ifMatchHeader,
      );
      clearCommandKey(supplementScope);
      setReport(result.report);
      setExpectedVersion(result.etag);
      setLoadedAt(new Date().toISOString());
      setDescription('');
      setPhotos([]);
      uploadedItemIds.current.clear();
      setNotice('Đã gửi thông tin bổ sung.');
      setPhase('done');
    } catch (caught) {
      if (caught instanceof Error && caught.message === 'source_not_ready') {
        setPhase('ready');
        setError('Ảnh chưa xác minh xong. Vui lòng chờ vài giây rồi gửi lại.');
        return;
      }
      if (caught instanceof Error && caught.message === 'validation_error') {
        setPhase('ready');
        setError('Ảnh hiện trường chưa hợp lệ. Vui lòng kiểm tra lại ảnh.');
        return;
      }

      const axErr = caught as AxiosError | undefined;
      const problem = parseProblemDetails(axErr?.response?.data);
      const code = problem.code ?? (caught as Error)?.message ?? null;

      // 1. Nếu BE trả mã concurrency_conflict (412 hoặc 409) → nạp bản mới và bật conflict UI
      if (code === 'concurrency_conflict') {
        try {
          const fresh = await getOwnReportReal(report.id);
          setReport(fresh.report);
          setExpectedVersion(fresh.etag);
          setLoadedAt(new Date().toISOString());
        } catch {
          // ignore
        }
        setPhase('conflict');
        return;
      }

      // 2. Nếu BE trả validation_error:
      // Kiểm tra fallback mục 5.4(c): gọi lại detail, so version mới với expectedVersion lúc load
      if (code === 'validation_error') {
        try {
          const fresh = await getOwnReportReal(report.id);
          const rawFreshVersion = (fresh.etag || fresh.report.version || '').replace(/^"|"$/g, '');
          const rawExpectedVersion = (expectedVersion || '').replace(/^"|"$/g, '');
          if (rawFreshVersion && rawFreshVersion !== rawExpectedVersion) {
            // Version đã đổi trên máy chủ → bật đúng conflict UI
            setReport(fresh.report);
            setExpectedVersion(fresh.etag);
            setLoadedAt(new Date().toISOString());
            setPhase('conflict');
            return;
          }
        } catch {
          // ignore
        }

        // Version không đổi → lỗi validation input thật (KHÔNG bật conflict UI)
        setPhase('ready');
        const fieldMsg = problem.fieldErrors
          ? Object.values(problem.fieldErrors).flat()[0]
          : null;
        setError(fieldMsg ?? problem.detail ?? 'Thông tin bổ sung chưa hợp lệ. Vui lòng kiểm tra lại.');
        return;
      }

      // 3. Các lỗi khác
      setPhase('ready');
      setError(problem.detail ?? problem.title ?? 'Không gửi được thông tin bổ sung. Vui lòng thử lại.');
    }
  };

  const keepMine = () => {
    setNotice('Đã nạp phiên bản mới nhất — bấm “Gửi bổ sung” để gửi lại nội dung của bạn.');
    setPhase('ready');
  };

  const takeLatest = async () => {
    if (!report || !activeEmail) {
      return;
    }
    setError(null);
    try {
      const found = await getOwnReportReal(report.id);
      setReport(found.report);
      setExpectedVersion(found.etag);
      setLoadedAt(new Date().toISOString());
      setNotice('Đã tải bản mới nhất. Nội dung bạn đang nhập vẫn được giữ nguyên.');
      setPhase('ready');
    } catch {
      setError('Không tải được bản mới nhất. Vui lòng thử lại.');
      setPhase('ready');
    }
  };

  const busy = phase === 'loading' || phase === 'submitting';

  return (
    <SafeAreaScreen scroll>
      <Text style={[typography.titleLg, styles.title]}>Bổ sung thông tin phản ánh</Text>
      <Text style={[typography.caption, styles.subtitle]}>
        Gửi thêm thông tin cho phản ánh đã tạo. Nếu phản ánh đã thay đổi ở nơi khác, hệ thống sẽ cảnh
        báo xung đột phiên bản.
      </Text>

      {report ? (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="description" size={18} color={colors.brandGold} />
            <Text style={[typography.labelLg, styles.cardTitle]}>
              Phản ánh gửi lúc {formatTime(report.createdAt)}
            </Text>
          </View>
          <Text style={[typography.caption, styles.cardText]}>
            {report.description?.trim() || 'Chưa có mô tả'}
          </Text>
          {loadedAt ? (
            <Text style={[typography.caption, styles.cardMeta]}>
              Bản đang xem tải lúc {formatTime(loadedAt)}
            </Text>
          ) : null}
        </View>
      ) : null}

      {phase === 'conflict' ? (
        <View style={styles.conflictCard}>
          <View style={styles.conflictHeader}>
            <MaterialIcons name="sync-problem" size={18} color={colors.warning} />
            <Text style={[typography.labelLg, styles.conflictTitle]}>
              Phát hiện xung đột phiên bản
            </Text>
          </View>
          <Text style={[typography.caption, styles.conflictText]}>
            Phản ánh đã được cập nhật ở nơi khác. Chọn giữ nội dung bạn đang soạn, hoặc tải bản mới
            nhất trước khi gửi.
          </Text>
          <View style={styles.conflictActions}>
            <Button variant="secondary" title="Giữ bản của tôi" onPress={keepMine} />
            <Button variant="text" title="Tải bản mới nhất" onPress={() => void takeLatest()} />
          </View>
        </View>
      ) : null}

      {report ? (
        <>
          <InputField
            label="Nội dung bổ sung"
            value={description}
            onChangeText={(text) => {
              setDescription(text);
              if (error) {
                setError(null);
              }
            }}
            placeholder="Mô tả thêm tình trạng hiện trường, thời điểm, hướng xử lý mong muốn..."
            multiline
            numberOfLines={5}
            testID="supplement-description-input"
          />

          <Text style={[typography.labelLg, styles.sectionLabel]}>
            Ảnh hiện trường bổ sung ({photos.length}/{MAX_PHOTOS})
          </Text>
          <View style={styles.photoGrid}>
            {photos.map((uri, index) => (
              <View key={`${uri}-${index}`} style={styles.photoWrapper}>
                <Image source={{ uri }} style={styles.photo} />
                <Pressable
                  onPress={() => handleRemovePhoto(index)}
                  style={styles.photoRemove}
                  accessibilityRole="button"
                  accessibilityLabel={`Xoá ảnh ${index + 1}`}
                  testID={`remove-photo-${index}`}
                >
                  <MaterialIcons name="close" size={16} color={colors.onPrimary} />
                </Pressable>
              </View>
            ))}
            {photos.length < MAX_PHOTOS ? (
              <Pressable
                onPress={() => void handleOpenCam()}
                style={({ pressed }) => [styles.photoAdd, pressed && styles.photoAddPressed]}
                accessibilityRole="button"
                accessibilityLabel="Chụp ảnh hiện trường"
                testID="add-photo"
              >
                <MaterialIcons name="photo-camera" size={24} color={colors.brandGold} />
                <Text style={[typography.caption, styles.photoAddText]}>Chụp ảnh</Text>
              </Pressable>
            ) : null}
            {photos.length < MAX_PHOTOS ? (
              <Pressable
                onPress={() => void handlePickImage()}
                style={({ pressed }) => [styles.photoAdd, pressed && styles.photoAddPressed]}
                accessibilityRole="button"
                accessibilityLabel="Chọn ảnh từ thư viện"
                testID="pick-photo"
              >
                <MaterialIcons name="photo-library" size={24} color={colors.primary} />
                <Text style={[typography.caption, styles.photoAddText]}>Thư viện</Text>
              </Pressable>
            ) : null}
          </View>

          <Button
            variant="primary"
            title="Gửi bổ sung"
            onPress={() => void submit()}
            loading={phase === 'submitting'}
            disabled={!description.trim() || photos.length === 0 || busy}
          />
        </>
      ) : null}

      {phase === 'done' && report ? (
        <View style={styles.doneWrapper}>
          <Button
            variant="secondary"
            title="Quay lại chi tiết phản ánh"
            onPress={() =>
              router.replace({
                pathname: REPORTER_REPORT_DETAIL,
                params: { reportId: report.id },
              })
            }
          />
        </View>
      ) : null}

      {notice ? (
        <View style={styles.noticeRow}>
          <MaterialIcons name="info-outline" size={16} color={colors.info} />
          <Text style={[typography.caption, styles.noticeText]}>{notice}</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorRow}>
          <MaterialIcons name="error-outline" size={16} color={colors.error} />
          <Text style={[typography.caption, styles.errorText]}>{error}</Text>
        </View>
      ) : null}

      {busy ? (
        <Text style={[typography.caption, styles.busyText]}>
          {phase === 'loading' ? 'Đang tải phản ánh...' : 'Đang gửi bổ sung...'}
        </Text>
      ) : null}

      <Modal visible={cameraOpen} animationType="slide" onRequestClose={() => setCameraOpen(false)}>
        <View style={styles.cameraModal}>
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="back"
            onCameraReady={() => setCameraReady(true)}
          />
          <View style={styles.cameraTopBar}>
            <Pressable
              onPress={() => setCameraOpen(false)}
              style={styles.cameraClose}
              accessibilityRole="button"
              accessibilityLabel="Đóng camera"
            >
              <MaterialIcons name="close" size={24} color={colors.onPrimary} />
            </Pressable>
            <Text style={[typography.titleMd, styles.cameraTitle]}>
              Ảnh {photos.length + 1}/{MAX_PHOTOS}
            </Text>
            <View style={styles.cameraClose} />
          </View>
          <View style={styles.cameraFooter}>
            <Pressable
              onPress={() => void handleCapture()}
              disabled={!cameraReady}
              style={({ pressed }) => [styles.shutter, pressed && styles.shutterPressed]}
              accessibilityRole="button"
              accessibilityLabel="Chụp ảnh"
              testID="camera-shutter"
            >
              <MaterialIcons name="camera" size={28} color={colors.onPrimary} />
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.brandGold },
  subtitle: { color: colors.secondary, marginTop: spacing.xs, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.cardPadding,
    gap: spacing.xs,
    marginBottom: spacing.lg,
    ...softShadow,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitle: { color: colors.neutral, flex: 1 },
  cardText: { color: colors.secondary },
  cardMeta: { color: colors.brandGold },
  conflictCard: {
    backgroundColor: '#FFF8E6',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.warning,
    padding: spacing.cardPadding,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  conflictHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  conflictTitle: { color: colors.neutral, flex: 1 },
  conflictText: { color: colors.secondary },
  conflictActions: { gap: spacing.sm },
  sectionLabel: { color: colors.secondary, marginBottom: spacing.sm, marginTop: spacing.sm },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  photoWrapper: { position: 'relative' },
  photo: { width: 88, height: 88, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  photoRemove: {
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
  photoAdd: {
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
  photoAddPressed: { backgroundColor: colors.surfaceAlt },
  photoAddText: { color: colors.brandGold },
  doneWrapper: { marginTop: spacing.md },
  noticeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md },
  noticeText: { color: colors.info, flex: 1 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md },
  errorText: { color: colors.error, flex: 1 },
  busyText: { color: colors.secondary, marginTop: spacing.sm },
  cameraModal: { flex: 1, backgroundColor: colors.neutral },
  cameraTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: 'rgba(26, 29, 32, 0.7)',
  },
  cameraClose: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  cameraTitle: { color: colors.onPrimary },
  cameraFooter: { alignItems: 'center', paddingBottom: spacing.xl, paddingTop: spacing.lg },
  shutter: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    borderWidth: 4,
    borderColor: colors.brandGold,
    backgroundColor: 'rgba(218, 165, 32, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterPressed: { opacity: 0.8 },
});

import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CameraCapturedPicture, CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Button } from '../../src/components/Button';
import { InputField } from '../../src/components/InputField';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import {
  submitReportReal,
  type CreateReporterReportRequestDto,
  type ReportEvidenceInputDto,
} from '../../src/api/reporterApi';
import {
  MAX_PHOTO_BYTES,
  locationSourceFor,
  normalizePhotoMediaType,
  sha256HexOfBytes,
} from '../../src/api/uploads';
import { hasUsableCoordinate, isZeroCoordinate } from '../../src/types/position';
import { useUploadsStore } from '../../src/store/uploads';
import { openDatabase, initDatabase, upsertOffline } from '../../src/offline/database';
import { useReporterStore } from '../../src/store/reporter';
import { useAuthStore } from '../../src/store/auth';
import { REPORTER_REPORT_DETAIL } from '../../src/constants/routes';
import { RoleCode } from '../../src/types/enums';
import { clearCommandKey, getOrCreateCommandKey } from '../../src/api/idempotency';
import { uuidv4 } from '../../src/utils/uuid';

const softShadow = Platform.select({
  ios: { shadowColor: '#1A1D20', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  android: { elevation: 3 },
  default: {},
});

const MAX_PHOTOS = 3;
const MIN_DESCRIPTION = 10;
const SUBMIT_FALLBACK_ERROR = 'Không thể gửi phản ánh. Vui lòng thử lại sau.';

/** Mã lỗi ProblemDetails từ mock API → thông báo tiếng Việt cho người dân. */
const errorMessages: Record<string, string> = {
  validation_error: 'Thông tin phản ánh chưa hợp lệ. Vui lòng kiểm tra lại mô tả và ảnh.',
  precondition_required: 'Thiếu khoá chống gửi trùng. Vui lòng thử lại.',
  idempotency_key_reused: 'Lần gửi trước đã dùng cho nội dung khác. Vui lòng thử lại.',
  source_not_ready: 'Ảnh chưa xác minh xong. Vui lòng chờ vài giây rồi gửi lại.',
  not_found: 'Không tìm thấy ảnh đã tải lên. Vui lòng chụp lại.',
  auth_unauthorized: 'Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.',
};

interface Coords {
  latitude: number;
  longitude: number;
  /** Bán kính sai số GPS (mét, 68%); `null` khi thiết bị không cung cấp. */
  accuracyMeters: number | null;
}

export default function ReporterReportScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);

  const [description, setDescription] = useState('');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [gpsStatus, setGpsStatus] = useState('Đang lấy vị trí...');
  const [gpsLoading, setGpsLoading] = useState(true);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Một bản nháp = một phiên lệnh. Key idempotent bám theo draftId, không bám theo Date.now().
  const draftIdRef = useRef<string | null>(null);
  const ensureDraftId = () => {
    if (!draftIdRef.current) {
      draftIdRef.current = uuidv4();
    }
    return draftIdRef.current;
  };
  const resetDraftId = () => {
    draftIdRef.current = null;
  };

  const user = useAuthStore((state) => state.user);
  const verifiedEmail = useReporterStore((state) => state.verifiedEmail);
  const setPendingReport = useReporterStore((state) => state.setPendingReport);
  const clearPendingReport = useReporterStore((state) => state.clearPendingReport);
  const enqueuePhoto = useUploadsStore((state) => state.enqueuePhoto);
  const advanceAll = useUploadsStore((state) => state.advanceAll);
  /** uri cục bộ → id hàng đợi upload, tránh tạo phiên trùng khi người dân bấm gửi lại. */
  const uploadedItemIds = useRef<Map<string, string>>(new Map());

  /**
   * Phiên Reporter hiện có: tài khoản đã đăng nhập đúng vai trò, hoặc email đã xác thực OTP.
   * Chưa có phiên ⇒ form vẫn dùng được (nháp local), chỉ khi bấm Gửi mới yêu cầu đăng nhập.
   */
  const sessionEmail =
    (user?.role_code === RoleCode.REPORTER ? user.phone_or_email : null) ||
    verifiedEmail ||
    null;

  const requestLocation = async () => {
    setGpsLoading(true);
    setGpsStatus('Đang lấy vị trí...');
    try {
      const permissionStatus = await Location.getForegroundPermissionsAsync();
      let granted = permissionStatus.status === 'granted';
      if (!granted) {
        const requested = await Location.requestForegroundPermissionsAsync();
        granted = requested.status === 'granted';
      }
      if (!granted) {
        setCoords(null);
        setGpsStatus('Chưa có tọa độ');
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      if (isZeroCoordinate(location.coords.latitude, location.coords.longitude)) {
        // Thiết bị trả (0,0) = chưa có fix GPS → không bịa toạ độ, chặn gửi.
        setCoords(null);
        setGpsStatus('Chưa có tọa độ (thiết bị chưa bắt được GPS)');
        return;
      }
      setCoords({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracyMeters:
          typeof location.coords.accuracy === 'number' && Number.isFinite(location.coords.accuracy)
            ? location.coords.accuracy
            : null,
      });
      setGpsStatus(
        `${location.coords.latitude.toFixed(5)}, ${location.coords.longitude.toFixed(5)}`,
      );
      setErrors((current) => ({ ...current, coords: '' }));
    } catch {
      setCoords(null);
      setGpsStatus('Chưa có tọa độ');
    } finally {
      setGpsLoading(false);
    }
  };

  useEffect(() => {
    void requestLocation();
  }, []);

  const handleCapture = async () => {
    if (!cameraReady || photos.length >= MAX_PHOTOS) {
      return;
    }
    const photo: CameraCapturedPicture | undefined = await cameraRef.current?.takePictureAsync();
    if (photo?.uri) {
      setPhotos((current) => [...current, photo.uri].slice(0, MAX_PHOTOS));
      setCameraOpen(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        setPhotos((current) => [...current, res.assets[0].uri].slice(0, MAX_PHOTOS));
      }
    } catch {
      // ignore
    }
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (description.trim().length < MIN_DESCRIPTION) {
      next.description = `Mô tả tối thiểu ${MIN_DESCRIPTION} ký tự để đội nghiệp vụ xác định vị trí.`;
    }
    if (!coords) {
      next.coords = 'Chưa lấy được tọa độ. Vui lòng bật GPS rồi thử lại.';
    }
    if (photos.length === 0) {
      next.photos = 'Vui lòng chụp hoặc chọn ít nhất một ảnh hiện trường.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const saveDraft = async (payload: CreateReporterReportRequestDto) => {
    try {
      const db = openDatabase();
      await initDatabase(db);
      const now = new Date().toISOString();
      await upsertOffline(db, 'local_draft', `defect-report-${ensureDraftId()}`, {
        kind: 'defect_report',
        payload: JSON.stringify(payload),
        created_at: now,
        updated_at: now,
      });
    } catch {
      return;
    }
  };

  /**
   * Đưa ảnh vào hàng đợi API-211/213 rồi chờ API-208 xác minh — chỉ ảnh VERIFIED
   * mới có `fileId` để gửi kèm phản ánh.
   */
  const uploadEvidence = async (): Promise<ReportEvidenceInputDto[]> => {
    const usable = hasUsableCoordinate(coords?.latitude, coords?.longitude);
    for (const uri of photos) {
      if (uploadedItemIds.current.has(uri)) {
        continue;
      }
      const fileName = uri.split('/').pop() || `hien-truong-${uuidv4()}.jpg`;
      const mediaType = normalizePhotoMediaType(fileName, null);
      if (!mediaType) {
        throw new Error('validation_error');
      }
      const bytes = new Uint8Array(await new File(uri).arrayBuffer());
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

  const handleSubmit = async () => {
    setSubmitError(null);
    if (!validate() || !coords) {
      return;
    }

    setSubmitting(true);
    const draftId = ensureDraftId();
    try {
      const evidence = await uploadEvidence();
      const payload: CreateReporterReportRequestDto = {
        description: description.trim(),
        evidence,
      };
      await saveDraft(payload);

      if (!sessionEmail) {
        // Chưa đăng nhập: giữ nháp trong store rồi sang cụm auth; đăng nhập xong sẽ tự nộp.
        setPendingReport(payload, draftId);
        router.push('/(auth)');
        return;
      }

      const submitScope = `reporter:submit:${draftId}`;
      const { report } = await submitReportReal(payload, getOrCreateCommandKey(submitScope));
      clearCommandKey(submitScope);
      resetDraftId();
      clearPendingReport();
      setDescription('');
      setPhotos([]);
      uploadedItemIds.current.clear();
      router.replace({
        pathname: REPORTER_REPORT_DETAIL,
        params: { reportId: report.id },
      });
    } catch (err) {
      const apiCode = (err as { response?: { data?: { code?: string } } }).response?.data?.code;
      const code = apiCode ?? (err as Error).message;
      setSubmitError(errorMessages[code] ?? SUBMIT_FALLBACK_ERROR);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[typography.titleLg, styles.title]}>Gửi phản ánh khuyết tật</Text>
          <Text style={[typography.caption, styles.subtitle]}>
            Mô tả hiện trạng hư hại để Ban Quản lý dự án khảo sát và xử lý.
          </Text>

          <View style={styles.gpsCard}>
            <View style={styles.gpsRow}>
              <MaterialIcons
                name={coords ? 'my-location' : 'location-off'}
                size={16}
                color={coords ? colors.success : colors.error}
              />
              <Text style={[typography.caption, styles.gpsText]}>{gpsStatus}</Text>
              <Pressable
                onPress={requestLocation}
                disabled={gpsLoading}
                style={({ pressed }) => [styles.gpsRetry, pressed && styles.photoAddPressed]}
                accessibilityRole="button"
                accessibilityLabel="Lấy lại vị trí"
                testID="retry-location"
              >
                <MaterialIcons name="refresh" size={16} color={colors.brandGold} />
                <Text style={[typography.caption, styles.gpsRetryText]}>
                  {gpsLoading ? 'Đang lấy' : 'Thử lại'}
                </Text>
              </Pressable>
            </View>
            {errors.coords ? (
              <Text style={[typography.caption, styles.error]}>{errors.coords}</Text>
            ) : null}
          </View>

          <Text style={[typography.labelLg, styles.label]}>
            Ảnh hiện trường ({photos.length}/{MAX_PHOTOS})
          </Text>
          <View style={styles.photoGrid}>
            {photos.map((uri, index) => (
              <View key={`${uri}-${index}`} style={styles.photoWrapper}>
                <Image source={{ uri }} style={styles.photo} />
                <Pressable
                  onPress={() => setPhotos((current) => current.filter((_, i) => i !== index))}
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
                onPress={() => {
                  setCameraReady(false);
                  setCameraOpen(true);
                }}
                disabled={!permission?.granted}
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
                onPress={handlePickImage}
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
          {errors.photos ? (
            <Text style={[typography.caption, styles.error]}>{errors.photos}</Text>
          ) : null}
          {!permission?.granted ? (
            <View style={styles.permissionRow}>
              <Text style={[typography.caption, styles.gpsText]}>
                Cần cấp quyền camera để chụp ảnh hiện trường.
              </Text>
              <Button variant="secondary" title="Cấp quyền" onPress={requestPermission} />
            </View>
          ) : null}

          <InputField
            label="Mô tả hiện trạng"
            value={description}
            onChangeText={(text) => {
              setDescription(text);
              setErrors((current) => ({ ...current, description: '' }));
            }}
            placeholder="Mô tả vị trí, mức độ hư hại, thời gian quan sát được..."
            error={errors.description}
            multiline
            testID="reporter-description"
          />

          {submitError ? (
            <View style={styles.errorRow}>
              <MaterialIcons name="error-outline" size={16} color={colors.error} />
              <Text style={[typography.caption, styles.error]}>{submitError}</Text>
            </View>
          ) : null}

          <View style={styles.submitWrapper}>
            <Button
              variant="primary"
              title="Gửi phản ánh"
              onPress={handleSubmit}
              loading={submitting}
              disabled={submitting}
            />
            <Text style={[typography.caption, styles.submitHint]}>
              {sessionEmail
                ? 'Phản ánh sẽ được gửi trực tiếp đến Ban Quản lý dự án để tiếp nhận và khảo sát.'
                : 'Đăng nhập hoặc đăng ký để gửi phản ánh của bạn.'}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={cameraOpen} animationType="slide" onRequestClose={() => setCameraOpen(false)}>
        <View style={styles.cameraModal}>
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" onCameraReady={() => setCameraReady(true)} />
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
              onPress={handleCapture}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceAlt },
  flex: { flex: 1 },
  content: { padding: spacing.screenMargin, paddingBottom: spacing.xl },
  title: { color: colors.brandGold },
  subtitle: { color: colors.secondary, marginTop: spacing.xs, marginBottom: spacing.lg },
  label: { color: colors.secondary, marginBottom: spacing.sm },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  chip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipPressed: { opacity: 0.85 },
  chipText: { color: colors.secondary },
  chipTextSelected: { color: colors.onPrimary },
  gpsCard: {
    backgroundColor: colors.surface,
    padding: spacing.cardPadding,
    borderRadius: radius.xl,
    ...softShadow,
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  gpsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  gpsText: { color: colors.secondary, flex: 1 },
  gpsRetry: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  gpsRetryText: { color: colors.brandGold },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
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
  permissionRow: { gap: spacing.sm, marginBottom: spacing.md },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  error: { color: colors.error, flex: 1 },
  submitWrapper: { gap: spacing.sm, marginTop: spacing.sm },
  submitHint: { color: colors.secondary, textAlign: 'center' },
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
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterPressed: { backgroundColor: colors.primaryDark },
});

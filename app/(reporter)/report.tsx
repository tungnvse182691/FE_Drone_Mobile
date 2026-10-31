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
import { Button } from '../../src/components/Button';
import { InputField } from '../../src/components/InputField';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import {
  isReporterSession,
  normalizePhotoMediaType,
} from '../../src/api/uploads';
import { hasUsableCoordinate } from '../../src/types/position';
import { useUploadsStore, reporterContext } from '../../src/store/uploads';
import { useReporterStore, useReporterDraftScope, reporterFailureMessage, type DraftPhoto } from '../../src/store/reporter';
import { useAuthStore } from '../../src/store/auth';
import { preserveReporterPhoto, reporterPhotoFailureMessage } from '../../src/api/reporterLocalMedia';
import { REPORTER_REPORT_DETAIL, REPORTER_HOME } from '../../src/constants/routes';

const softShadow = Platform.select({
  ios: { shadowColor: '#1A1D20', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  android: { elevation: 3 },
  default: {},
});

const MAX_PHOTOS = 3;
const MIN_DESCRIPTION = 10;
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
  const captureInFlight = useRef(false);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const selectedPhotos = useRef<string[]>([]);
  const updatePhotos = (next: (current: string[]) => string[]) => {
    selectedPhotos.current = next(selectedPhotos.current);
    setPhotos(selectedPhotos.current);
  };

  const [description, setDescription] = useState('');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [gpsStatus, setGpsStatus] = useState('Đang lấy vị trí...');
  const [gpsLoading, setGpsLoading] = useState(true);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [restored, setRestored] = useState(false);
  const [restoreFailed, setRestoreFailed] = useState(false);
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const saves = useRef<Promise<unknown>>(Promise.resolve());
  const completed = useRef(false);
  const submitted = useRef(false);
  const photoMeta = useRef<Map<string, DraftPhoto>>(new Map());
  const queueItems = useUploadsStore(state => state.items);
  const draftLocked = useReporterStore(state => Boolean(state.pendingDraft?.request));
  const scope = useReporterDraftScope();
  const [dataScope, setDataScope] = useState('');
  const photoInputs = () => photos.map(uri => {
    let photo = photoMeta.current.get(uri);
    if (!photo) {
      const fileName = uri.split('/').pop() || 'hien-truong.jpg';
      photo = { uri, fileName, mediaType: normalizePhotoMediaType(fileName, null) || '', capturedAt: new Date().toISOString() };
      photoMeta.current.set(uri, photo);
    }
    return photo;
  });

  useEffect(() => {
    let active = true;
    const isCurrent = scope.capture();
    setRestored(false);
    setRestoreFailed(false); setDataScope('');
    setDescription(''); updatePhotos(() => []); setCoords(null); setCameraOpen(false);
    setErrors({}); setSubmitError(null); setSubmitting(false);
    photoMeta.current = new Map(); completed.current = false; submitted.current = false;
    void useReporterStore.getState().restorePendingDraft().then(draft => {
      if (!active || !isCurrent()) return;
      if (draft?.targetReportId) {
        router.replace({ pathname: '/(reporter)/report-supplement', params: { reportId: draft.targetReportId } });
        return;
      }
      setDescription(draft?.description ?? '');
      updatePhotos(() => draft?.photos.map(p => p.uri) ?? []);
      photoMeta.current = new Map(draft?.photos.map(p => [p.uri, p]) ?? []);
      const validCoords = hasUsableCoordinate(draft?.coords?.latitude, draft?.coords?.longitude) ? draft!.coords : null;
      setCoords(validCoords);
      if (validCoords || draft?.request) {
        setGpsStatus(validCoords ? 'Đã khôi phục vị trí của nháp' : 'Nháp chưa có tọa độ'); setGpsLoading(false);
      } else void requestLocation();
      setRestored(true);
      setDataScope(scope.key);
    }).catch(() => { if (active && isCurrent()) setRestoreFailed(true); });
    // Loading candidates only reads the existing owner/session ledger; it never dispatches.
    void useUploadsStore.getState().hydrate().catch(() => {
      if (active && isCurrent()) setSubmitError('Chưa đọc được ảnh trong hàng đợi. Nháp và ảnh vẫn được giữ; mở hàng đợi để thử tải lại.');
    });
    return () => { active = false; };
  }, [scope.key, restoreAttempt]);

  useEffect(() => {
    if (!restored || dataScope !== scope.key || submitting || completed.current || (!description.trim() && photos.length === 0 && !useReporterStore.getState().pendingDraft)) return;
    const isCurrent = scope.capture();
    const input = { description: description.trim(), photos: photoInputs(), coords };
    saves.current = saves.current.catch(() => undefined).then(() => {
      if (isCurrent()) return useReporterStore.getState().savePendingDraft(input);
    });
    void saves.current.catch(error => { if (isCurrent()) setSubmitError(reporterFailureMessage(error)); });
  }, [restored, description, photos, coords, submitting, dataScope, scope.key]);

  const requestLocation = async () => {
    const isCurrent = scope.capture();
    if (!isCurrent()) return;
    setGpsLoading(true);
    setGpsStatus('Đang lấy vị trí...');
    try {
      const permissionStatus = await Location.getForegroundPermissionsAsync();
      if (!isCurrent()) return;
      let granted = permissionStatus.status === 'granted';
      if (!granted) {
        const requested = await Location.requestForegroundPermissionsAsync();
        if (!isCurrent()) return;
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
      if (!isCurrent()) return;
      if (!hasUsableCoordinate(location.coords.latitude, location.coords.longitude)) {
        // Không có fix hợp lệ: tiếp tục với UNKNOWN, không tạo tọa độ.
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
      if (!isCurrent()) return;
      setCoords(null);
      setGpsStatus('Chưa có tọa độ');
    } finally {
      if (isCurrent()) setGpsLoading(false);
    }
  };


  const handleCameraPermission = async () => {
    const isCurrent = scope.capture();
    if (!isCurrent() || submitting || draftLocked) return;
    try {
      const result = await requestPermission();
      if (isCurrent() && !result.granted) setSubmitError('Cần cấp quyền camera để chụp ảnh hiện trường.');
    } catch {
      if (isCurrent()) setSubmitError('Không mở được camera. Nháp và ảnh cũ vẫn được giữ; vui lòng thử lại.');
    }
  };

  const handleCapture = async () => {
    const isCurrent = scope.capture();
    if (!isCurrent() || submitting || submitted.current || draftLocked || !restored || dataScope !== scope.key) return;
    if (!cameraReady || captureInFlight.current || selectedPhotos.current.length >= MAX_PHOTOS) {
      return;
    }
    captureInFlight.current = true;
    const capturedAt = new Date().toISOString();
    try {
    const photo: CameraCapturedPicture | undefined = await cameraRef.current?.takePictureAsync();
    if (!isCurrent()) return;
    if (photo?.uri) {
      const saved = await preserveReporterPhoto({ uri: photo.uri, fileName: photo.uri.split('/').pop() ?? '',
        mediaType: 'image/jpeg', capturedAt }, isCurrent);
      if (!isCurrent()) return;
      photoMeta.current.set(saved.uri, saved);
      updatePhotos(current => [...current, saved.uri].slice(0, MAX_PHOTOS));
      setCameraOpen(false);
    }
    } catch (error) {
      if (isCurrent()) setSubmitError(reporterPhotoFailureMessage(error) ?? 'Không chụp được ảnh. Nháp và ảnh cũ vẫn được giữ; vui lòng thử lại.');
    } finally {
      captureInFlight.current = false;
    }
  };

  const handlePickImage = async () => {
    const isCurrent = scope.capture();
    if (!isCurrent() || submitting || submitted.current || draftLocked || !restored || dataScope !== scope.key ||
        captureInFlight.current || selectedPhotos.current.length >= MAX_PHOTOS) return;
    captureInFlight.current = true;
    const capturedAt = new Date().toISOString();
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'image/jpeg', 'image/png'],
        // Android grants access to the selected content URI. In Expo Go the
        // picker's host-global cache copy can fall outside FileSystem's scope.
        // Admission below reads and verifies it into our private storage now.
        copyToCacheDirectory: false,
      });
      if (!isCurrent()) return;
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        const saved = await preserveReporterPhoto({ uri: asset.uri, fileName: asset.name,
          mediaType: asset.mimeType, capturedAt }, isCurrent);
        if (!isCurrent()) return;
        if (selectedPhotos.current.some(uri => uri === asset.uri || photoMeta.current.get(uri)?.checksumSha256 === saved.checksumSha256)) return;
        photoMeta.current.set(saved.uri, saved);
        updatePhotos(current => [...current, saved.uri].slice(0, MAX_PHOTOS));
      }
    } catch (error) {
      if (isCurrent()) setSubmitError(reporterPhotoFailureMessage(error) ?? 'Không mở được thư viện ảnh. Nháp và ảnh cũ vẫn được giữ; vui lòng thử lại.');
    } finally {
      captureInFlight.current = false;
    }
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (description.trim().length < MIN_DESCRIPTION) {
      next.description = `Mô tả tối thiểu ${MIN_DESCRIPTION} ký tự để đội nghiệp vụ xác định vị trí.`;
    }
    if (photos.length === 0) {
      next.photos = 'Vui lòng chụp hoặc chọn ít nhất một ảnh hiện trường.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    const isCurrent = scope.capture();
    if (captureInFlight.current) return;
    if (!isCurrent() || dataScope !== scope.key || submitted.current || !restored || !validate()) return;
    submitted.current = true;
    setSubmitting(true); setSubmitError(null);
    try {
      await saves.current.catch(() => undefined);
      if (!isCurrent()) return;
      await useReporterStore.getState().savePendingDraft({ description: description.trim(), photos: photoInputs(), coords, submitRequested: true });
      if (!isCurrent()) return;
      if (!isReporterSession(useAuthStore.getState())) {
        router.push('/(auth)');
        return;
      }
      const reportId = await useReporterStore.getState().submitPendingDraft();
      if (!isCurrent()) return;
      completed.current = true;
      router.replace({ pathname: REPORTER_REPORT_DETAIL, params: { reportId } });
    } catch (error) {
      if (!isCurrent()) return;
      setSubmitError(reporterFailureMessage(error));
    } finally {
      if (isCurrent()) { submitted.current = false; setSubmitting(false); }
    }
  };

  if (dataScope !== scope.key) return <SafeAreaView style={styles.safe}>
    <Text>{restoreFailed ? 'Chưa khôi phục được nháp. Dữ liệu vẫn được giữ trên thiết bị; chưa gửi yêu cầu nào.' : 'Đang khôi phục nháp của phiên hiện tại...'}</Text>
    {restoreFailed ? <Button variant="primary" title="Thử khôi phục lại" onPress={() => setRestoreAttempt(value => value + 1)} /> : null}
    <Button title="Về trang chủ" variant="secondary" onPress={() => router.replace(REPORTER_HOME)} />
  </SafeAreaView>;

  const candidates = queueItems.filter(item => item.partitionId === reporterContext().partition &&
    item.mediaState === 'VERIFIED' && item.fileId && item.verifiedVersion && !item.lastErrorCode && !photos.includes(item.uriLocal));

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
                disabled={gpsLoading || submitting || draftLocked}
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
          {!draftLocked && candidates.length > 0 ? <View>
            <Text style={typography.caption}>Chọn rõ ảnh đã xác minh của phiên hiện tại để gắn vào nháp này.</Text>
            {candidates.map((item, index) => <View key={item.id}><Image source={{ uri: item.uriLocal }} style={styles.photo} /><Text style={typography.caption}>{item.fileName}</Text><Button variant="secondary" key={item.id} title={`Chọn ảnh đã xác minh ${index + 1}`}
              disabled={submitting || photos.length >= MAX_PHOTOS}
              onPress={() => {
                if (!scope.capture()() || submitting || draftLocked || photos.length >= MAX_PHOTOS) return;
                photoMeta.current.set(item.uriLocal, { uri: item.uriLocal, fileName: item.fileName, mediaType: item.mediaType, capturedAt: item.capturedAt, itemId: item.id });
                updatePhotos(current => current.includes(item.uriLocal) ? current : [...current, item.uriLocal].slice(0, MAX_PHOTOS));
              }} /></View>)}
          </View> : null}
          <View style={styles.photoGrid} pointerEvents={submitting || draftLocked ? "none" : "auto"}>
            {photos.map((uri, index) => (
              <View key={`${uri}-${index}`} style={styles.photoWrapper}>
                <Image source={{ uri }} style={styles.photo} />
                <Pressable
                  onPress={() => updatePhotos((current) => current.filter((_, i) => i !== index))}
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
              <Button variant="secondary" title="Cấp quyền" onPress={handleCameraPermission} />
            </View>
          ) : null}

          <View pointerEvents={submitting || draftLocked ? "none" : "auto"}>
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
          </View>
          {draftLocked ? <Text style={typography.caption}>Đang giữ nguyên nội dung lần gửi trước. Bấm gửi lại để kiểm tra kết quả.</Text> : null}

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
              disabled={!restored || submitting}
            />
            <Text style={[typography.caption, styles.submitHint]}>
              {isReporterSession(useAuthStore.getState())
                ? 'Phản ánh sẽ được gửi trực tiếp đến Ban Quản lý dự án để tiếp nhận và khảo sát.'
                : 'Đăng nhập hoặc đăng ký để gửi phản ánh của bạn.'}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={cameraOpen} animationType="slide" onRequestClose={() => setCameraOpen(false)}>
        <View style={styles.cameraModal}>
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" onCameraReady={() => setCameraReady(true)} />
          <SafeAreaView testID="camera-controls" style={styles.cameraControls} edges={['top', 'bottom']}>
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
          <View testID="camera-footer" style={styles.cameraFooter}>
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
          </SafeAreaView>
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
  cameraControls: { flex: 1 },
  cameraTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: 'rgba(26, 29, 32, 0.7)',
  },
  cameraClose: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  cameraTitle: { color: colors.onPrimary },
  cameraFooter: { marginTop: 'auto', alignItems: 'center', paddingBottom: spacing.xl, paddingTop: spacing.lg },
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

import { ReporterHeader } from '../../src/components/ReporterHeader';
import { reportDescriptionError } from '../../src/api/reporterValidation';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { CameraCapturedPicture, CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { Button } from '../../src/components/reporter/Button';
import { useReporterKeyboard } from '../../src/components/reporter/keyboardVisibility';
import { PhotoUploadStatus } from '../../src/components/reporter/PhotoUploadStatus';
import { InputField } from '../../src/components/InputField';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import {
  isReporterSession,
  normalizePhotoMediaType,
} from '../../src/api/uploads';
import { hasUsableCoordinate } from '../../src/types/position';
import { useUploadsStore, reporterContext } from '../../src/store/uploads';
import { useReporterStore, useReporterDraftScope, reporterFailureMessage, type ReporterSubmissionProgress, type DraftPhoto } from '../../src/store/reporter';
import { useAuthStore } from '../../src/store/auth';
import { preserveReporterPhoto, reporterPhotoFailureMessage } from '../../src/api/reporterLocalMedia';
import { REPORTER_REPORT_DETAIL, REPORTER_HOME, REPORTER_UPLOADS } from '../../src/constants/routes';

const softShadow = Platform.select({
  ios: { shadowColor: '#1A1D20', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  android: { elevation: 1 },
  default: {},
});

const MAX_PHOTOS = 3;
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
  const scrollRef = useRef<ScrollViewInstance>(null);
  const descriptionTop = useRef(0);
  const descriptionFocused = useRef(false);
  const revealDescription = () => {
    if (descriptionFocused.current) scrollRef.current?.scrollTo({ y: Math.max(0, descriptionTop.current - spacing.md), animated: true });
  };
  const captureInFlight = useRef(false);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [showVerifiedPhotos, setShowVerifiedPhotos] = useState(false);
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
  const [submitProgress, setSubmitProgress] = useState<ReporterSubmissionProgress | null>(null);

  const [restored, setRestored] = useState(false);
  const [restoreFailed, setRestoreFailed] = useState(false);
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const completed = useRef(false);
  const submitted = useRef(false);
  const photoMeta = useRef<Map<string, DraftPhoto>>(new Map());
  const queueItems = useUploadsStore(state => state.items);
  const draftLocked = useReporterStore(state => Boolean(state.pendingDraft?.submitRequested || state.pendingDraft?.request || state.pendingDraft?.photos.some(photo => photo.itemId)));
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

  useFocusEffect(useCallback(() => {
    let active = true;
    const isCurrent = scope.capture();
    setRestored(false);
    setRestoreFailed(false); setDataScope('');
    setDescription(''); updatePhotos(() => []); setCoords(null); setCameraOpen(false); setShowVerifiedPhotos(false);
    setErrors({}); setSubmitError(null); setSubmitting(false); setSubmitProgress(null);
    photoMeta.current = new Map(); completed.current = false; submitted.current = false;
    void useReporterStore.getState().restoreStartedCommand().then(draft => {
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
        setGpsStatus(validCoords ? 'Đã khôi phục vị trí của lệnh đang gửi' : 'Lệnh chưa có tọa độ'); setGpsLoading(false);
      } else void requestLocation();
      setRestored(true);
      setDataScope(scope.key);
    }).catch(() => { if (active && isCurrent()) setRestoreFailed(true); });
    // Loading candidates only reads the existing owner/session ledger; it never dispatches.
    void useUploadsStore.getState().hydrate().catch(() => {
      if (active && isCurrent()) setSubmitError('Chưa đọc được ảnh trong hàng đợi. Lệnh đã bắt đầu gửi và ảnh vẫn được giữ; mở hàng đợi để thử tải lại.');
    });
    return () => { active = false; scope.invalidate(); useReporterKeyboard.getState().setOpening(false); };
  }, [scope.key, restoreAttempt]));



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
      if (isCurrent()) setSubmitError('Không mở được camera. Ảnh cũ vẫn được giữ; nội dung chưa gửi không được lưu; vui lòng thử lại.');
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
      if (isCurrent()) setSubmitError(reporterPhotoFailureMessage(error) ?? 'Không chụp được ảnh. Ảnh cũ vẫn được giữ; nội dung chưa gửi không được lưu; vui lòng thử lại.');
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
      if (isCurrent()) setSubmitError(reporterPhotoFailureMessage(error) ?? 'Không mở được thư viện ảnh. Ảnh cũ vẫn được giữ; nội dung chưa gửi không được lưu; vui lòng thử lại.');
    } finally {
      captureInFlight.current = false;
    }
  };

  const validate = () => {
    const next: Record<string, string> = {};
    const descriptionError = reportDescriptionError(description);
    if (descriptionError) next.description = descriptionError;
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
      if (!isReporterSession(useAuthStore.getState())) {
        router.push('/(auth)');
        return;
      }
    submitted.current = true;
    setSubmitting(true); setSubmitError(null); setSubmitProgress(null);
    try {
      if (!isCurrent()) return;
      await useReporterStore.getState().savePendingDraft({ description: description.trim(), photos: photoInputs(), coords, submitRequested: true });
      if (!isCurrent()) return;
      const reportId = await useReporterStore.getState().submitPendingDraft({ isCurrent,
        onProgress: progress => { if (isCurrent()) setSubmitProgress(progress); } });
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

  if (dataScope !== scope.key) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ReporterHeader title="Gửi phản ánh" />
        <ScrollView
          contentContainerStyle={styles.recoveryScroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.recoveryCard}>
            {restoreFailed ? (
              <View style={styles.recoveryIconCircle}>
                <MaterialIcons name="error-outline" size={32} color={colors.warning} />
              </View>
            ) : (
              <ActivityIndicator size="large" color={colors.primary} style={styles.recoverySpinner} />
            )}

            <View style={styles.recoveryTextGroup}>
              <Text style={[typography.titleMd, styles.recoveryTitle]}>
                {restoreFailed ? 'Chưa khôi phục được lệnh' : 'Đang khôi phục dữ liệu'}
              </Text>
              <Text
                style={[typography.bodyMd, styles.recoveryMessage]}
                accessibilityRole={restoreFailed ? 'alert' : 'text'}
                accessibilityLiveRegion="polite"
              >
                {restoreFailed
                  ? 'Chưa thể kiểm tra lệnh đang gửi. Kết quả gửi hiện chưa được xác nhận. Vui lòng thử khôi phục lại; ứng dụng sẽ không tự gửi lại yêu cầu.'
                  : 'Đang kiểm tra lệnh đang gửi của phiên hiện tại...'}
              </Text>
            </View>

            <View style={styles.recoveryActions}>
              {restoreFailed ? (
                <Button
                  variant="primary"
                  title="Thử khôi phục lại"
                  onPress={() => setRestoreAttempt((value) => value + 1)}
                  style={styles.recoveryButton}
                />
              ) : null}
              <Button
                variant="secondary"
                title="Về trang chủ"
                onPress={() => router.replace(REPORTER_HOME)}
                style={styles.recoveryButton}
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const candidates = queueItems.filter(item => item.partitionId === reporterContext().partition &&
    item.mediaState === 'VERIFIED' && item.fileId && item.verifiedVersion && !item.lastErrorCode && !photos.includes(item.uriLocal));

  const photoItem = (uri: string) => {
    const item = queueItems.find(row => row.partitionId === reporterContext().partition &&
      (row.id === photoMeta.current.get(uri)?.itemId || row.uriLocal === uri));
    return item;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ReporterHeader title="Gửi phản ánh" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          ref={scrollRef}
          onLayout={revealDescription}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formSection}>
          <View style={styles.sectionHeading}>
            <Text style={[typography.titleMd, styles.label]}>Ảnh hiện trường</Text>
            <Text style={[typography.caption, styles.muted]}>Tối đa {MAX_PHOTOS} ảnh · {photos.length}/{MAX_PHOTOS}</Text>
          </View>
          <View style={styles.photoGrid} pointerEvents={submitting || draftLocked ? "none" : "auto"}>
            {photos.map((uri, index) => (
              <View key={`${uri}-${index}`} style={styles.photoWrapper}>
                <Image source={{ uri }} style={styles.photo} accessibilityLabel={`Ảnh hiện trường ${index + 1}`} />
                <PhotoUploadStatus item={photoItem(uri)} index={index} />
                <Pressable
                  onPress={() => updatePhotos((current) => current.filter((_, i) => i !== index))}
                  style={styles.photoRemove}
                  accessibilityRole="button"
                  accessibilityLabel={`Xoá ảnh ${index + 1}`}
                  testID={`remove-photo-${index}`}
                >
                  <View style={styles.photoRemoveBadge}>
                    <MaterialIcons name="close" size={16} color={colors.secondary} />
                  </View>
                </Pressable>
              </View>
            ))}
          </View>
          <View style={styles.photoActions} pointerEvents={submitting || draftLocked ? "none" : "auto"}>
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
                <MaterialIcons name="photo-camera" size={24} color={colors.secondary} />
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
                <MaterialIcons name="photo-library" size={24} color={colors.secondary} />
                <Text style={[typography.caption, styles.photoAddText]}>Chọn ảnh</Text>
              </Pressable>
            ) : null}
          </View>
          {!draftLocked && candidates.length > 0 ? <View style={styles.reuseSection}>
            <Pressable testID="toggle-verified-photos" accessibilityRole="button" accessibilityState={{ expanded: showVerifiedPhotos }}
              disabled={submitting} style={styles.reuseToggle} onPress={() => setShowVerifiedPhotos(value => !value)}>
              <Text style={[typography.caption, styles.muted]}>Dùng ảnh đã xác minh</Text>
              <MaterialIcons name={showVerifiedPhotos ? 'expand-less' : 'chevron-right'} size={20} color={colors.secondary} />
            </Pressable>
            {showVerifiedPhotos ? candidates.map((item, index) => <View testID={`verified-photo-${index}`} key={item.id} style={styles.candidateRow}>
              <Image source={{ uri: item.uriLocal }} style={styles.candidatePhoto} accessibilityLabel={`Ảnh đã xác minh ${index + 1}`} />
              <View style={styles.candidateAction}><Button variant="secondary" title={`Chọn ảnh đã xác minh ${index + 1}`}
                disabled={submitting || photos.length >= MAX_PHOTOS}
                onPress={() => {
                  if (!scope.capture()() || submitting || draftLocked || photos.length >= MAX_PHOTOS) return;
                  photoMeta.current.set(item.uriLocal, { uri: item.uriLocal, fileName: item.fileName, mediaType: item.mediaType, capturedAt: item.capturedAt, itemId: item.id });
                  updatePhotos(current => current.includes(item.uriLocal) ? current : [...current, item.uriLocal].slice(0, MAX_PHOTOS));
                }} /></View>
            </View>) : null}
          </View> : null}
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

          <Pressable testID="open-photo-status" onPress={() => router.push(REPORTER_UPLOADS)}
            disabled={submitting} accessibilityState={{ disabled: submitting }}
            accessibilityRole="button" accessibilityLabel="Trạng thái ảnh" style={styles.statusLink}>
            <MaterialIcons name="photo-library" size={20} color={colors.secondary} />
            <Text style={[typography.bodyMd, styles.muted]}>{submitting ? 'Đang gửi · xem tiến trình trên ảnh' : 'Trạng thái ảnh'}</Text>
            <MaterialIcons name="chevron-right" size={20} color={colors.secondary} />
          </Pressable>
          </View>
          <View testID="description-section" onTouchStart={() => { if (descriptionFocused.current) useReporterKeyboard.getState().setOpening(true); }} style={styles.formSection}
            onLayout={event => { descriptionTop.current = event.nativeEvent.layout.y; }}
            pointerEvents={submitting || draftLocked ? "none" : "auto"}>
          <InputField
            onPressIn={() => useReporterKeyboard.getState().setOpening(true)}
            label="Mô tả hiện trạng"
            value={description}
            onChangeText={(text) => {
              setDescription(text);
              setErrors((current) => ({ ...current, description: '' }));
            }}
            placeholder="Đường hư hại như thế nào?"
            onFocus={() => { useReporterKeyboard.getState().setOpening(true); descriptionFocused.current = true; revealDescription(); }}
            onBlur={() => { descriptionFocused.current = false; useReporterKeyboard.getState().setOpening(false); }}
            error={errors.description}
            multiline
            testID="reporter-description"
          />
          <Text style={[typography.caption, styles.fieldHint]}>1–1.000 ký tự · {description.trim().length}/1.000</Text>
          </View>
          <View style={styles.gpsCard}>
            <Text style={typography.labelLg}>Vị trí (không bắt buộc)</Text>
            <View style={styles.gpsRow}>
              <MaterialIcons name={coords ? 'my-location' : 'location-off'} size={20} color={colors.secondary} />
              <Text style={[typography.caption, styles.gpsText]}>{gpsLoading ? 'Đang lấy vị trí…' : coords ? 'Vị trí thiết bị' : gpsStatus}</Text>
              <Pressable onPress={requestLocation} disabled={gpsLoading || submitting || draftLocked}
                style={styles.gpsRetry} accessibilityRole="button" accessibilityLabel="Lấy lại vị trí" testID="retry-location">
                <MaterialIcons name="refresh" size={20} color={colors.secondary} />
                <Text style={typography.caption}>{gpsLoading ? 'Đang lấy' : 'Lấy lại'}</Text>
              </Pressable>
            </View>
            {coords ? <Text testID="reporter-coordinate" style={[typography.caption, styles.fieldHint]}>{coords.latitude.toFixed(6)}, {coords.longitude.toFixed(6)}{coords.accuracyMeters !== null ? ` · Sai số khoảng ${Math.round(coords.accuracyMeters)} m` : ' · Chưa có sai số'}</Text> : null}
            {!coords && !gpsLoading ? <Text style={typography.caption}>Bạn vẫn có thể gửi khi chưa có vị trí.</Text> : null}
            {errors.coords ? <Text style={[typography.caption, styles.error]}>{errors.coords}</Text> : null}
          </View>
          {draftLocked && !submitting && !submitError ? <Text style={typography.caption}>Lần gửi trước chưa hoàn tất. Nội dung và ảnh vẫn được giữ.</Text> : null}

          {submitError ? (
            <View style={styles.errorRow}>
              <MaterialIcons name="error-outline" size={16} color={colors.error} />
              <Text style={[typography.caption, styles.error]}>{submitError}</Text>
            </View>
          ) : null}

          <View style={styles.submitWrapper}>
            <Button
              variant="primary"
              title={submitting ? (submitProgress?.phase === 'readback' ? 'Đang xác nhận…' : submitProgress?.phase === 'submitting' ? 'Đang gửi…' : 'Đang chuẩn bị ảnh…') : 'Gửi phản ánh'}
              style={styles.submitButton}
              onPress={handleSubmit}
              loading={submitting}
              disabled={!restored || submitting}
            />
            {!submitError && !submitting && !isReporterSession(useAuthStore.getState()) ? <Text style={[typography.caption, styles.submitHint]}>Đăng nhập để gửi phản ánh.</Text> : null}
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
              <MaterialIcons name="camera" size={28} color={colors.neutral} />
            </Pressable>
          </View>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  recoveryScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.screenMargin,
    paddingBottom: spacing.xl,
  },
  recoveryCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  recoveryIconCircle: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recoverySpinner: {
    marginVertical: spacing.xs,
  },
  recoveryTextGroup: {
    alignItems: 'center',
    gap: spacing.xs,
    width: '100%',
  },
  recoveryTitle: {
    color: colors.neutral,
    textAlign: 'center',
  },
  recoveryMessage: {
    color: colors.secondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  recoveryActions: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  recoveryButton: {
    minHeight: 48,
    width: '100%',
  },
  safe: { flex: 1, backgroundColor: colors.surfaceAlt },
  flex: { flex: 1 },
  content: { padding: spacing.screenMargin, paddingBottom: spacing.lg, gap: spacing.md },
  formSection: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.md },
  statusLink: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.md },
  muted: { color: colors.secondary },
  reuseSection: { marginBottom: 0 },
  reuseToggle: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  candidateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  candidatePhoto: { width: 56, height: 56, borderRadius: radius.md },
  candidateAction: { flex: 1 },
  submitButton: { minHeight: 52, borderRadius: radius.lg },
  subtitle: { color: colors.secondary, marginTop: spacing.xs, marginBottom: spacing.lg },
  label: { color: colors.onSurface },
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
    borderRadius: radius.xl,
    padding: spacing.md,
    gap: spacing.xs,
    marginBottom: 0,
  },
  gpsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  gpsText: { color: colors.secondary, flex: 1 },
  gpsRetry: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 48, paddingHorizontal: spacing.sm },
  gpsRetryText: { color: colors.brandGold },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  photoWrapper: { position: 'relative', width: 88, height: 88 },
  photoActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photo: { width: 88, height: 88, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  photoRemove: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 48,
    height: 48,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    padding: 4,
  },
  photoRemoveBadge: { width: 24, height: 24, borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  photoAdd: {
    flexGrow: 1,
    flexBasis: 120,
    minHeight: 48,
    padding: spacing.sm,
    flexDirection: 'row',
    borderRadius: radius.lg,
    borderWidth: 1,
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  photoAddPressed: { backgroundColor: colors.surfaceAlt },
  photoAddText: { color: colors.secondary },
  permissionRow: { gap: spacing.sm, marginBottom: spacing.md },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  error: { color: colors.error, flex: 1 },
  submitWrapper: { gap: spacing.sm, marginTop: spacing.sm },
  submitHint: { color: colors.secondary, textAlign: 'center' },
  fieldHint: { color: colors.secondary, marginBottom: spacing.md },
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

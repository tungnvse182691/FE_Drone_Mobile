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
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Button } from '../../src/components/Button';
import { InputField } from '../../src/components/InputField';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import {
  getOwnReportReal,
  type OwnReportDto,
} from '../../src/api/reporterApi';
import {
  isReporterSession,
  normalizePhotoMediaType,
} from '../../src/api/uploads';
import { hasUsableCoordinate } from '../../src/types/position';
import { useReporterStore, useReporterDraftScope, reporterFailureMessage, type DraftPhoto } from '../../src/store/reporter';
import { useAuthStore } from '../../src/store/auth';
import { REPORTER_REPORT_DETAIL } from '../../src/constants/routes';

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

  const activeEmail = useAuthStore(state => isReporterSession(state) ? state.user?.phone_or_email : undefined);
  const pendingDraft = useReporterStore(state => state.pendingDraft);
  const draftLocked = useReporterStore(state => Boolean(state.pendingDraft?.request));
  const [restored, setRestored] = useState(false);
  const saves = useRef<Promise<unknown>>(Promise.resolve());
  const completed = useRef(false);
  const submittingRef = useRef(false);
  const metadata = useRef<Map<string, DraftPhoto>>(new Map());
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
  const scope = useReporterDraftScope();
  const [dataScope, setDataScope] = useState('');

  useEffect(() => {
    setNotice(null);
  }, [phase]);

  // Cố gắng lấy tọa độ thiết bị (không bắt buộc, nếu có thì gắn CAPTURE, không có thì UNKNOWN)
  useEffect(() => {
    let active = true;
    const isCurrent = scope.capture();
    (async () => {
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        if (!active || !isCurrent()) return;
        if (perm.status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (active && isCurrent() &&
              !useReporterStore.getState().pendingDraft && !submittingRef.current && !completed.current &&
              hasUsableCoordinate(loc.coords.latitude, loc.coords.longitude)) {
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
    return () => { active = false; };
  }, [scope.key]);

  const loadReport = useCallback(async () => {
    const isCurrent = scope.capture();
    if (!isCurrent()) return;
    setRestored(false); setReport(null); setExpectedVersion(null); setLoadedAt(null);
    setDescription(''); setPhotos([]); setCoords(null); setCameraOpen(false);
    metadata.current = new Map(); completed.current = false; submittingRef.current = false;
    setPhase('loading'); setDataScope(scope.key);
    if (!reportId || !isReporterSession(useAuthStore.getState())) {
      setPhase('failed');
      setError('Không tìm thấy phản ánh của bạn.');
      return;
    }
    setError(null);
    try {
      const found = await getOwnReportReal(reportId);
      if (!isCurrent()) return;
      const draft = await useReporterStore.getState().restorePendingDraft();
      if (!isCurrent()) return;
      if (draft && draft.targetReportId !== reportId) throw { code: 'draft_locked' };
      setReport(found.report);
      setExpectedVersion(draft?.ifMatch ?? found.etag);
      setDescription(draft?.description ?? '');
      setPhotos(draft?.photos.map(p => p.uri) ?? []);
      metadata.current = new Map(draft?.photos.map(p => [p.uri, p]) ?? []);
      setCoords(draft?.coords ?? null);
      setRestored(true);
      setLoadedAt(new Date().toISOString());
      setPhase('ready');
    } catch {
      if (!isCurrent()) return;
      setPhase('failed');
      setError('Chưa đọc được phản ánh hoặc nháp. Dữ liệu cũ vẫn được giữ; thử tải lại khi kết nối sẵn sàng.');
    }
  }, [reportId, activeEmail, scope.key]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const handlePickImage = async () => {
    const isCurrent = scope.capture();
    if (!isCurrent()) return;
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
      });
      if (!isCurrent()) return;
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        metadata.current.set(asset.uri, { uri: asset.uri, fileName: asset.name,
          mediaType: normalizePhotoMediaType(asset.name, asset.mimeType) || '', capturedAt: new Date().toISOString() });
        setPhotos((current) => current.includes(asset.uri) ? current : [...current, asset.uri].slice(0, MAX_PHOTOS));
        if (error) {
          setError(null);
        }
      }
    } catch {
      if (isCurrent()) setError('Không mở được thư viện ảnh. Nháp và ảnh cũ vẫn được giữ; vui lòng thử lại.');
    }
  };

  const handleOpenCam = async () => {
    const isCurrent = scope.capture();
    if (!isCurrent()) return;
    try {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!isCurrent()) return;
      if (!res.granted) {
        setError('Cần cấp quyền camera để chụp ảnh hiện trường.');
        return;
      }
    }
    setCameraReady(false);
    setCameraOpen(true);
    } catch {
      if (isCurrent()) setError('Không mở được camera. Nháp và ảnh cũ vẫn được giữ; vui lòng thử lại.');
    }
  };

  const handleCapture = async () => {
    const isCurrent = scope.capture();
    if (!isCurrent()) return;
    if (!cameraReady || photos.length >= MAX_PHOTOS) {
      return;
    }
    try {
    const photo: CameraCapturedPicture | undefined = await cameraRef.current?.takePictureAsync();
    if (!isCurrent()) return;
    if (photo?.uri) {
      setPhotos((current) => [...current, photo.uri].slice(0, MAX_PHOTOS));
      setCameraOpen(false);
      if (error) {
        setError(null);
      }
    }
    } catch {
      if (isCurrent()) setError('Không chụp được ảnh. Nháp và ảnh cũ vẫn được giữ; vui lòng thử lại.');
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((current) => current.filter((_, i) => i !== index));
  };

  const photoInputs = () => photos.map(uri => {
    let photo = metadata.current.get(uri);
    if (!photo) {
      const fileName = uri.split('/').pop() || 'bo-sung.jpg';
      photo = { uri, fileName, mediaType: normalizePhotoMediaType(fileName, null) || '', capturedAt: new Date().toISOString() };
      metadata.current.set(uri, photo);
    }
    return photo;
  });

  useEffect(() => {
    if (!restored || dataScope !== scope.key || !expectedVersion || completed.current || phase === 'submitting' || phase === 'done') return;
    const isCurrent = scope.capture();
    const input = { description: description.trim(), photos: photoInputs(), coords, targetReportId: reportId, ifMatch: expectedVersion };
    saves.current = saves.current.catch(() => undefined).then(() => {
      if (isCurrent()) return useReporterStore.getState().savePendingDraft(input);
    });
    void saves.current.catch(error => { if (isCurrent()) setError(reporterFailureMessage(error)); });
  }, [restored, description, photos, coords, expectedVersion, reportId, phase, dataScope, scope.key]);

  const submit = async () => {
    const isCurrent = scope.capture();
    if (!isCurrent() || dataScope !== scope.key || submittingRef.current || phase === 'conflict' || !restored || !expectedVersion) return;
    if (!description.trim() || !photos.length) {
      setError('Vui lòng nhập nội dung và chọn ít nhất một ảnh bổ sung.'); return;
    }
    submittingRef.current = true;
    setError(null); setPhase('submitting');
    try {
      await saves.current.catch(() => undefined);
      if (!isCurrent()) return;
      await useReporterStore.getState().savePendingDraft({ description: description.trim(), photos: photoInputs(), coords,
        targetReportId: reportId, ifMatch: expectedVersion, submitRequested: true });
      if (!isCurrent()) return;
      const id = await useReporterStore.getState().submitPendingDraft();
      if (!isCurrent()) return;
      completed.current = true;
      router.replace({ pathname: REPORTER_REPORT_DETAIL, params: { reportId: id } });
    } catch (error) {
      if (!isCurrent()) return;
      const status = (error as { status?: number; response?: { status?: number } })?.response?.status ?? (error as { status?: number })?.status;
      setError(reporterFailureMessage(error)); setPhase(status === 412 || status === 409 ? 'conflict' : 'ready');
    } finally { if (isCurrent()) submittingRef.current = false; }
  };

  // Frozen commands never silently adopt a fresh ETag or a fresh idempotency key.
  const keepMine = () => { setNotice('Nháp, phiên bản và khóa lệnh được giữ nguyên. Chưa tạo hoặc gửi lệnh mới.'); };
  const takeLatest = async () => {
    const isCurrent = scope.capture();
    if (!isCurrent()) return;
    setError(null);
    try {
      const found = await getOwnReportReal(reportId);
      if (!isCurrent()) return;
      setReport(found.report); setLoadedAt(new Date().toISOString());
      setNotice('Đã đọc bản mới nhất để xem xét. Nội dung, If-Match và khóa lệnh cũ vẫn được giữ; chưa thể gửi nội dung khác bằng lệnh này.');
    } catch {
      if (isCurrent()) setError('Chưa đọc được bản mới nhất. Nháp và lệnh cũ được giữ nguyên; có thể thử tải lại.');
    }
  };

  const busy = phase === 'loading' || phase === 'submitting';

  if (dataScope !== scope.key) return <SafeAreaScreen><Text>Đang tải dữ liệu của phiên hiện tại...</Text></SafeAreaScreen>;

  return (
    <SafeAreaScreen scroll>
      <Text style={[typography.titleLg, styles.title]}>Bổ sung thông tin phản ánh</Text>
      <Text style={[typography.caption, styles.subtitle]}>
        Gửi thêm thông tin cho phản ánh đã tạo. Nếu phản ánh đã thay đổi ở nơi khác, hệ thống sẽ cảnh
        báo xung đột phiên bản.
      </Text>
      {phase === 'failed' ? <Button title="Thử tải lại" variant="secondary" onPress={() => void loadReport()} /> : null}

      {phase === 'failed' && pendingDraft && pendingDraft.targetReportId !== reportId ? (
        <View>
          <Text style={typography.caption}>Bạn đang có nháp khác chưa gửi. Hãy mở lại nháp để tiếp tục.</Text>
          <Button variant="secondary" title="Mở nháp đang lưu" onPress={() => router.replace('/(reporter)/report')} />
        </View>
      ) : null}

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
          <View pointerEvents={busy || draftLocked ? "none" : "auto"}>
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
          </View>
          {draftLocked ? <Text style={typography.caption}>Đang giữ nguyên nội dung và điều kiện của lần gửi trước.</Text> : null}

          <Text style={[typography.labelLg, styles.sectionLabel]}>
            Ảnh hiện trường bổ sung ({photos.length}/{MAX_PHOTOS})
          </Text>
          <View style={styles.photoGrid} pointerEvents={busy || draftLocked ? "none" : "auto"}>
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
            disabled={!description.trim() || photos.length === 0 || busy || phase === 'conflict'}
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

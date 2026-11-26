import { ReporterHeader } from '../../src/components/ReporterHeader';
import { preserveReporterPhoto } from '../../src/api/reporterLocalMedia';
import { acquireReporterPhotoGps } from '../../src/api/photoLocation';
import { reportDescriptionError, reporterCaptureError, REPORTER_CAPTURE_POLICY, REPORTER_MAX_PHOTOS } from '../../src/api/reporterValidation';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { CameraCapturedPicture, CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Button } from '../../src/components/reporter/Button';
import { useReporterKeyboard } from '../../src/components/reporter/keyboardVisibility';
import { PhotoUploadStatus } from '../../src/components/reporter/PhotoUploadStatus';
import { useUploadsStore, reporterContext } from '../../src/store/uploads';
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
import { useReporterStore, useReporterDraftScope, reporterFailureMessage, type ReporterSubmissionProgress, type DraftPhoto } from '../../src/store/reporter';
import { useAuthStore } from '../../src/store/auth';
import { REPORTER_REPORT_DETAIL, REPORTER_TRACK } from '../../src/constants/routes';

const softShadow = Platform.select({
  ios: { shadowColor: '#1A1D20', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  android: { elevation: 1 },
  default: {},
});

const MAX_PHOTOS = REPORTER_MAX_PHOTOS;

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
  const draftLocked = useReporterStore(state => Boolean(state.pendingDraft?.submitRequested || state.pendingDraft?.request || state.pendingDraft?.photos.some(photo => photo.itemId)));
  const provenRejection = pendingDraft?.commandOutcome === 'REJECTED' &&
    pendingDraft.rejection?.status === 412 && pendingDraft.rejection.code === 'concurrency_conflict';
  const needsReconciliation = Boolean(pendingDraft?.request && !provenRejection);
  const [restored, setRestored] = useState(false);
  const completed = useRef(false);
  const submittingRef = useRef(false);
  const [submitProgress, setSubmitProgress] = useState<ReporterSubmissionProgress | null>(null);
  const queueItems = useUploadsStore(state => state.items);
  const busyPhotoIds = useUploadsStore(state => state.busyItemIds);
  const metadata = useRef<Map<string, DraftPhoto>>(new Map());
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const photoBusy = useRef(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const cameraGeneration = useRef(0);
  const [gpsBusy, setGpsBusy] = useState(false);
  const closeCamera = () => { cameraGeneration.current++; setCameraReady(false); setCameraOpen(false); };
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
  const [showConflictDetails, setShowConflictDetails] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scope = useReporterDraftScope();
  const pickerScope = useRef<string | null>(null);
  const [dataScope, setDataScope] = useState('');

  useEffect(() => {
    setNotice(null);
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
      const draft = await useReporterStore.getState().restoreStartedCommand();
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
      setPhase(draft?.commandOutcome === 'REJECTED' ? 'conflict' : 'ready');
    } catch {
      if (!isCurrent()) return;
      setPhase('failed');
      setError('Chưa đọc được phản ánh hoặc lệnh đang gửi. Dữ liệu cũ vẫn được giữ; thử tải lại khi kết nối sẵn sàng.');
    }
  }, [reportId, activeEmail, scope.key]);

  useFocusEffect(useCallback(() => {
    if (pickerScope.current === scope.key) {
      return () => {
        if (pickerScope.current !== scope.key) scope.invalidate();
      };
    }
    pickerScope.current = null;
    void loadReport();
    return () => {
      if (pickerScope.current !== scope.key) scope.invalidate();
    };
  }, [loadReport, scope.key]));

  const handleOpenCam = async () => {
    const isCurrent = scope.capture();
    if (!isCurrent() || photoBusy.current || draftLocked || submittingRef.current || photos.length >= MAX_PHOTOS) return;
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
      if (isCurrent()) setError('Không mở được camera. Ảnh đã lưu vẫn được giữ; vui lòng thử lại.');
    }
  };

  const handleCapture = async () => {
    const isOwner = scope.capture();
    const generation = cameraGeneration.current;
    const isCurrent = () => isOwner() && generation === cameraGeneration.current;
    if (!isCurrent() || photoBusy.current || draftLocked || submittingRef.current) return;
    if (!cameraReady || photos.length >= MAX_PHOTOS) {
      return;
    }
    photoBusy.current = true;
    setGpsBusy(true);
    try {
    const captureRole = photos.some(uri => metadata.current.get(uri)?.captureRole === 'PRIMARY') ? 'SECONDARY' as const : 'PRIMARY' as const;
    const photoLocation = captureRole === 'PRIMARY' ? await acquireReporterPhotoGps(isCurrent) : null;
    if (!isCurrent()) return;
    const capturedAt = new Date().toISOString();
    const photo: CameraCapturedPicture | undefined = await cameraRef.current?.takePictureAsync();
    if (!isCurrent()) return;
    if (photo?.uri) {
      const saved = await preserveReporterPhoto({ uri: photo.uri, fileName: photo.uri.split('/').pop() ?? '', mediaType: 'image/jpeg', capturedAt,
        photoLocation, captureRole, locationSource: photoLocation ? 'CAPTURE' : 'UNKNOWN' }, isCurrent);
      if (!isCurrent()) return;
      const next = captureRole === 'PRIMARY' ? [saved, ...photoInputs()] : [...photoInputs(), saved];
      const nextCoords = captureRole === 'PRIMARY' ? saved.photoLocation ?? null : coords;
      await useReporterStore.getState().savePendingDraft({description, photos: next, coords: nextCoords, targetReportId: reportId, ifMatch: expectedVersion ?? undefined, capturePolicy: REPORTER_CAPTURE_POLICY});
      if (!isCurrent()) return;
      metadata.current.set(saved.uri, saved);
      setPhotos(next.map(p => p.uri)); setCoords(nextCoords);
      setCameraOpen(false);
      if (error) {
        setError(null);
      }
    }
    } catch {
      if (isCurrent()) setError('Không chụp được ảnh. Ảnh đã lưu vẫn được giữ; vui lòng thử lại.');
    } finally { photoBusy.current = false; setGpsBusy(false); }
  };

  const handleRemovePhoto = async (index: number) => {
    const isCurrent = scope.capture();
    if (!isCurrent() || draftLocked || photoBusy.current || submittingRef.current) return;
    photoBusy.current = true;
    try {
      const removed = metadata.current.get(photos[index]);
      const next = photoInputs().filter((_, i) => i !== index);
      const nextCoords = removed?.captureRole === 'PRIMARY' ? null : coords;
      await useReporterStore.getState().savePendingDraft({description, photos: next, coords: nextCoords, targetReportId: reportId, ifMatch: expectedVersion ?? undefined, capturePolicy: REPORTER_CAPTURE_POLICY});
      if (!isCurrent()) return;
      setPhotos(next.map(p => p.uri)); setCoords(nextCoords);
      if (removed?.captureRole === 'PRIMARY') setNotice('Chụp lại ảnh chính để lấy GPS mới; ảnh phụ không nhận GPS cũ.');
    } catch (error) { if (isCurrent()) setError(reporterFailureMessage(error)); }
    finally { photoBusy.current = false; }
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



  const submit = async () => {
    const isCurrent = scope.capture();
    if (!isCurrent() || photoBusy.current || dataScope !== scope.key || submittingRef.current || phase === 'conflict' || !restored || !expectedVersion) return;
    const descriptionError = reportDescriptionError(description);
    if (descriptionError) { setError(descriptionError); return; }
    if (!photos.length) {
      setError('Vui lòng nhập nội dung và chọn ít nhất một ảnh bổ sung.'); return;
    }
    if (!draftLocked) { const message = reporterCaptureError(photoInputs(), true); if (message) { setError(message); return; } }
    submittingRef.current = true;
    setError(null); setPhase('submitting'); setSubmitProgress(null);
    try {
      if (!isCurrent()) return;
      await useReporterStore.getState().savePendingDraft({ description: description.trim(), photos: photoInputs(), coords,
        targetReportId: reportId, ifMatch: expectedVersion, capturePolicy: REPORTER_CAPTURE_POLICY, submitRequested: true });
      if (!isCurrent()) return;
      const id = await useReporterStore.getState().submitPendingDraft({ isCurrent,
        onProgress: progress => { if (isCurrent()) setSubmitProgress(progress); } });
      if (!isCurrent()) return;
      completed.current = true;
      router.replace({ pathname: REPORTER_REPORT_DETAIL, params: { reportId: id } });
    } catch (error) {
      if (!isCurrent()) return;
      const saved = useReporterStore.getState().pendingDraft;
      const rejected = saved?.commandOutcome === 'REJECTED' &&
        saved.rejection?.status === 412 && saved.rejection.code === 'concurrency_conflict';
      setError(saved?.request && !rejected
        ? saved.resultReportId
          ? 'Đã nhận phản hồi gửi; chưa xác nhận dữ liệu đọc lại. Đã giữ lệnh và ảnh để đối soát.'
          : 'Kết quả gửi chưa được xác nhận. Đã giữ lệnh và ảnh; chỉ kiểm tra lại với cùng lệnh, không tạo lệnh mới.'
        : reporterFailureMessage(error));
      setPhase(rejected ? 'conflict' : 'ready');
    } finally { if (isCurrent()) submittingRef.current = false; }
  };

  // Frozen commands never silently adopt a fresh ETag or a fresh idempotency key.
  const keepMine = () => { setNotice('Nội dung lệnh, phiên bản và khóa chống trùng được giữ nguyên. Chưa tạo hoặc gửi lệnh mới.'); };
  const takeLatest = async () => {
    const isCurrent = scope.capture();
    if (!isCurrent()) return;
    setError(null);
    try {
      const found = await getOwnReportReal(reportId);
      if (!isCurrent()) return;
      setReport(found.report); setLoadedAt(new Date().toISOString());
      setNotice('Đã đọc bản mới nhất để xem xét; dữ liệu này không xác nhận kết quả lệnh. Nội dung, phiên bản và khóa lệnh cũ vẫn được giữ; chưa thể gửi nội dung khác bằng lệnh này.');
    } catch {
      if (isCurrent()) setError('Chưa đọc được bản mới nhất. Nội dung và lệnh cũ được giữ nguyên; có thể thử tải lại.');
    }
  };

  const renewCommand = async () => {
    const isCurrent = scope.capture();
    if (!isCurrent() || submittingRef.current || phase !== 'conflict') return;
    submittingRef.current = true; setError(null);
    try {
      const next = await useReporterStore.getState().renewSupplementDraft();
      if (!isCurrent()) return;
      setExpectedVersion(next.ifMatch ?? null); setPhase('ready');
      setNotice('Đã lưu bản bổ sung mới để bạn xem lại. Lệnh và ảnh cũ được giữ nguyên trong lịch sử; chưa gửi lên máy chủ.');
    } catch {
      if (isCurrent()) setError('Chưa đủ bằng chứng để tạo lệnh mới. Nội dung và lệnh cũ vẫn được giữ; cần đối soát kết quả trước.');
    } finally { if (isCurrent()) submittingRef.current = false; }
  };

  const busy = phase === 'loading' || phase === 'submitting';

  if (dataScope !== scope.key) return <SafeAreaScreen header={<ReporterHeader title="Bổ sung thông tin phản ánh" onBack={() => router.canGoBack() ? router.back() : router.replace(reportId ? { pathname: REPORTER_REPORT_DETAIL, params: { reportId } } : REPORTER_TRACK)} />}><Text>Đang tải dữ liệu của phiên hiện tại...</Text></SafeAreaScreen>;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <SafeAreaScreen scroll header={<><ReporterHeader title="Bổ sung thông tin phản ánh" onBack={() => router.canGoBack() ? router.back() : router.replace(reportId ? { pathname: REPORTER_REPORT_DETAIL, params: { reportId } } : REPORTER_TRACK)} /></>}>
      <Text style={[typography.caption, styles.subtitle]}>Thêm mô tả và ảnh hiện trường cho phản ánh này.</Text>
      {phase === 'failed' ? <Button title="Thử tải lại" variant="secondary" onPress={() => void loadReport()} /> : null}

      {phase === 'failed' && pendingDraft && pendingDraft.targetReportId !== reportId ? (
        <View>
          <Text style={typography.caption}>Bạn có lệnh gửi khác cần kiểm tra. Hãy mở lại lệnh để tiếp tục.</Text>
          <Button variant="secondary" title="Mở lệnh đang gửi" onPress={() => router.replace('/(reporter)/report')} />
        </View>
      ) : null}

      {report ? (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="description" size={18} color={colors.brandGold} />
            <Text style={[typography.labelLg, styles.cardTitle]}>
              Phản ánh gốc
            </Text>
          </View>
          <Text style={[typography.bodyMd, styles.cardText]} numberOfLines={2}>
            {report.description?.trim() || 'Chưa có mô tả'}
          </Text>
          <Text style={[typography.caption, styles.cardMeta]}>Đã gửi lúc {formatTime(report.createdAt)}</Text>
          {loadedAt ? (
            <Text style={[typography.caption, styles.cardMeta]}>
              Bản đang xem tải lúc {formatTime(loadedAt)}
            </Text>
          ) : null}
        </View>
      ) : null}

      {phase === 'conflict' || (restored && needsReconciliation) ? (
        <View style={styles.conflictCard}>
          <View style={styles.conflictHeader}>
            <MaterialIcons name="sync-problem" size={18} color={colors.warning} />
            <Text style={[typography.labelLg, styles.conflictTitle]}>
              {provenRejection ? 'Phát hiện xung đột phiên bản'
                : pendingDraft?.resultReportId ? 'Đang kiểm tra phản hồi gửi' : 'Kết quả gửi chưa được xác nhận'}
            </Text>
          </View>
          <Text style={[typography.caption, styles.conflictText]}>
            {provenRejection
              ? 'Máy chủ đã từ chối lần gửi đầu do phiên bản thay đổi. Cần đọc lại trước khi xem xét tạo bản mới.'
              : 'Đã giữ lệnh và ảnh để đối soát. Đọc bản mới nhất không chứng minh lệnh cũ đã hoàn tất; không tạo lệnh mới.'}
          </Text>
          <View style={styles.conflictActions}>
            <Button variant="secondary" title="Giữ bản của tôi" onPress={keepMine} />
            <Button variant="text" title="Tải bản mới nhất" onPress={() => void takeLatest()} />
            {provenRejection ? <Button variant="secondary"
              title="Tạo bản bổ sung mới để xem lại" onPress={() => void renewCommand()} /> : null}
          </View>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: showConflictDetails }} testID="supplement-conflict-details" onPress={() => setShowConflictDetails(value => !value)} style={styles.detailsButton}>
            <Text style={[typography.caption, styles.conflictText]}>{showConflictDetails ? 'Thu gọn điều kiện gửi lại' : 'Điều kiện gửi lại'}</Text>
            <MaterialIcons name={showConflictDetails ? 'expand-less' : 'expand-more'} size={20} color={colors.secondary} />
          </Pressable>
          {showConflictDetails ? <Text style={[typography.caption, styles.conflictText]}>
            Chỉ tạo bản mới sau khi máy chủ từ chối lần gửi đầu và dữ liệu hiện hành chứng minh chưa có ảnh của lệnh đó.
            Kết quả chưa rõ cần đối soát; không tự đổi khóa hay phiên bản.
          </Text> : null}
        </View>
      ) : null}

      {report ? (
        <>
          <View style={styles.card} pointerEvents={busy || draftLocked ? "none" : "auto"}>
          {draftLocked ? (
            <View testID="supplement-frozen-content" style={styles.frozenContent}>
              <Text style={[typography.labelLg, styles.sectionLabel]}>Nội dung bổ sung</Text>
              <Text style={[typography.bodyMd, styles.cardTitle]}>{description}</Text>
              <View style={styles.frozenNote}>
                <MaterialIcons name="lock-outline" size={18} color={colors.secondary} />
                <Text style={[typography.caption, styles.frozenNoteText]}>Nội dung và ảnh được giữ nguyên để tiếp tục lần gửi này.</Text>
              </View>
            </View>
          ) : <InputField
            onPressIn={() => useReporterKeyboard.getState().setOpening(true)}
            onFocus={() => useReporterKeyboard.getState().setOpening(true)}
            onBlur={() => useReporterKeyboard.getState().setOpening(false)}
            label="Nội dung bổ sung"
            value={description}
            onChangeText={(text) => {
              setDescription(text);
              if (error) {
                setError(null);
              }
            }}
            placeholder="Mô tả thêm hiện trạng hoặc vị trí cần làm rõ…"
            multiline
            numberOfLines={5}
            testID="supplement-description-input"
          />}
          </View>

          <View style={styles.card}>
          <Text style={[typography.labelLg, styles.sectionLabel]}>
            Ảnh hiện trường bổ sung ({photos.length}/{MAX_PHOTOS})
          </Text>
          <View style={styles.photoGrid} pointerEvents={busy || draftLocked ? "none" : "auto"}>
            {photos.map((uri, index) => (
              <View key={`${uri}-${index}`} style={styles.photoWrapper}>
                <Image source={{ uri }} style={styles.photo} accessibilityLabel={`Ảnh bổ sung ${index + 1}`} />
                <PhotoUploadStatus progressPercent={phase === 'submitting' && submitProgress?.phase === 'uploading' ? submitProgress.photoPercentages?.[metadata.current.get(uri)?.itemId ?? ''] : undefined} index={index} item={queueItems.find(item => item.partitionId === reporterContext().partition && (item.id === metadata.current.get(uri)?.itemId || item.uriLocal === uri))}
                  active={queueItems.some(item => item.partitionId === reporterContext().partition && (item.id === metadata.current.get(uri)?.itemId || item.uriLocal === uri) && busyPhotoIds.includes(item.id))} />
                {!busy && !draftLocked ? <Pressable
                  onPress={() => handleRemovePhoto(index)}
                  style={styles.photoRemove}
                  accessibilityRole="button"
                  accessibilityLabel={`Xoá ảnh ${index + 1}`}
                  testID={`remove-photo-${index}`}
                >
                  <View style={styles.photoRemoveBadge}>
                    <MaterialIcons name="close" size={16} color={colors.secondary} />
                  </View>
                </Pressable> : null}
              </View>
            ))}
          </View>
          {!busy && !draftLocked ? <View style={styles.photoActions}>
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
          </View> : null}
          </View>
          {error ? (
            <View style={styles.errorRow} accessibilityRole="alert">
              <MaterialIcons name="error-outline" size={20} color={colors.error} />
              <Text style={[typography.caption, styles.errorText]}>{error}</Text>
            </View>
          ) : null}
          {busy || phase === 'conflict' || !description.trim() || photos.length === 0 ? <Text testID="supplement-disabled-reason" style={[typography.caption, styles.sectionLabel]}>
            {phase === 'conflict' ? 'Cần xem lại xung đột trước khi gửi.' : busy ? 'Đang xử lý, vui lòng chờ.' : !description.trim() ? 'Nhập nội dung bổ sung để tiếp tục.' : 'Chọn ít nhất một ảnh bổ sung.'}
          </Text> : null}
          <Button
            variant="primary"
            title={phase === 'submitting' ? (submitProgress?.phase === 'readback' ? 'Đang xác nhận…' : submitProgress?.phase === 'submitting' ? 'Đang gửi…' : submitProgress?.phase === 'uploading' ? `Đang tải ảnh ${submitProgress.index}/${submitProgress.total}${submitProgress.uploadPercent === undefined ? '…' : ` · ${submitProgress.uploadPercent}%`}` : submitProgress?.phase === 'verifying' ? `Đã tải ảnh · Đang xác minh ${submitProgress.index}/${submitProgress.total}…` : submitProgress?.phase === 'verified' ? 'Đang chuẩn bị gửi…' : 'Đang chuẩn bị ảnh…') : 'Gửi bổ sung'}
            onPress={() => void submit()}
            loading={phase === 'submitting'}
            progressPercent={submitProgress ? (submitProgress.phase === 'uploading' ? submitProgress.uploadPercent : 100) : undefined}
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

      {error && !report ? (
        <View style={styles.errorRow}>
          <MaterialIcons name="error-outline" size={16} color={colors.error} />
          <Text style={[typography.caption, styles.errorText]}>{error}</Text>
        </View>
      ) : null}

      {phase === 'loading' ? (
        <Text style={[typography.caption, styles.busyText]}>
          Đang tải phản ánh...
        </Text>
      ) : null}

      <Modal visible={cameraOpen} animationType="slide" onRequestClose={closeCamera}>
        <View style={styles.cameraModal}>
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="back"
            onCameraReady={() => setCameraReady(true)}
          />
          <SafeAreaView testID="camera-controls" style={styles.cameraControls} edges={['top', 'bottom']}>
          <View style={styles.cameraTopBar}>
            <Pressable
              onPress={closeCamera}
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
            {gpsBusy ? <Text accessibilityLiveRegion="polite" style={{ color: colors.onPrimary }}>Đang lấy GPS và chuẩn bị ảnh…</Text> : null}
            <Pressable
              onPress={() => void handleCapture()}
              disabled={!cameraReady || gpsBusy}
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
    </SafeAreaScreen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
  cardMeta: { color: colors.secondary },
  frozenContent: { gap: spacing.sm },
  frozenNote: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingTop: spacing.sm },
  frozenNoteText: { color: colors.secondary, flex: 1 },
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
  detailsButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sectionLabel: { color: colors.secondary, marginBottom: spacing.sm, marginTop: spacing.sm },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  photoWrapper: { position: 'relative', width: 88, height: 88 },
  photoActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photo: { width: 88, height: 88, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
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
  errorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  errorText: { color: colors.error, flex: 1 },
  busyText: { color: colors.secondary, marginTop: spacing.sm },
  cameraModal: { flex: 1, backgroundColor: colors.neutral },
  cameraControls: { flex: 1 },
  cameraTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
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
    borderWidth: 4,
    borderColor: colors.brandGold,
    backgroundColor: colors.brandGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterPressed: { opacity: 0.8 },
});

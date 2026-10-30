import { useOperatorReadScope } from '../../src/hooks/useOperatorReadScope';
import React, { useEffect, useRef, useState } from 'react';

import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { DRONE_DATASET_BLOCK_REASON } from '../../src/api/droneDatasetWorkflow';
import { openDroneLocalFiles, type DroneLocalFile } from '../../src/api/droneLocalFiles';

const softShadow = Platform.select({
  ios: { shadowColor: '#1A1D20', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  android: { elevation: 3 },
  default: {},
});

type UploadStep = 'LOCAL' | 'QUEUED' | 'UPLOADING' | 'SERVER_CONFIRMED';

interface UploadConfig {
  code: string;
  road: string;
  droneModel: string;
  defaultVideoName: string;
  defaultVideoSize: string;
  defaultSrtName: string;
  defaultSrtSize: string;
  videoSha256: string;
  srtSha256: string;
  gpsCoord: string;
  gpsAddress: string;
}

export default function DroneUploadScreen() {
  const params = useLocalSearchParams<{ code?: string; taskId?: string }>();
  const scope = useOperatorReadScope(params.taskId ?? '');
  const config: UploadConfig = {
    code: params.taskId ?? 'Chưa chọn nhiệm vụ máy chủ',
    road: 'Phạm vi theo gói công việc máy chủ',
    droneModel: 'Chưa xác nhận thiết bị bay từ máy chủ',
    defaultVideoName: 'Chưa chọn tệp', defaultVideoSize: '—',
    defaultSrtName: 'Chưa chọn tệp', defaultSrtSize: '—',
    videoSha256: '—', srtSha256: '—',
    gpsCoord: 'Chưa đọc tọa độ từ tệp GPS',
    gpsAddress: 'Vị trí chưa được đối chiếu với gói công việc',
  };

  // File state (Video & SRT)
  const [videoName, setVideoName] = useState('Chưa chọn tệp');
  const [videoSize, setVideoSize] = useState('—');
  const [videoSha, setVideoSha] = useState('—');

  const [srtName, setSrtName] = useState('Chưa chọn tệp');
  const [srtSize, setSrtSize] = useState('—');
  const [srtSha, setSrtSha] = useState('—');

  // Upload workflow state: LOCAL -> QUEUED -> UPLOADING -> SERVER_CONFIRMED
  const [uploadStep, setUploadStep] = useState<UploadStep>('LOCAL');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [note, setNote] = useState('');
  const [statusMsg] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [onlineMode, setOnlineMode] = useState(true);
  const [submitting] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [srtUri, setSrtUri] = useState<string | null>(null);
  const [savedFiles, setSavedFiles] = useState<(DroneLocalFile & {availability: string})[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);
  const picking = useRef(false);

  const refreshFiles = async () => {
    const isCurrent = scope.capture();
    if (!isCurrent() || !params.taskId) return;
    let runtime: Awaited<ReturnType<typeof openDroneLocalFiles>> | undefined;
    try {
      runtime = await openDroneLocalFiles(params.taskId);
      if (!isCurrent()) return;
      const files = await runtime.list();
      if (isCurrent()) { setSavedFiles(files); setFileError(null); }
    } catch { if (isCurrent()) setFileError('Không đọc được tệp đã lưu. Dữ liệu cũ vẫn được giữ.'); }
    finally { runtime?.close(); }
  };
  const selectFile = (file: DroneLocalFile) => {
    if (file.kind === 'VIDEO') {
      setVideoName(file.name); setVideoUri(file.uri); setVideoSize(`${(file.size / (1024 * 1024)).toFixed(1)} MB`);
      setVideoSha('Đã lưu trên thiết bị · chưa tính mã băm');
    } else {
      setSrtName(file.name); setSrtUri(file.uri); setSrtSize(`${Math.max(1, Math.round(file.size / 1024))} KB`);
      setSrtSha('Đã lưu trên thiết bị · chưa tính mã băm');
    }
    setUploadStep('LOCAL');
  };
  const restoreFile = async (key: string) => {
    const isCurrent = scope.capture();
    if (!isCurrent() || !params.taskId || picking.current) return;
    let runtime: Awaited<ReturnType<typeof openDroneLocalFiles>> | undefined;
    try {
      runtime = await openDroneLocalFiles(params.taskId);
      if (!isCurrent()) return;
      const files = await runtime.list();
      if (!isCurrent()) return;
      const file = files.find(f => f.key === key);
      if (!file || file.availability !== 'LOCAL_UNHASHED') throw Error('file_unavailable');
      selectFile(file); setSubmitError(null);
    } catch { if (isCurrent()) setSubmitError('Tệp không còn đầy đủ. Giữ lịch sử và chọn lại tệp nguồn.'); }
    finally { runtime?.close(); }
  };

  const [previewScope, setPreviewScope] = useState(scope.key);
  useEffect(() => {
    setPreviewScope(scope.key);
    setVideoName('Chưa chọn tệp'); setVideoSize('—'); setVideoSha('—');
    setSrtName('Chưa chọn tệp'); setSrtSize('—'); setSrtSha('—');
    setVideoUri(null); setSrtUri(null); setUploadStep('LOCAL');
    setUploadProgress(0); setSubmitError(null);
    setNote('');
    setSavedFiles([]); setFileError(null); setCopying(false);
    void refreshFiles();
  }, [scope.key]);

  // Chọn video 4K RGB từ thẻ nhớ SD
  const pickFile = async (kind: 'VIDEO' | 'TELEMETRY') => {
    const isCurrent = scope.capture();
    if (!isCurrent() || picking.current) return;
    if (!params.taskId) { setSubmitError('Chọn nhiệm vụ máy chủ trước khi lưu tệp.'); return; }
    picking.current = true; setCopying(true);
    let runtime: Awaited<ReturnType<typeof openDroneLocalFiles>> | undefined;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: kind === 'VIDEO' ? ['video/*', 'video/mp4'] : '*/*',
        copyToCacheDirectory: false,
      });
      if (!isCurrent()) return;
      if (!result.canceled && result.assets && result.assets.length > 0) {
        runtime = await openDroneLocalFiles(params.taskId);
        if (!isCurrent()) return;
        const file = await runtime.preserve(kind,result.assets[0]);
        if (!isCurrent()) return;
        selectFile(file); setSubmitError(null);
      }
    } catch { if (isCurrent()) setSubmitError('Không lưu được tệp đầy đủ. Lựa chọn trước và lịch sử vẫn được giữ; kiểm tra dung lượng rồi chọn lại MP4/SRT.'); }
    finally { runtime?.close(); picking.current = false; if (isCurrent()) {setCopying(false);await refreshFiles();} }
  };
  const handlePickVideo = () => pickFile('VIDEO');
  const handlePickSrt = () => pickFile('TELEMETRY');

  // Fail closed BEFORE any upload: no server-rooted active aircraft source or
  // durable immutable retry journal exists for this screen at the pinned BE.
  const handleStartSubmitDataset = () => {
    setSubmitError(DRONE_DATASET_BLOCK_REASON);
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(drone)/home');
    }
  };

  if (!scope.key || previewScope !== scope.key) return <SafeAreaScreen><Text>Cần phiên Operator hợp lệ để chọn tệp.</Text></SafeAreaScreen>;

  return (
    <SafeAreaScreen
      scroll
      header={
        <View style={styles.topBar}>
          <Pressable
            style={styles.circleIconButton}
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
          >
            <MaterialIcons name="arrow-back" size={20} color={colors.secondary} />
          </Pressable>

          <View style={styles.topBarCenter}>
            <Text style={[typography.titleMd, styles.topBarTitle]}>Nộp dữ liệu khảo sát 4K RGB</Text>
            <Text style={[typography.caption, styles.topBarSub]}>{config.code}</Text>
          </View>

          <View style={styles.codeRightWrap}>
            <MaterialIcons name="sd-storage" size={20} color={colors.primary} />
          </View>
        </View>
      }
    >

      <View style={styles.selectorBar}>
        <Button title="Chọn nhiệm vụ từ máy chủ" variant="secondary" onPress={() => router.push('/(drone)/requests')} />
      </View>
      <Card>
        <Text style={typography.titleMd}>Tệp đã lưu cho nhiệm vụ</Text>
        {copying && <Text accessibilityRole="alert">Đang chọn hoặc sao lưu tệp. Chờ hoàn tất trước khi chọn tệp tiếp theo.</Text>}
        <Text style={typography.caption}>MP4 tối đa 8 GiB; SRT tối đa 10 MiB theo giới hạn máy chủ đã đối chiếu.</Text>
        <Text style={typography.caption}>Cùng tài khoản và máy chủ. Tệp từ phiên cũ cần chọn lại chủ động; chưa tính mã băm, chưa tải lên, chưa được máy chủ xác minh.</Text>
        {savedFiles.map(file => <View key={file.key}>
          <Text>{file.name} · {file.availability === 'LOCAL_UNHASHED' ? 'Bản sao trên thiết bị' : file.availability === 'INCOMPLETE' ? 'Bản sao chưa đầy đủ' : 'Không tìm thấy tệp trên thiết bị'}</Text>
          <Button title={`Dùng tệp đã lưu: ${file.name}`} variant="secondary" disabled={copying || file.availability !== 'LOCAL_UNHASHED'} onPress={() => restoreFile(file.key)} />
        </View>)}
        {!savedFiles.length && <Text>Chưa có tệp đã lưu trong phạm vi này.</Text>}
        {fileError && <Text accessibilityRole="alert">{fileError}</Text>}
        <Button title="Đọc lại tệp đã lưu" variant="secondary" onPress={refreshFiles} />
      </Card>

      {/* Target Road Overview Card */}
      <Card style={styles.contextCard}>
        <View style={styles.contextLeft}>
          <View style={styles.contextIcon}>
            <MaterialIcons name="flight-takeoff" size={20} color={colors.primary} />
          </View>
          <View style={styles.contextTextWrap}>
            <Text style={[typography.caption, styles.contextLabel]}>MỤC TIÊU KHẢO SÁT</Text>
            <Text style={[typography.titleMd, styles.contextTitle]} numberOfLines={1}>{config.road}</Text>
            <Text style={[typography.caption, styles.contextDrone]}>{config.droneModel}</Text>
          </View>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>4K RGB + ODM</Text>
        </View>
      </Card>

      {/* 4-Step Visual Upload Pipeline Indicator */}
      <Card style={styles.pipelineCard}>
        <Text style={[typography.labelSm, styles.pipelineTitle]}>QUY TRÌNH TIẾP NHẬN DỮ LIỆU KHẢO SÁT</Text>
        <View style={styles.stepPipelineRow}>
          {/* Step 1: LOCAL */}
          <View style={styles.stepItem}>
            <View
              style={[
                styles.stepCircle,
                uploadStep === 'LOCAL' && styles.stepCircleCurrent,
                (uploadStep === 'QUEUED' || uploadStep === 'UPLOADING' || uploadStep === 'SERVER_CONFIRMED') &&
                  styles.stepCircleDone,
              ]}
            >
              <MaterialIcons
                name={
                  uploadStep === 'QUEUED' || uploadStep === 'UPLOADING' || uploadStep === 'SERVER_CONFIRMED'
                    ? 'check'
                    : 'sd-card'
                }
                size={14}
                color={
                  uploadStep === 'LOCAL'
                    ? colors.primaryDark
                    : uploadStep === 'QUEUED' || uploadStep === 'UPLOADING' || uploadStep === 'SERVER_CONFIRMED'
                    ? colors.surface
                    : colors.secondary
                }
              />
            </View>
            <Text style={[typography.caption, styles.stepLabel]}>LOCAL</Text>
            <Text style={styles.stepSubLabel}>Thẻ nhớ SD</Text>
          </View>

          <View
            style={[
              styles.stepLine,
              (uploadStep === 'QUEUED' || uploadStep === 'UPLOADING' || uploadStep === 'SERVER_CONFIRMED') &&
                styles.stepLineActive,
            ]}
          />

          {/* Step 2: QUEUED */}
          <View style={styles.stepItem}>
            <View
              style={[
                styles.stepCircle,
                uploadStep === 'QUEUED' && styles.stepCircleCurrent,
                (uploadStep === 'UPLOADING' || uploadStep === 'SERVER_CONFIRMED') && styles.stepCircleDone,
              ]}
            >
              <MaterialIcons
                name={
                  uploadStep === 'UPLOADING' || uploadStep === 'SERVER_CONFIRMED' ? 'check' : 'inbox'
                }
                size={14}
                color={
                  uploadStep === 'QUEUED'
                    ? colors.primaryDark
                    : uploadStep === 'UPLOADING' || uploadStep === 'SERVER_CONFIRMED'
                    ? colors.surface
                    : colors.secondary
                }
              />
            </View>
            <Text style={[typography.caption, styles.stepLabel]}>CHUẨN BỊ</Text>
            <Text style={styles.stepSubLabel}>Kiểm tra tệp</Text>
          </View>

          <View
            style={[
              styles.stepLine,
              (uploadStep === 'UPLOADING' || uploadStep === 'SERVER_CONFIRMED') && styles.stepLineActive,
            ]}
          />

          {/* Step 3: UPLOADING */}
          <View style={styles.stepItem}>
            <View
              style={[
                styles.stepCircle,
                uploadStep === 'UPLOADING' && styles.stepCircleCurrent,
                uploadStep === 'SERVER_CONFIRMED' && styles.stepCircleDone,
              ]}
            >
              <MaterialIcons
                name={uploadStep === 'SERVER_CONFIRMED' ? 'check' : 'cloud-upload'}
                size={14}
                color={
                  uploadStep === 'UPLOADING'
                    ? colors.primaryDark
                    : uploadStep === 'SERVER_CONFIRMED'
                    ? colors.surface
                    : colors.secondary
                }
              />
            </View>
            <Text style={[typography.caption, styles.stepLabel]}>UPLOADING</Text>
            <Text style={styles.stepSubLabel}>
              {uploadStep === 'UPLOADING' ? `${uploadProgress}%` : 'Đang tải'}
            </Text>
          </View>

          <View
            style={[
              styles.stepLine,
              uploadStep === 'SERVER_CONFIRMED' && styles.stepLineActive,
            ]}
          />

          {/* Step 4: SERVER_CONFIRMED */}
          <View style={styles.stepItem}>
            <View
              style={[
                styles.stepCircle,
                uploadStep === 'SERVER_CONFIRMED' && styles.stepCircleDone,
              ]}
            >
              <MaterialIcons
                name="verified"
                size={14}
                color={
                  uploadStep === 'SERVER_CONFIRMED' ? colors.surface : colors.secondary
                }
              />
            </View>
            <Text style={[typography.caption, styles.stepLabel]}>ĐÃ XÁC MINH</Text>
            <Text style={styles.stepSubLabel}>Máy chủ ODM</Text>
          </View>
        </View>

        {/* Progress Bar when uploading */}
        {uploadStep === 'UPLOADING' && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${uploadProgress}%` }]} />
            </View>
            <Text style={[typography.caption, styles.progressText]}>
              Đang đẩy tệp 4K RGB lên máy chủ: {uploadProgress}%
            </Text>
          </View>
        )}

        {/* Success Banner when server confirmed */}
        {uploadStep === 'SERVER_CONFIRMED' && (
          <View style={styles.verifiedBanner}>
            <MaterialIcons name="check-circle" size={18} color={colors.success} />
            <View style={styles.verifiedBannerContent}>
              <Text style={styles.verifiedBannerTitle}>
                Máy chủ đã xác nhận toàn vẹn dữ liệu
              </Text>
              <Text style={styles.verifiedBannerSub}>
                Chỉ xác nhận sau khi có kết quả đọc lại từ máy chủ.
              </Text>
            </View>
          </View>
        )}
      </Card>

      {/* File 1: Video 4K RGB */}
      <Card style={styles.fileCard}>
        <View style={styles.fileCardHeader}>
          <View style={styles.fileCardHeaderLeft}>
            <MaterialIcons name="videocam" size={18} color={colors.primary} />
            <Text style={[typography.labelSm, styles.fileHeaderTitle]}>
              1. TỆP VIDEO BAY 4K RGB (.MP4)
            </Text>
          </View>
          <Pressable
            style={styles.pickFileBtn}
            onPress={handlePickVideo}
            disabled={copying}
            accessibilityRole="button"
          >
            <MaterialIcons name="folder-open" size={14} color={colors.neutral} />
            <Text style={styles.pickFileBtnText}>Chọn tệp SD</Text>
          </Pressable>
        </View>

        <View style={styles.fileInfoRow}>
          <View style={styles.fileIconBox}>
            <MaterialIcons name="movie" size={24} color={colors.primary} />
          </View>
          <View style={styles.fileDetailsGroup}>
            <Text testID="selected-video" style={[typography.titleMd, styles.fileNameText]}>{videoName}</Text>
            <Text style={[typography.caption, styles.fileSizeText]}>
              Dung lượng: <Text style={styles.boldText}>{videoSize}</Text> · Chưa kiểm tra thông số video
            </Text>
          </View>
        </View>

        {/* Checksum SHA-256 Card */}
        <View style={styles.checksumBox}>
          <MaterialIcons name="info-outline" size={16} color={colors.secondary} />
          <View style={styles.checksumTextGroup}>
            <Text style={styles.checksumLabel}>Mã băm SHA-256:</Text>
            <Text style={styles.checksumHash} numberOfLines={1}>{videoSha}</Text>
          </View>
        </View>
      </Card>

      {/* File 2: Phụ đề tọa độ GPS RTK (.SRT) */}
      <Card style={styles.fileCard}>
        <View style={styles.fileCardHeader}>
          <View style={styles.fileCardHeaderLeft}>
            <MaterialIcons name="subtitles" size={18} color={colors.primary} />
            <Text style={[typography.labelSm, styles.fileHeaderTitle]}>
              2. PHỤ ĐỀ TỌA ĐỘ GPS RTK (.SRT)
            </Text>
          </View>
          <Pressable
            style={styles.pickFileBtn}
            onPress={handlePickSrt}
            disabled={copying}
            accessibilityRole="button"
          >
            <MaterialIcons name="folder-open" size={14} color={colors.neutral} />
            <Text style={styles.pickFileBtnText}>Chọn tệp SD</Text>
          </Pressable>
        </View>

        <View style={styles.fileInfoRow}>
          <View style={styles.fileIconBox}>
            <MaterialIcons name="description" size={24} color={colors.primary} />
          </View>
          <View style={styles.fileDetailsGroup}>
            <Text style={[typography.titleMd, styles.fileNameText]}>{srtName}</Text>
            <Text style={[typography.caption, styles.fileSizeText]}>
              Dung lượng: <Text style={styles.boldText}>{srtSize}</Text> · Chưa kiểm tra dữ liệu GPS
            </Text>
          </View>
        </View>

        <View style={styles.checksumBox}>
          <MaterialIcons name="info-outline" size={16} color={colors.secondary} />
          <View style={styles.checksumTextGroup}>
            <Text style={styles.checksumLabel}>Mã băm tệp GPS:</Text>
            <Text style={styles.checksumHash} numberOfLines={1}>{srtSha}</Text>
          </View>
        </View>
      </Card>

      {/* GPS Location Card */}
      <Card style={styles.gpsCard}>
        <View style={styles.gpsIconBox}>
          <MaterialIcons name="location-searching" size={20} color={colors.secondary} />
        </View>
        <View style={styles.gpsInfo}>
          <View style={styles.gpsTopRow}>
            <Text style={[typography.caption, styles.gpsLabel]}>TỌA ĐỘ GPS KHẢO SÁT</Text>
            <View style={styles.matchedBadge}>
              <Text style={styles.matchedText}>Chưa đối chiếu vị trí</Text>
            </View>
          </View>
          <Text style={[typography.bodyMd, styles.gpsCoord]}>
            {config.gpsCoord}
          </Text>
          <Text style={[typography.caption, styles.gpsAddress]}>
            {config.gpsAddress}
          </Text>
        </View>
      </Card>

      {/* Field Note */}
      <View style={styles.noteContainer}>
        <Text style={[typography.labelLg, styles.noteLabel]}>
          Ghi chú hiện trường <Text style={styles.noteOptional}>(không bắt buộc)</Text>
        </Text>
        <TextInput
          style={styles.noteInput}
          multiline
          numberOfLines={3}
          value={note}
          onChangeText={setNote}
          placeholder="Ghi nhận điều kiện gió, ánh sáng, tầm nhìn hoặc hiện trạng mặt đường..."
          placeholderTextColor={colors.secondary}
        />
      </View>

      <Text style={typography.caption}>Tệp chọn thành công có bản sao riêng trên thiết bị; chưa checksum, chưa tải lên. Ghi chú chỉ nằm trên màn hình. Lựa chọn mạng bên dưới chưa thay đổi kết nối thiết bị.</Text>
      {/* Network Mode Card */}
      <Card style={styles.networkCard}>
        <View style={styles.networkTitleGroup}>
          <MaterialIcons name="wifi" size={18} color={colors.primary} />
          <Text style={[typography.labelSm, styles.networkTitle]}>
            CHẾ ĐỘ ĐỒNG BỘ NGOẠI TUYẾN
          </Text>
        </View>

        <View style={styles.networkToggleRow}>
          <Pressable
            style={[styles.toggleBtn, onlineMode && styles.toggleBtnActive]}
            onPress={() => setOnlineMode(true)}
            accessibilityRole="radio"
            accessibilityState={{ checked: onlineMode }}
          >
            <View style={[styles.networkDot, { backgroundColor: colors.success }]} />
            <Text style={[styles.toggleText, onlineMode && styles.toggleTextActive]}>
              Trực tuyến (Wi-Fi/4G)
            </Text>
          </Pressable>

          <Pressable
            style={[styles.toggleBtn, !onlineMode && styles.toggleBtnActive]}
            onPress={() => setOnlineMode(false)}
            accessibilityRole="radio"
            accessibilityState={{ checked: !onlineMode }}
          >
            <View style={[styles.networkDot, { backgroundColor: colors.warning }]} />
            <Text style={[styles.toggleText, !onlineMode && styles.toggleTextActive]}>
              Ngoại tuyến
            </Text>
          </Pressable>
        </View>
      </Card>

      {/* Action CTA Section */}
      <View style={styles.actionSection}>
        {uploadStep === 'SERVER_CONFIRMED' ? (
          <Button
            variant="primary"
            title="Xem nhật ký chuyến bay khảo sát"
            onPress={() =>
              router.push({
                pathname: '/(drone)/log',
                params: { code: config.code },
              })
            }
          />
        ) : (
          <Button
            variant="primary"
            title={
              uploadStep === 'UPLOADING'
                ? `Đang đẩy dữ liệu (${uploadProgress}%)...`
                : uploadStep === 'QUEUED'
                ? 'Đang chuẩn bị tệp...'
                : `Nộp bộ dữ liệu 4K RGB (${config.code})`
            }
            loading={submitting}
            disabled={true}
            onPress={handleStartSubmitDataset}
          />
        )}
        <Text accessibilityRole="alert" style={typography.caption}>{DRONE_DATASET_BLOCK_REASON}</Text>
        {submitError && <Text style={[typography.caption, styles.statusError]}>{submitError}</Text>}
        {statusMsg && <Text style={[typography.caption, styles.statusMsg]}>{statusMsg}</Text>}
      </View>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenMargin,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  circleIconButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarCenter: {
    alignItems: 'center',
  },
  topBarTitle: {
    color: colors.neutral,
    fontWeight: '700',
  },
  topBarSub: {
    color: colors.brandGold,
    fontWeight: '600',
  },
  codeRightWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorBar: {
    marginBottom: spacing.sm,
  },
  selectorTitle: {
    color: colors.secondary,
    marginBottom: spacing.xs,
  },
  selectorScroll: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingBottom: 2,
  },
  selectorChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectorChipActive: {
    backgroundColor: '#FEF9E7',
    borderColor: colors.primary,
  },
  selectorChipText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.secondary,
  },
  selectorChipTextActive: {
    color: colors.primaryDark,
  },
  contextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  contextLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  contextIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: '#FEF3E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextTextWrap: {
    flex: 1,
  },
  contextLabel: {
    color: colors.secondary,
  },
  contextTitle: {
    color: colors.neutral,
    fontWeight: '700',
  },
  contextDrone: {
    color: colors.secondary,
    fontSize: 11,
  },
  statusBadge: {
    backgroundColor: '#FEF3E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  statusBadgeText: {
    color: colors.primaryDark,
    fontSize: 10,
    fontWeight: 'bold',
  },
  pipelineCard: {
    marginBottom: spacing.sm,
    padding: spacing.sm,
  },
  pipelineTitle: {
    color: colors.secondary,
    marginBottom: spacing.sm,
  },
  stepPipelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepItem: {
    alignItems: 'center',
    width: 60,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepCircleCurrent: {
    borderColor: colors.primary,
    backgroundColor: '#FEF9E7',
  },
  stepCircleDone: {
    borderColor: colors.success,
    backgroundColor: colors.success,
  },
  stepLabel: {
    fontWeight: '700',
    fontSize: 10,
    color: colors.neutral,
  },
  stepSubLabel: {
    fontSize: 9,
    color: colors.secondary,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 2,
    marginBottom: 16,
  },
  stepLineActive: {
    backgroundColor: colors.success,
  },
  progressContainer: {
    marginTop: spacing.sm,
    gap: 4,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  progressText: {
    color: colors.primaryDark,
    fontWeight: '500',
    textAlign: 'center',
  },
  verifiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#E9F7EC',
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  verifiedBannerContent: {
    flex: 1,
  },
  verifiedBannerTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.success,
  },
  verifiedBannerSub: {
    fontSize: 10,
    color: colors.secondary,
    marginTop: 1,
  },
  fileCard: {
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  fileCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.xs,
  },
  fileCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fileHeaderTitle: {
    color: colors.secondary,
  },
  pickFileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  pickFileBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral,
  },
  fileInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  fileIconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: '#FEF3E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileDetailsGroup: {
    flex: 1,
  },
  fileNameText: {
    color: colors.neutral,
    fontFamily: 'Roboto-Medium',
  },
  fileSizeText: {
    color: colors.secondary,
    marginTop: 2,
  },
  boldText: {
    fontWeight: 'bold',
    color: colors.neutral,
  },
  checksumBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.xs,
  },
  checksumTextGroup: {
    flex: 1,
  },
  checksumLabel: {
    fontSize: 10,
    color: colors.secondary,
    fontWeight: '500',
  },
  checksumHash: {
    fontSize: 11,
    fontFamily: 'Roboto',
    color: colors.success,
    fontWeight: 'bold',
    marginTop: 1,
  },
  gpsCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: radius.xl,
    ...softShadow,
  },
  gpsIconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: '#E9F7EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  gpsInfo: {
    flex: 1,
  },
  gpsTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gpsLabel: {
    color: colors.secondary,
  },
  matchedBadge: {
    backgroundColor: '#E9F7EC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  matchedText: {
    color: colors.success,
    fontSize: 10,
    fontWeight: 'bold',
  },
  gpsCoord: {
    color: colors.neutral,
    fontWeight: 'bold',
    fontFamily: 'Roboto',
    marginTop: 2,
  },
  gpsAddress: {
    color: colors.secondary,
    marginTop: 2,
  },
  noteContainer: {
    marginBottom: spacing.sm,
  },
  noteLabel: {
    color: colors.secondary,
    marginBottom: 4,
  },
  noteOptional: {
    color: colors.secondary,
    fontSize: 12,
    fontWeight: 'normal',
  },
  noteInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    minHeight: 64,
    color: colors.neutral,
    textAlignVertical: 'top',
  },
  networkCard: {
    gap: spacing.sm,
    marginBottom: spacing.md,
    borderRadius: radius.xl,
    ...softShadow,
  },
  networkTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  networkTitle: {
    color: colors.neutral,
    fontWeight: '600',
  },
  networkToggleRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
  },
  toggleBtnActive: {
    backgroundColor: colors.surface,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  networkDot: {
    width: 7,
    height: 7,
    borderRadius: radius.full,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.secondary,
  },
  toggleTextActive: {
    color: colors.neutral,
    fontWeight: '700',
  },
  actionSection: {
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  statusMsg: {
    color: colors.primaryDark,
    textAlign: 'center',
  },
  statusError: {
    color: colors.error,
    textAlign: 'center',
  },
});

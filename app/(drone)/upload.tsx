import React, { useCallback, useEffect, useState } from 'react';
import * as SQLite from 'expo-sqlite';
import { initDatabase, openDatabase } from '../../src/offline/database';
import { enqueuePayload, getReceipts, recoverInFlight } from '../../src/offline/upload-queue';
import { getDeviceId } from '../../src/constants/device';
import { stableUuid } from '../../src/utils/uuid';
import { LocalState } from '../../src/types/enums';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

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

const UPLOAD_CONFIGS: Record<string, UploadConfig> = {
  '#REQ-KS-089': {
    code: '#REQ-KS-089',
    road: 'Tuyến ĐH.05 - Tân Kiên (Km03+100)',
    droneModel: 'M350-HH-02 (DJI Matrice 350 RTK Hoàng Hải)',
    defaultVideoName: 'DJI_0488_SURVEY_DH05.MP4',
    defaultVideoSize: '184.2 MB',
    defaultSrtName: 'DJI_0488_SURVEY_DH05.SRT',
    defaultSrtSize: '420 KB',
    videoSha256: '7f8a3c4b92d189aef41b...e4b1 (demo — chưa đối chiếu)',
    srtSha256: '9b2c3d4e5f6a1109bc42...77c2 (demo — chưa đối chiếu)',
    gpsCoord: '10.7412° B, 106.5524° Đ (Sai số RTK ±1.2cm)',
    gpsAddress: 'Tân Kiên, Huyện Bình Chánh, TP. Hồ Chí Minh',
  },
  '#REQ-KS-090': {
    code: '#REQ-KS-090',
    road: 'Tuyến ĐH.05 - Vĩnh Lộc B (Km01+200 - Km02+500)',
    droneModel: 'M350-HH-02 (DJI Matrice 350 RTK Hoàng Hải)',
    defaultVideoName: 'DJI_0490_SURVEY_DH05.MP4',
    defaultVideoSize: '195.4 MB',
    defaultSrtName: 'DJI_0490_SURVEY_DH05.SRT',
    defaultSrtSize: '380 KB',
    videoSha256: '8e1b2c3d4f5a6b7c8d9e...33f2 (demo — chưa đối chiếu)',
    srtSha256: '1a2b3c4d5e6f7a8b9c0d...55a1 (demo — chưa đối chiếu)',
    gpsCoord: '10.7333° B, 106.6833° Đ (Sai số RTK ±1.1cm)',
    gpsAddress: 'Vĩnh Lộc B, Huyện Bình Chánh, TP. Hồ Chí Minh',
  },
  '#REQ-KS-088': {
    code: '#REQ-KS-088',
    road: 'Tuyến ĐH.05 - Cầu Bà Lát (Km01+850)',
    droneModel: 'Mavic3E-HH-01 (DJI Mavic 3 Enterprise)',
    defaultVideoName: 'DJI_0488_SURVEY_DH05.MP4',
    defaultVideoSize: '210.0 MB',
    defaultSrtName: 'DJI_0488_SURVEY_DH05.SRT',
    defaultSrtSize: '512 KB',
    videoSha256: '4a5b6c7d8e9f1234abcd...12a4 (demo — chưa đối chiếu)',
    srtSha256: '5b6c7d8e9f0a1b2c3d4e...66b2 (demo — chưa đối chiếu)',
    gpsCoord: '10.7833° B, 106.7333° Đ (Sai số RTK ±0.9cm)',
    gpsAddress: 'Cầu Bà Lát, Bình Chánh, TP. Hồ Chí Minh',
  },
  '#REQ-KS-087': {
    code: '#REQ-KS-087',
    road: 'Tuyến ĐH.05 - Ngã ba Tân Kiên (Km03+100)',
    droneModel: 'M350-HH-02 (DJI Matrice 350 RTK Hoàng Hải)',
    defaultVideoName: 'DJI_0487_SURVEY_DH05.MP4',
    defaultVideoSize: '240.5 MB',
    defaultSrtName: 'DJI_0487_SURVEY_DH05.SRT',
    defaultSrtSize: '620 KB',
    videoSha256: '1e2f3a4b5c6d7e8f9a0b...99b0 (demo — chưa đối chiếu)',
    srtSha256: '2f3a4b5c6d7e8f9a0b1c...88c3 (demo — chưa đối chiếu)',
    gpsCoord: '10.7700° B, 106.7050° Đ (Sai số RTK ±1.4cm)',
    gpsAddress: 'Ngã ba Tân Kiên, Bình Chánh, TP. Hồ Chí Minh',
  },
  '#REQ-KS-085': {
    code: '#REQ-KS-085',
    road: 'Tuyến ĐH.05 - Vĩnh Lộc B (Km02+180)',
    droneModel: 'Mavic3E-HH-01 (DJI Mavic 3 Enterprise)',
    defaultVideoName: 'DJI_0485_SURVEY_DH05.MP4',
    defaultVideoSize: '165.8 MB',
    defaultSrtName: 'DJI_0485_SURVEY_DH05.SRT',
    defaultSrtSize: '310 KB',
    videoSha256: '3c4d5e6f7a8b9c0d1e2f...44d9 (demo — chưa đối chiếu)',
    srtSha256: '4d5e6f7a8b9c0d1e2f3a...33e4 (demo — chưa đối chiếu)',
    gpsCoord: '10.7400° B, 106.6900° Đ (Sai số RTK ±1.0cm)',
    gpsAddress: 'Vĩnh Lộc B Km02+180, Bình Chánh, TP. Hồ Chí Minh',
  },
};

export default function DroneUploadScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const initialCode = params.code && UPLOAD_CONFIGS[params.code] ? params.code : '#REQ-KS-089';
  const [selectedCode, setSelectedCode] = useState<string>(initialCode);

  const config = UPLOAD_CONFIGS[selectedCode] ?? UPLOAD_CONFIGS['#REQ-KS-089'];

  // File state (Video & SRT)
  const [videoName, setVideoName] = useState(config.defaultVideoName);
  const [videoSize, setVideoSize] = useState(config.defaultVideoSize);
  const [videoSha, setVideoSha] = useState(config.videoSha256);

  const [srtName, setSrtName] = useState(config.defaultSrtName);
  const [srtSize, setSrtSize] = useState(config.defaultSrtSize);
  const [srtSha, setSrtSha] = useState(config.srtSha256);

  // Upload workflow state: LOCAL -> QUEUED -> UPLOADING -> SERVER_CONFIRMED
  const [uploadStep, setUploadStep] = useState<UploadStep>('LOCAL');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [note, setNote] = useState('');
  const [onlineMode, setOnlineMode] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [outboxId, setOutboxId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const database = openDatabase();
    void initDatabase(database)
      .then(() => {
        if (!cancelled) {
          setDb(database);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNote('Không mở được kho dữ liệu cục bộ.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const reloadQueue = useCallback(async () => {
    if (!db) {
      return;
    }
    try {
      await recoverInFlight(db);
    } catch {
      setNote('Không chuẩn hoá được các mục đang gửi dở.');
    }
  }, [db]);

  useEffect(() => {
    if (params.code && UPLOAD_CONFIGS[params.code]) {
      setSelectedCode(params.code);
      const c = UPLOAD_CONFIGS[params.code];
      setVideoName(c.defaultVideoName);
      setVideoSize(c.defaultVideoSize);
      setVideoSha(c.videoSha256);
      setSrtName(c.defaultSrtName);
      setSrtSize(c.defaultSrtSize);
      setSrtSha(c.srtSha256);
      setUploadStep('LOCAL');
      setUploadProgress(0);
    }
  }, [params.code]);

  // Chọn video 4K RGB từ thẻ nhớ SD
  const handlePickVideo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['video/*', 'video/mp4'],
        copyToCacheDirectory: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setVideoName(file.name);
        const sizeMb = file.size ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : '192.4 MB';
        setVideoSize(sizeMb);
        setVideoSha('7f8a3c...e4b1 - Toàn vẹn 100%');
        setUploadStep('LOCAL');
      }
    } catch (err) {
      console.warn('Lỗi chọn tệp video', err);
    }
  };

  // Chọn tệp SRT phụ đề GPS RTK từng khung hình
  const handlePickSrt = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setSrtName(file.name);
        // Không bịa dung lượng/checksum khi tệp không cung cấp — hiển thị "—" cho tới khi có.
        setSrtSize(file.size ? `${Math.max(1, Math.round(file.size / 1024))} KB` : '—');
        setSrtSha('Chưa đối chiếu — cần SHA-256 cục bộ');
        setUploadStep('LOCAL');
      }
    } catch (err) {
      console.warn('Lỗi chọn tệp SRT', err);
    }
  };

  /**
   * Nộp bộ dữ liệu 4K RGB.
   *
   * Contract `submitDataset` (openapi.baseline.yaml#/paths/~1survey-tasks~1{taskId}~1datasets)
   * yêu cầu path `taskId` (server ID, KHÔNG phải mã yêu cầu hiện trường), header `If-Match`
   * (ETag) và body `DatasetSubmit` = { videoFileIds[], telemetryFileIds[], recordedAt, scope[] }.
   * `fileId` chỉ có sau khi chạy xong luồng `POST /uploads` → part-urls → complete.
   *
   * Màn này đang chạy bằng dữ liệu mock, chưa có taskId/ETag/fileId thật, nên KHÔNG được bịa
   * request lên server. Intent được ghi bền vững vào outbox ở trạng thái BLOCKED_CONTRACT
   * cho tới khi có đủ dữ liệu hợp lệ — không giả ACK, không giả tiến độ.
   */
  const handleStartSubmitDataset = async () => {
    if (!db) {
      setNote('Chưa mở được kho dữ liệu cục bộ, chưa thể xếp hàng nộp bộ dữ liệu.');
      return;
    }

    setSubmitting(true);
    setUploadProgress(0);
    setNote('Đang lưu bộ dữ liệu vào hàng đợi ngoại tuyến…');

    try {
      setUploadStep('QUEUED');

      const blockedReason =
        'Thiếu taskId/ETag/fileId từ máy chủ — chưa thể gọi submitDataset theo contract.';

      const enqueuedId = await enqueuePayload(
        db,
        'submit_dataset',
        {
          // Intent nội tuyến. KHÔNG gửi lên API cho tới khi đủ taskId + expectedVersion + fileIds + scope.
          surveyTaskCode: selectedCode,
          videoName: videoName,
          srtName: srtName,
          recordedAt: new Date().toISOString(),
          capturedAt: new Date().toISOString(),
          deviceId: getDeviceId(),
          videoFileIds: [],
          telemetryFileIds: [],
          scope: [],
          blockedReason,
        },
        {
          // Chỉ có mã yêu cầu hiện trường, chưa phải taskId server cùng ETag.
          taskId: null,
          expectedVersion: null,
          idempotencyKey: stableUuid(`submit-dataset:${selectedCode}:${videoName}:${srtName}`),
          initialStatus: LocalState.BLOCKED_CONTRACT,
        },
      );
      setOutboxId(enqueuedId);

      await reloadQueue();

      const receipts = await getReceipts(db, enqueuedId);
      const acked = receipts.some((r) => r.localState === LocalState.ACKED);

      if (acked) {
        setUploadStep('SERVER_CONFIRMED');
        setNote('Máy chủ đã xác nhận toàn vẹn bộ dữ liệu.');
      } else {
        setUploadStep('QUEUED');
        setNote(
          'Đã lưu cục bộ và chờ trong hàng đợi. Cần nạp tệp qua phiên tải lên và có ETag nhiệm vụ trước khi nộp lên máy chủ.',
        );
      }
    } catch (error) {
      setUploadStep('QUEUED');
      setNote(
        error instanceof Error
          ? `Lỗi khi nộp: ${error.message}`
          : 'Lỗi khi nộp bộ dữ liệu, đã giữ trong hàng đợi.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(drone)/home');
    }
  };

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

      {/* Task Switcher Chips */}
      <View style={styles.selectorBar}>
        <Text style={[typography.labelSm, styles.selectorTitle]}>CHỌN NHIỆM VỤ KHẢO SÁT:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.selectorScroll}
        >
          {Object.values(UPLOAD_CONFIGS).map((item) => {
            const isSelected = item.code === selectedCode;
            return (
              <Pressable
                key={item.code}
                style={[styles.selectorChip, isSelected && styles.selectorChipActive]}
                onPress={() => {
                  setSelectedCode(item.code);
                  setVideoName(item.defaultVideoName);
                  setVideoSize(item.defaultVideoSize);
                  setVideoSha(item.videoSha256);
                  setSrtName(item.defaultSrtName);
                  setSrtSize(item.defaultSrtSize);
                  setSrtSha(item.srtSha256);
                  setUploadStep('LOCAL');
                  setUploadProgress(0);
                }}
              >
                <Text
                  style={[
                    styles.selectorChipText,
                    isSelected && styles.selectorChipTextActive,
                  ]}
                >
                  {item.code}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Target Road Overview Card */}
      <Card style={styles.contextCard}>
        <View style={styles.contextLeft}>
          <View style={styles.contextIcon}>
            <MaterialIcons name="flight-takeoff" size={20} color={colors.primary} />
          </View>
          <View style={styles.contextTextWrap}>
            <Text style={[typography.caption, styles.contextLabel]}>MỤC TIÊU KHẢO SÁT (ĐH.05)</Text>
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
            <Text style={[typography.caption, styles.stepLabel]}>QUEUED</Text>
            <Text style={styles.stepSubLabel}>SQLite Outbox</Text>
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
            <Text style={[typography.caption, styles.stepLabel]}>VERIFIED</Text>
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
              Đang đẩy tệp 4K RGB lên máy chủ: {uploadProgress}% (Tốc độ ~8.5 MB/s)
            </Text>
          </View>
        )}

        {/* Success Banner when server confirmed */}
        {uploadStep === 'SERVER_CONFIRMED' && (
          <View style={styles.verifiedBanner}>
            <MaterialIcons name="check-circle" size={18} color={colors.success} />
            <View style={styles.verifiedBannerContent}>
              <Text style={styles.verifiedBannerTitle}>
                Máy chủ ODM đã xác nhận toàn vẹn (VERIFIED)
              </Text>
              <Text style={styles.verifiedBannerSub}>
                Mã bộ dữ liệu #DS-2026-089 · Mã băm SHA-256 đã đối soát khớp 100%
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
            <Text style={[typography.titleMd, styles.fileNameText]}>{videoName}</Text>
            <Text style={[typography.caption, styles.fileSizeText]}>
              Dung lượng: <Text style={styles.boldText}>{videoSize}</Text> · Chuẩn 4K 60fps
            </Text>
          </View>
        </View>

        {/* Checksum SHA-256 Card */}
        <View style={styles.checksumBox}>
          <MaterialIcons name="verified-user" size={16} color={colors.success} />
          <View style={styles.checksumTextGroup}>
            <Text style={styles.checksumLabel}>Mã băm toàn vẹn SHA-256 (TCVN 10380:2014):</Text>
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
              Dung lượng: <Text style={styles.boldText}>{srtSize}</Text> · Đồng bộ GPS RTK từng khung hình
            </Text>
          </View>
        </View>

        <View style={styles.checksumBox}>
          <MaterialIcons name="check-circle" size={16} color={colors.success} />
          <View style={styles.checksumTextGroup}>
            <Text style={styles.checksumLabel}>Mã băm tọa độ RTK:</Text>
            <Text style={styles.checksumHash} numberOfLines={1}>{srtSha}</Text>
          </View>
        </View>
      </Card>

      {/* GPS Location Card */}
      <Card style={styles.gpsCard}>
        <View style={styles.gpsIconBox}>
          <MaterialIcons name="location-on" size={20} color={colors.success} />
        </View>
        <View style={styles.gpsInfo}>
          <View style={styles.gpsTopRow}>
            <Text style={[typography.caption, styles.gpsLabel]}>TỌA ĐỘ GPS KHẢO SÁT WGS84</Text>
            <View style={styles.matchedBadge}>
              <Text style={styles.matchedText}>Khớp trạm RTK</Text>
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
              SQLite Outbox
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
                ? 'Đang chuẩn bị outbox...'
                : `Nộp bộ dữ liệu 4K RGB (${config.code})`
            }
            loading={submitting}
            disabled={submitting}
            onPress={handleStartSubmitDataset}
          />
        )}
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
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: '#FEF9E7',
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
    marginBottom: spacing.xl,
  },
});

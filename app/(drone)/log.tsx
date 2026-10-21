import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { Chip } from '../../src/components/Chip';
import { Button } from '../../src/components/Button';
import { Toast } from '../../src/components/Toast';
import { messageFor } from '../../src/api/errorCatalog';
import { parseProblemDetails } from '../../src/api/problemDetails';
import {
  getOperatorUploadSession,
  listOperatorCommands,
  reconcileOperatorCommand,
  replayOperatorCommand,
  type OperatorCommandRecord,
  type OperatorCommandState,
} from '../../src/api/mock/surveys';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

const softShadow = Platform.select({
  ios: { shadowColor: '#1A1D20', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  android: { elevation: 3 },
  default: {},
});

const UPLOAD_STATUS_LABELS: Record<string, string> = {
  pending: 'đang chờ',
  uploading: 'đang tải lên',
  verifying: 'đang xác minh',
  complete_requested: 'đang chờ xác minh',
  verified: 'đã xác minh',
  failed: 'bị lỗi',
};

interface SurveyLogItem {
  id: string;
  code: string;
  flightCode: string;
  surveyCode: string;
  timestamp: string;
  title: string;
  location: string;
  droneDevice: string;
  specs: string;
  status: 'processing' | 'done';
  statusText: string;
  actionText: string;
  highlight?: boolean;
}

const ACTIVE_FLIGHT_LOG = {
  flightCode: '#FL-2026-089',
  surveyCode: '#HH-KS-089',
  roadTitle: 'Tuyến ĐH.05 - Tân Kiên (Km03+100)',
  location: 'Tân Kiên, Bình Chánh, TP.HCM',
  droneId: 'M350-HH-02',
  droneModel: 'DJI Matrice 350 RTK Hoàng Hải',
  baseStation: 'D-RTK 2 Base Station (Cột mốc BM-01)',
  takeoffTime: '08:35',
  landingTime: '08:59',
  duration: '24 phút',
  weather: 'Nắng nhẹ, tầm nhìn > 10 km',
  windSpeed: '3.2 m/s',
  batteryModel: 'Pin thông minh TB65 kép',
  batteryStart: '98%',
  batteryEnd: '42%',
  batteryConsumed: '56%',
  batteryCycles: '28 lần',
  orthophotoCount: '420 ảnh trực giao',
  sha256Checksum: '7f8a3c...e4b1 - Khớp 100%',
  surfaceModel: 'Tái dựng DSM bằng OpenDroneMap (ODM)',
};

const SURVEY_LOGS: SurveyLogItem[] = [
  {
    id: '1',
    code: '#HH-409',
    flightCode: '#FL-2026-089',
    surveyCode: '#HH-KS-089',
    timestamp: 'Hôm nay, 08:59',
    title: 'Tuyến ĐH.05 - Tân Kiên (Km03+100)',
    location: 'Bình Chánh, TP.HCM',
    droneDevice: 'M350-HH-02 (Matrice 350 RTK)',
    specs: '4K RGB · 420 ảnh · DSM OpenDroneMap · RTK cm',
    status: 'processing',
    statusText: 'Đang nhận diện khuyết tật bê tông nông thôn (ODM)',
    actionText: 'Xem tiến độ >',
    highlight: true,
  },
  {
    id: '2',
    code: '#HH-398',
    flightCode: '#FL-2026-088',
    surveyCode: '#HH-KS-088',
    timestamp: 'Hôm qua, 09:15',
    title: 'Tuyến ĐH.05 - Cầu Bà Lát (Km01+850)',
    location: 'Bình Chánh, TP.HCM',
    droneDevice: 'Mavic3E-HH-01 (Mavic 3 Enterprise)',
    specs: '4K RGB · 380 ảnh · DSM OpenDroneMap · RTK cm',
    status: 'done',
    statusText: 'Phát hiện 14 điểm nứt tấm & 3 ổ gà sâu bê tông',
    actionText: 'Xem kết quả >',
  },
  {
    id: '3',
    code: '#HH-382',
    flightCode: '#FL-2026-087',
    surveyCode: '#HH-KS-087',
    timestamp: '22/10/2025',
    title: 'Tuyến ĐH.05 - Vĩnh Lộc B (Km01+200 - Km02+500)',
    location: 'Bình Chánh, TP.HCM',
    droneDevice: 'M350-HH-02 (Matrice 350 RTK)',
    specs: '4K RGB · 510 ảnh · DSM OpenDroneMap · RTK cm',
    status: 'processing',
    statusText: 'Đang trích xuất toạ độ WGS84 từng khung hình SRT',
    actionText: 'Xem tiến độ >',
  },
  {
    id: '4',
    code: '#HH-375',
    flightCode: '#FL-2026-085',
    surveyCode: '#HH-KS-085',
    timestamp: '20/10/2025',
    title: 'Tuyến ĐH.05 - Vĩnh Lộc B (Km02+180)',
    location: 'Bình Chánh, TP.HCM',
    droneDevice: 'Mavic3E-HH-01 (Mavic 3 Enterprise)',
    specs: '4K RGB · 290 ảnh · DSM OpenDroneMap · RTK cm',
    status: 'done',
    statusText: 'Đã lập biên bản báo cáo kỹ thuật TCVN 10380:2014',
    actionText: 'Xem kết quả >',
  },
  {
    id: '5',
    code: '#HH-361',
    flightCode: '#FL-2026-084',
    surveyCode: '#HH-KS-088',
    timestamp: '18/10/2025',
    title: 'Tuyến ĐH.05 - Cầu Bà Lát (Km01+850)',
    location: 'Bình Chánh, TP.HCM',
    droneDevice: 'M350-HH-02 (Matrice 350 RTK)',
    specs: '4K RGB · 460 ảnh · DSM OpenDroneMap · RTK cm',
    status: 'done',
    statusText: 'Đã cập nhật hệ cơ sở dữ liệu GIS tuyến đường',
    actionText: 'Xem kết quả >',
  },
];

export default function DroneLogScreen() {
  const [expandFlightDetails, setExpandFlightDetails] = useState(true);

  const [commands, setCommands] = useState<OperatorCommandRecord[]>([]);
  const [loadingCommands, setLoadingCommands] = useState(true);
  const [busyCommandId, setBusyCommandId] = useState<string | null>(null);
  const [uploadStatusText, setUploadStatusText] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);

  const loadCommands = useCallback(async () => {
    setLoadingCommands(true);
    try {
      const { data } = await listOperatorCommands();
      setCommands(data.items);
    } catch {
      setCommands([]);
    } finally {
      setLoadingCommands(false);
    }
  }, []);

  useEffect(() => {
    void loadCommands();
  }, [loadCommands]);

  const commandErrorMessage = (error: unknown): string => {
    const data = (error as { response?: { data?: unknown } }).response?.data;
    const code = parseProblemDetails(data).code;
    if (code) {
      return messageFor(code);
    }
    const parsed = parseProblemDetails(data);
    return parsed.detail ?? parsed.title ?? 'Không xử lý được lệnh. Vui lòng thử lại.';
  };

  /**
   * O-08 — phát lại lệnh với ĐÚNG Idempotency-Key và payload gốc.
   * Hàm không tạo khoá mới: chỉ truyền commandId, mock tự dùng lại khoá đã lưu.
   */
  const handleReplay = (record: OperatorCommandRecord) => {
    Alert.alert(
      'Phát lại lệnh đã gửi?',
      'Hệ thống gửi lại đúng khóa chống trùng và nội dung gốc. Không tạo lệnh mới, không gửi trùng dữ liệu.',
      [
        { text: 'Để sau', style: 'cancel' },
        {
          text: 'Phát lại',
          onPress: () => {
            void (async () => {
              setBusyCommandId(record.commandId);
              try {
                const { data } = await replayOperatorCommand(record.commandId);
                setToast(data.message);
                await loadCommands();
              } catch (error) {
                setToast(commandErrorMessage(error));
                await loadCommands();
              } finally {
                setBusyCommandId(null);
              }
            })();
          },
        },
      ],
    );
  };

  /** O-08 — 409/412: đọc lại trạng thái nhiệm vụ thật rồi đối chiếu, không tự đoán. */
  const handleReconcile = async (record: OperatorCommandRecord) => {
    setBusyCommandId(record.commandId);
    try {
      const { data } = await reconcileOperatorCommand(record.commandId);
      setToast(data.message);
      await loadCommands();
    } catch (error) {
      setToast(commandErrorMessage(error));
    } finally {
      setBusyCommandId(null);
    }
  };

  /** O-08 — đối chiếu trạng thái tải lên qua API-234 (không tự nhận VERIFIED). */
  const handleCheckUpload = async (record: OperatorCommandRecord) => {
    if (!record.uploadId) {
      return;
    }
    setBusyCommandId(record.commandId);
    try {
      const { data } = await getOperatorUploadSession(record.uploadId);
      setUploadStatusText((prev) => ({
        ...prev,
        [record.commandId]: `Trạng thái tệp trên máy chủ: ${
          UPLOAD_STATUS_LABELS[data.status ?? ''] ?? 'chưa rõ'
        }`,
      }));
    } catch (error) {
      setToast(commandErrorMessage(error));
    } finally {
      setBusyCommandId(null);
    }
  };

  const commandStateLabel = (state: OperatorCommandState): string => {
    switch (state) {
      case 'ACKED':
        return 'Máy chủ đã nhận';
      case 'REJECTED':
        return 'Máy chủ từ chối';
      case 'CONFLICT':
        return 'Xung đột phiên bản';
      case 'PAUSED_RETRY':
        return 'Tạm dừng, chờ thử lại';
      case 'UNKNOWN_OUTCOME':
      default:
        return 'Chưa rõ kết cục';
    }
  };

  const commandStateVariant = (
    state: OperatorCommandState,
  ): 'approved' | 'rejected' | 'severity-high' | 'severity-medium' | 'status-pending' => {
    switch (state) {
      case 'ACKED':
        return 'approved';
      case 'REJECTED':
        return 'rejected';
      case 'CONFLICT':
        return 'severity-high';
      case 'PAUSED_RETRY':
        return 'severity-medium';
      default:
        return 'status-pending';
    }
  };

  const isReplayable = (state: OperatorCommandState, payloadKind: unknown): boolean =>
    (state === 'UNKNOWN_OUTCOME' || state === 'PAUSED_RETRY') && payloadKind === 'decline';

  return (
    <View style={styles.screen}>
      <SafeAreaScreen scroll header={<AppHeader subtitle="Trang chủ" />}>
      {/* Top Segmented Tabs: Yêu cầu mới (3) | Nhật ký */}
      <View style={styles.tabContainer}>
        <Pressable
          style={styles.tabItem}
          onPress={() => router.push('/(drone)/requests')}
          accessibilityRole="button"
        >
          <View style={styles.tabTitleRow}>
            <Text style={styles.tabTitleInactive}>Yêu cầu mới</Text>
            <View style={styles.countBadgeInactive}>
              <Text style={styles.countBadgeTextInactive}>3</Text>
            </View>
          </View>
        </Pressable>

        <Pressable style={[styles.tabItem, styles.tabItemActive]} accessibilityRole="button">
          <Text style={styles.tabTitleActive}>Nhật ký chuyến bay</Text>
          <View style={styles.activeUnderline} />
        </Pressable>
      </View>

      {/* Featured Card: GHI NHẬN NHẬT KÝ CHUYẾN BAY KHẢO SÁT */}
      <Card style={styles.featuredFlightCard}>
        <View style={styles.featuredHeader}>
          <View style={styles.featuredHeaderLeft}>
            <View style={styles.droneIconCircle}>
              <MaterialIcons name="flight-takeoff" size={20} color={colors.primary} />
            </View>
            <View style={styles.featuredHeaderInfo}>
              <View style={styles.codeRow}>
                <Text style={[typography.titleMd, styles.flightCodeText]}>
                  {ACTIVE_FLIGHT_LOG.flightCode}
                </Text>
                <View style={styles.verifiedTag}>
                  <MaterialIcons name="verified" size={12} color={colors.success} />
                  <Text style={styles.verifiedTagText}>ĐÃ XÁC THỰC</Text>
                </View>
              </View>
              <Text style={[typography.caption, styles.surveyCodeSub]}>
                Nhiệm vụ: {ACTIVE_FLIGHT_LOG.surveyCode} · {ACTIVE_FLIGHT_LOG.roadTitle}
              </Text>
            </View>
          </View>

          <Pressable
            style={styles.toggleExpandBtn}
            onPress={() => setExpandFlightDetails(!expandFlightDetails)}
            accessibilityRole="button"
          >
            <MaterialIcons
              name={expandFlightDetails ? 'expand-less' : 'expand-more'}
              size={22}
              color={colors.secondary}
            />
          </Pressable>
        </View>

        {/* Thiết bị & Trạm mặt đất */}
        <View style={styles.equipmentRow}>
          <View style={styles.equipmentItem}>
            <MaterialIcons name="toys" size={16} color={colors.primary} />
            <Text style={[typography.caption, styles.equipmentText]}>
              Drone: <Text style={styles.boldText}>{ACTIVE_FLIGHT_LOG.droneId}</Text> ({ACTIVE_FLIGHT_LOG.droneModel})
            </Text>
          </View>

          <View style={styles.equipmentItem}>
            <MaterialIcons name="cell-tower" size={16} color={colors.primary} />
            <Text style={[typography.caption, styles.equipmentText]}>
              Trạm mặt đất: <Text style={styles.boldText}>{ACTIVE_FLIGHT_LOG.baseStation}</Text>
            </Text>
          </View>
        </View>

        {expandFlightDetails && (
          <>
            {/* Grid 4 thông số chính: Giờ bay, Gió, Pin TB65, Ảnh trực giao */}
            <View style={styles.statsGrid}>
              {/* Stat 1: Thời gian bay */}
              <View style={styles.statBox}>
                <View style={styles.statLabelRow}>
                  <MaterialIcons name="schedule" size={14} color={colors.secondary} />
                  <Text style={[typography.caption, styles.statLabel]}>Thời gian bay</Text>
                </View>
                <Text style={[typography.titleMd, styles.statMainValue]}>
                  {ACTIVE_FLIGHT_LOG.duration}
                </Text>
                <Text style={styles.statSubValue}>
                  {ACTIVE_FLIGHT_LOG.takeoffTime} → {ACTIVE_FLIGHT_LOG.landingTime}
                </Text>
              </View>

              {/* Stat 2: Khí tượng & Vận tốc gió */}
              <View style={styles.statBox}>
                <View style={styles.statLabelRow}>
                  <MaterialIcons name="air" size={14} color={colors.secondary} />
                  <Text style={[typography.caption, styles.statLabel]}>Vận tốc gió</Text>
                </View>
                <Text style={[typography.titleMd, styles.statMainValue]}>
                  {ACTIVE_FLIGHT_LOG.windSpeed}
                </Text>
                <Text style={styles.statSubValue}>{ACTIVE_FLIGHT_LOG.weather}</Text>
              </View>

              {/* Stat 3: Tình trạng Pin TB65 */}
              <View style={styles.statBox}>
                <View style={styles.statLabelRow}>
                  <MaterialIcons name="battery-charging-full" size={14} color={colors.secondary} />
                  <Text style={[typography.caption, styles.statLabel]}>Pin TB65 kép</Text>
                </View>
                <Text style={[typography.titleMd, styles.statMainValue]}>
                  {ACTIVE_FLIGHT_LOG.batteryStart} → {ACTIVE_FLIGHT_LOG.batteryEnd}
                </Text>
                <Text style={styles.statSubValue}>
                  Chu kỳ nạp: {ACTIVE_FLIGHT_LOG.batteryCycles}
                </Text>
              </View>

              {/* Stat 4: Dữ liệu ảnh trực giao & SHA-256 */}
              <View style={styles.statBox}>
                <View style={styles.statLabelRow}>
                  <MaterialIcons name="collections" size={14} color={colors.secondary} />
                  <Text style={[typography.caption, styles.statLabel]}>Ảnh trực giao</Text>
                </View>
                <Text style={[typography.titleMd, styles.statMainValue]}>
                  {ACTIVE_FLIGHT_LOG.orthophotoCount}
                </Text>
                <Text style={styles.statSubValue}>Đã kiểm tra toàn vẹn dữ liệu</Text>
              </View>
            </View>

            {/* Checksum SHA-256 & Mô hình DSM ODM */}
            <View style={styles.flightChecksumBox}>
              <View style={styles.checksumInfoRow}>
                <MaterialIcons name="security" size={16} color={colors.success} />
                <Text style={styles.flightChecksumText}>
                  Kiểm tra toàn vẹn: <Text style={styles.boldText}>Đã khớp</Text>
                </Text>
              </View>
              <View style={styles.checksumInfoRow}>
                <MaterialIcons name="layers" size={16} color={colors.primary} />
                <Text style={styles.flightChecksumText}>
                  Xử lý bề mặt: <Text style={styles.boldText}>{ACTIVE_FLIGHT_LOG.surfaceModel}</Text>
                </Text>
              </View>
            </View>
          </>
        )}
      </Card>

      {/* O-08: Sổ lệnh đã gửi & phục hồi (API-226 / API-234) */}
      <View style={styles.sectionHeader}>
        <Text style={[typography.labelSm, styles.sectionTitle]}>
          SỔ LỆNH ĐÃ GỬI & PHỤC HỒI ({commands.length})
        </Text>
        <Pressable
          onPress={() => void loadCommands()}
          accessibilityRole="button"
          accessibilityLabel="Tải lại sổ lệnh"
        >
          <MaterialIcons name="refresh" size={16} color={colors.secondary} />
        </Pressable>
      </View>
      <Text style={[typography.caption, styles.recoveryHint]}>
        Lệnh gửi đi nhưng chưa rõ kết quả (mất mạng, máy chủ chưa phản hồi) sẽ nằm ở đây. Bấm Phát lại để gửi đúng lệnh cũ — không tạo lệnh trùng.
      </Text>

      {loadingCommands ? (
        <View style={styles.commandLoading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[typography.caption, styles.commandLoadingText]}>Đang đọc sổ lệnh…</Text>
        </View>
      ) : commands.length === 0 ? (
        <Card style={styles.commandCard}>
          <Text style={[typography.bodyMd, styles.commandMessage]}>
            Chưa có lệnh nào được gửi từ thiết bị này.
          </Text>
        </Card>
      ) : (
        commands.map((record) => (
          <Card key={record.commandId} style={styles.commandCard}>
            <View style={styles.commandHeader}>
              <View style={styles.commandTitleGroup}>
                <MaterialIcons name="outbox" size={16} color={colors.primary} />
                <Text style={[typography.labelLg, styles.commandTitle]}>{record.label}</Text>
              </View>
              <Chip
                variant={commandStateVariant(record.state)}
                label={commandStateLabel(record.state)}
                uppercase={false}
              />
            </View>
            {record.taskId ? (
              <Text style={[typography.caption, styles.commandMeta]}>
                Nhiệm vụ: {record.taskCode ?? record.taskId}
              </Text>
            ) : null}
            <Text style={[typography.caption, styles.commandMessage]}>{record.message}</Text>
            {uploadStatusText[record.commandId] ? (
              <Text style={[typography.caption, styles.commandMessage]}>
                {uploadStatusText[record.commandId]}
              </Text>
            ) : null}

            <View style={styles.commandActions}>
              {isReplayable(record.state, record.payload.kind) ? (
                <Button
                  variant="secondary"
                  title="Phát lại (đúng khóa)"
                  loading={busyCommandId === record.commandId}
                  onPress={() => handleReplay(record)}
                />
              ) : null}
              <Button
                variant="text"
                title="Đọc lại & đối chiếu"
                loading={busyCommandId === record.commandId}
                onPress={() => void handleReconcile(record)}
              />
              {record.uploadId ? (
                <Button
                  variant="text"
                  title="Kiểm tra tải lên"
                  onPress={() => void handleCheckUpload(record)}
                />
              ) : null}
            </View>
          </Card>
        ))
      )}

      {/* Section Header: ĐÃ NỘP KHẢO SÁT (5) | Mới nhất */}
      <View style={styles.sectionHeader}>
        <Text style={[typography.labelSm, styles.sectionTitle]}>
          LỊCH SỬ KHẢO SÁT TUYẾN ĐH.05 ({SURVEY_LOGS.length})
        </Text>
        <View style={styles.sortContainer}>
          <MaterialIcons name="swap-vert" size={14} color={colors.secondary} />
          <Text style={[typography.caption, styles.sortText]}>Mới nhất</Text>
        </View>
      </View>

      {/* Survey Log Cards */}
      <View style={styles.logsList}>
        {SURVEY_LOGS.map((log) => {
          const isProcessing = log.status === 'processing';

          return (
            <Pressable
              key={log.id}
              onPress={() =>
                router.push({
                  pathname: '/(drone)/request-detail',
                  params: { code: log.surveyCode ?? '#HH-KS-089' },
                })
              }
              accessibilityRole="button"
            >
              <Card style={[styles.logCard, log.highlight && styles.logCardHighlight]}>
                <View
                  style={[
                    styles.rail,
                    { backgroundColor: isProcessing ? colors.border : colors.success },
                  ]}
                />
                {/* Top Row: Code Badge + Timestamp & Status Tag */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.badgeTimestampGroup}>
                    <View style={styles.codeBadge}>
                      <Text style={styles.codeBadgeText}>{log.code}</Text>
                    </View>
                    <Text style={[typography.caption, styles.timestampText]}>{log.timestamp}</Text>
                  </View>

                  {isProcessing ? (
                    <View style={styles.processingPill}>
                      <View style={styles.blueDot} />
                      <Text style={styles.processingPillText}>ĐANG XỬ LÝ ODM</Text>
                    </View>
                  ) : (
                    <View style={styles.donePill}>
                      <MaterialIcons name="check-circle" size={13} color={colors.success} />
                      <Text style={styles.donePillText}>ĐÃ CÓ KẾT QUẢ</Text>
                    </View>
                  )}
                </View>

                {/* Content Row: Dark Video Thumbnail & Info */}
                <View style={styles.cardContentRow}>
                  <View style={styles.videoThumbnailBox}>
                    <MaterialIcons name="play-arrow" size={20} color={colors.surface} />
                  </View>

                  <View style={styles.infoBox}>
                    <Text style={[typography.titleMd, styles.surveyTitle]} numberOfLines={1}>
                      {log.title}
                    </Text>
                    <View style={styles.locRow}>
                      <MaterialIcons name="location-on" size={13} color={colors.secondary} />
                      <Text style={[typography.caption, styles.locText]} numberOfLines={1}>
                        {log.location}
                      </Text>
                    </View>
                    <Text style={[typography.caption, styles.specsText]} numberOfLines={1}>
                      {log.droneDevice} · {log.specs}
                    </Text>
                  </View>
                </View>

                {/* Bottom Row: Status note & Action link */}
                <View style={styles.cardBottomRow}>
                  <View style={styles.statusNoteGroup}>
                    {isProcessing && (
                      <MaterialIcons name="sync" size={14} color={colors.secondary} />
                    )}
                    <Text
                      style={[
                        typography.caption,
                        styles.statusNoteText,
                        !isProcessing && styles.doneNoteText,
                      ]}
                      numberOfLines={1}
                    >
                      {log.statusText}
                    </Text>
                  </View>

                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      router.push({
                        pathname: isProcessing ? '/(drone)/sync' : '/(drone)/request-detail',
                        params: { code: log.surveyCode ?? '#HH-KS-089' },
                      });
                    }}
                    accessibilityRole="button"
                  >
                    <Text style={[typography.caption, styles.actionLinkText]}>
                      {log.actionText}
                    </Text>
                  </Pressable>
                </View>
              </Card>
            </Pressable>
          );
        })}
      </View>
      </SafeAreaScreen>
      {toast ? <Toast type="info" message={toast} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  recoveryHint: {
    color: colors.secondary,
    marginBottom: spacing.sm,
  },
  commandLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  commandLoadingText: {
    color: colors.secondary,
  },
  commandCard: {
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
  },
  commandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  commandTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
  },
  commandTitle: {
    color: colors.neutral,
    flexShrink: 1,
  },
  commandMeta: {
    color: colors.secondary,
    marginTop: spacing.xs,
  },
  commandMessage: {
    color: colors.neutral,
    marginTop: spacing.sm,
  },
  commandActions: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.sm,
  },
  tabItem: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    position: 'relative',
  },
  tabItemActive: {},
  tabTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tabTitleInactive: {
    ...typography.bodyMd,
    color: colors.secondary,
    fontWeight: '500',
  },
  countBadgeInactive: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  countBadgeTextInactive: {
    fontSize: 10,
    color: colors.secondary,
  },
  tabTitleActive: {
    ...typography.bodyMd,
    color: colors.neutral,
    fontWeight: '700',
  },
  activeUnderline: {
    position: 'absolute',
    bottom: -1,
    left: 20,
    right: 20,
    height: 2.5,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  featuredFlightCard: {
    marginBottom: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.xl,
    ...softShadow,
    gap: spacing.xs,
  },
  featuredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.xs,
  },
  featuredHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  droneIconCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: '#FEF3E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredHeaderInfo: {
    flex: 1,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flightCodeText: {
    color: colors.neutral,
    fontWeight: '700',
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#E9F7EC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  verifiedTagText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.success,
  },
  surveyCodeSub: {
    color: colors.secondary,
    marginTop: 2,
  },
  toggleExpandBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  equipmentRow: {
    gap: 4,
    paddingVertical: 2,
  },
  equipmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  equipmentText: {
    color: colors.secondary,
    flex: 1,
  },
  boldText: {
    fontWeight: 'bold',
    color: colors.neutral,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: 4,
  },
  statBox: {
    width: '48.5%',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: 2,
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    color: colors.secondary,
    fontSize: 11,
  },
  statMainValue: {
    color: colors.neutral,
    fontSize: 16,
  },
  statSubValue: {
    fontSize: 11,
    color: colors.secondary,
  },
  flightChecksumBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xs,
    gap: 4,
    marginTop: 2,
  },
  checksumInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flightChecksumText: {
    fontSize: 11,
    color: colors.secondary,
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    color: colors.secondary,
    fontWeight: '700',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortText: {
    color: colors.secondary,
  },
  logsList: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  logCard: {
    marginBottom: spacing.xs,
    padding: spacing.sm,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: radius.xl,
    ...softShadow,
  },
  rail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: radius.xl,
    borderBottomLeftRadius: radius.xl,
  },
  logCardHighlight: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  badgeTimestampGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  codeBadge: {
    backgroundColor: '#FEF3E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  codeBadgeText: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: 'bold',
  },
  timestampText: {
    color: colors.secondary,
  },
  processingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  blueDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.secondary,
  },
  processingPillText: {
    color: colors.secondary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  donePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E9F7EC',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  donePillText: {
    color: colors.success,
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.xs,
  },
  videoThumbnailBox: {
    width: 60,
    height: 60,
    borderRadius: radius.sm,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBox: {
    flex: 1,
    gap: 2,
  },
  surveyTitle: {
    color: colors.neutral,
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  locText: {
    color: colors.secondary,
    fontSize: 11,
  },
  specsText: {
    color: colors.secondary,
    fontSize: 10,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
    marginTop: spacing.xs,
  },
  statusNoteGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    marginRight: spacing.xs,
  },
  statusNoteText: {
    color: colors.secondary,
    fontSize: 11,
  },
  doneNoteText: {
    color: colors.neutral,
  },
  actionLinkText: {
    color: colors.primaryDark,
    fontWeight: 'bold',
    fontSize: 11,
  },
});

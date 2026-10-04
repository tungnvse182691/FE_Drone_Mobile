import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

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
  surveyCode: '#REQ-KS-089',
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
    surveyCode: '#REQ-KS-089',
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
    surveyCode: '#REQ-KS-088',
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
    surveyCode: '#REQ-KS-087',
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
    surveyCode: '#REQ-KS-085',
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
    surveyCode: '#REQ-KS-088',
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

  return (
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
            <View>
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
                <Text style={styles.statSubValue}>Mã SHA-256 đã khớp</Text>
              </View>
            </View>

            {/* Checksum SHA-256 & Mô hình DSM ODM */}
            <View style={styles.flightChecksumBox}>
              <View style={styles.checksumInfoRow}>
                <MaterialIcons name="security" size={16} color={colors.success} />
                <Text style={styles.flightChecksumText}>
                  Kiểm tra toàn vẹn: <Text style={styles.boldText}>{ACTIVE_FLIGHT_LOG.sha256Checksum}</Text>
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
                  params: { code: log.surveyCode ?? '#REQ-KS-089' },
                })
              }
              accessibilityRole="button"
            >
              <Card style={[styles.logCard, log.highlight && styles.logCardHighlight]}>
                <View
                  style={[
                    styles.rail,
                    { backgroundColor: isProcessing ? colors.info : colors.success },
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
                        params: { code: log.surveyCode ?? '#REQ-KS-089' },
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
  );
}

const styles = StyleSheet.create({
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
    borderWidth: 1,
    borderColor: colors.primary,
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
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: '#FEF9E7',
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: '#F8F9FA',
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
  },
  rail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
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
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  blueDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.info,
  },
  processingPillText: {
    color: colors.info,
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

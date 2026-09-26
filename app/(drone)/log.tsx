import React from 'react';
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
  timestamp: string;
  title: string;
  location: string;
  specs: string;
  status: 'processing' | 'done';
  statusText: string;
  actionText: string;
  highlight?: boolean;
}

const SURVEY_LOGS: SurveyLogItem[] = [
  {
    id: '1',
    code: '#HH-409',
    timestamp: 'Hôm nay, 14:30',
    title: 'Tuyến ĐH.05 - Tân Kiên (Km03+100)',
    location: 'Bình Chánh, TP.HCM',
    specs: 'Video 4K RGB · 184 MB · Flycam Matrice 350 RTK',
    status: 'processing',
    statusText: 'Đang nhận diện hư hỏng mặt đường',
    actionText: 'Xem tiến độ >',
    highlight: true,
  },
  {
    id: '2',
    code: '#HH-398',
    timestamp: 'Hôm qua, 09:15',
    title: 'Tuyến ĐH.05 - Cầu Bà Lát (Km01+850)',
    location: 'Bình Chánh, TP.HCM',
    specs: 'Video 4K RGB · 210 MB · Flycam Mavic 3 Enterprise',
    status: 'done',
    statusText: 'Phát hiện 14 điểm nứt tấm & 3 ổ gà sâu',
    actionText: 'Xem kết quả >',
  },
  {
    id: '3',
    code: '#HH-382',
    timestamp: '22/10/2025',
    title: 'Tuyến ĐH.05 - Vĩnh Lộc B (Km01+200 - Km02+500)',
    location: 'Bình Chánh, TP.HCM',
    specs: 'Video 4K RGB · 320 MB · Flycam Matrice 350 RTK',
    status: 'processing',
    statusText: 'Đang trích xuất toạ độ GPS đoạn tuyến',
    actionText: 'Xem tiến độ >',
  },
  {
    id: '4',
    code: '#HH-375',
    timestamp: '20/10/2025',
    title: 'Tuyến ĐH.05 - Vĩnh Lộc B (Km02+180)',
    location: 'Bình Chánh, TP.HCM',
    specs: 'Video 4K RGB · 165 MB · Flycam Mavic 3 Enterprise',
    status: 'done',
    statusText: 'Đã lập biên bản báo cáo kỹ thuật',
    actionText: 'Xem kết quả >',
  },
  {
    id: '5',
    code: '#HH-361',
    timestamp: '18/10/2025',
    title: 'Tuyến ĐH.05 - Cầu Bà Lát (Km01+850)',
    location: 'Bình Chánh, TP.HCM',
    specs: 'Video 4K RGB · 285 MB · Flycam Matrice 350 RTK',
    status: 'done',
    statusText: 'Đã cập nhật hệ cơ sở dữ liệu GIS',
    actionText: 'Xem kết quả >',
  },
];

export default function DroneLogScreen() {
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
          <Text style={styles.tabTitleActive}>Nhật ký</Text>
          <View style={styles.activeUnderline} />
        </Pressable>
      </View>

      {/* Section Header: ĐÃ NỘP KHẢO SÁT (6) | Mới nhất */}
      <View style={styles.sectionHeader}>
        <Text style={[typography.labelSm, styles.sectionTitle]}>ĐÃ NỘP KHẢO SÁT (6)</Text>
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
                  params: { code: log.code },
                })
              }
              accessibilityRole="button"
            >
              <Card style={[styles.logCard, log.highlight && styles.logCardHighlight]}>
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
                      <Text style={styles.processingPillText}>ĐANG XỬ LÝ</Text>
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
                  {/* Dark video thumbnail with play circle */}
                  <View style={styles.videoThumbnailBox}>
                    <MaterialIcons name="play-arrow" size={20} color={colors.surface} />
                  </View>

                  {/* Info details */}
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
                      {log.specs}
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
                        params: { code: log.code },
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
    marginBottom: spacing.md,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
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
    width: 64,
    height: 64,
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
    fontWeight: '700',
    fontSize: 14,
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

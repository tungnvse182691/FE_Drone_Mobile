import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { Chip } from '../../src/components/Chip';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

type TabKey = 'pending' | 'ongoing' | 'completed';

interface SurveyRequest {
  id: string;
  code: string;
  timeAgo: string;
  title: string;
  location: string;
  note: string;
  status: 'new' | 'ongoing' | 'uploaded';
  statusLabel: string;
  tab: TabKey;
  isCurrentTask?: boolean;
}

const REQUESTS_DATA: SurveyRequest[] = [
  {
    id: '1',
    code: '#REQ-KS-089',
    timeAgo: '30 phút trước',
    title: 'Tuyến ĐH.05 - Tân Kiên Km03+100',
    location: 'Tân Kiên, Bình Chánh, TP.HCM',
    note: 'Ghi chú: Khảo sát xói lở vai đường và sạt lở mép taluy',
    status: 'new',
    statusLabel: 'KHẨN CẤP',
    tab: 'pending',
  },
  {
    id: '2',
    code: '#REQ-KS-090',
    timeAgo: 'Hôm nay, 08:15',
    title: 'Tuyến ĐH.05 - Vĩnh Lộc B (Km01+200 - Km02+500)',
    location: 'Vĩnh Lộc B, Bình Chánh, TP.HCM',
    note: 'Kiểm tra ổ gà sâu & nứt tấm bê tông • 2.4 km',
    status: 'new',
    statusLabel: 'MỚI',
    tab: 'pending',
  },
  {
    id: '3',
    code: '#REQ-KS-087',
    timeAgo: 'Hôm nay, 07:30',
    title: 'Tuyến ĐH.05 - Ngã ba Tân Kiên',
    location: 'Tân Kiên, Bình Chánh, TP.HCM',
    note: 'Drone Matrice 350 sẵn sàng cất cánh',
    status: 'ongoing',
    statusLabel: 'ĐANG THỰC HIỆN',
    tab: 'ongoing',
    isCurrentTask: true,
  },
  {
    id: '4',
    code: '#REQ-KS-088',
    timeAgo: 'Hôm qua, 15:40',
    title: 'Tuyến ĐH.05 - Cầu Bà Lát (Km01+850)',
    location: 'Cầu Bà Lát, Bình Chánh, TP.HCM',
    note: 'Ghi chú: Đoạn vỡ mép tấm và khe co giãn dầm cầu',
    status: 'new',
    statusLabel: 'MỚI',
    tab: 'pending',
  },
  {
    id: '5',
    code: '#REQ-KS-085',
    timeAgo: '20/10/2023',
    title: 'Tuyến ĐH.05 - Vĩnh Lộc B (Km02+180)',
    location: 'Vĩnh Lộc B, Bình Chánh, TP.HCM',
    note: 'Video 4K RGB đã tải lên máy chủ đối soát',
    status: 'uploaded',
    statusLabel: 'ĐÃ GỬI VIDEO',
    tab: 'completed',
  },
];

export default function DroneRequestsScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>('pending');

  const filteredRequests = REQUESTS_DATA.filter((item) => {
    if (activeTab === 'pending') return item.tab === 'pending';
    if (activeTab === 'ongoing') return item.tab === 'ongoing';
    return item.tab === 'completed';
  });

  return (
    <SafeAreaScreen scroll header={<AppHeader subtitle="Trang chủ" />}>
      {/* Top Segmented Tabs: Yêu cầu mới (3) | Nhật ký */}
      <View style={styles.topTabContainer}>
        <Pressable style={[styles.topTabItem, styles.topTabItemActive]} accessibilityRole="button">
          <View style={styles.topTabTitleRow}>
            <Text style={styles.topTabTitleActive}>Yêu cầu mới</Text>
            <View style={styles.countBadgeActive}>
              <Text style={styles.countBadgeTextActive}>3</Text>
            </View>
          </View>
          <View style={styles.activeUnderline} />
        </Pressable>

        <Pressable
          style={styles.topTabItem}
          onPress={() => router.push('/(drone)/log')}
          accessibilityRole="button"
        >
          <Text style={styles.topTabTitleInactive}>Nhật ký</Text>
        </Pressable>
      </View>

      {/* 3 Tabs Filter Row */}
      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tabButton, activeTab === 'pending' && styles.tabButtonActive]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
            Chờ nhận ({REQUESTS_DATA.filter((r) => r.tab === 'pending').length})
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tabButton, activeTab === 'ongoing' && styles.tabButtonActive]}
          onPress={() => setActiveTab('ongoing')}
        >
          <Text style={[styles.tabText, activeTab === 'ongoing' && styles.tabTextActive]}>
            Đang bay ({REQUESTS_DATA.filter((r) => r.tab === 'ongoing').length})
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tabButton, activeTab === 'completed' && styles.tabButtonActive]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>
            Đã xong ({REQUESTS_DATA.filter((r) => r.tab === 'completed').length})
          </Text>
        </Pressable>
      </View>

      {/* Header Info Section */}
      <View style={styles.sectionHeader}>
        <Text style={[typography.labelSm, styles.sectionTitle]}>
          ĐOẠN ĐƯỜNG CẦN KIỂM TRA ({filteredRequests.length})
        </Text>
        <View style={styles.filterChip}>
          <MaterialIcons name="near-me" size={14} color={colors.primary} />
          <Text style={[typography.caption, styles.filterChipText]}>Ưu tiên gần bạn</Text>
        </View>
      </View>

      {/* Requests List */}
      <View style={styles.listContainer}>
        {filteredRequests.map((item) => {
          const isOngoing = item.isCurrentTask;
          return (
            <Pressable
              key={item.id}
              onPress={() =>
                router.push({
                  pathname: '/(drone)/request-detail',
                  params: { code: item.code },
                })
              }
              accessibilityRole="button"
            >
              <Card style={[styles.requestCard, isOngoing && styles.requestCardHighlight]}>
                {isOngoing && (
                  <View style={styles.floatingTaskBadge}>
                    <Text style={styles.floatingBadgeText}>NHIỆM VỤ HIỆN TẠI</Text>
                  </View>
                )}

                <View style={styles.cardHeader}>
                  <View style={styles.metaRow}>
                    <Text style={[typography.caption, styles.codeText]}>{item.code}</Text>
                    <Text style={[typography.caption, styles.timeText]}>• {item.timeAgo}</Text>
                  </View>

                  {item.status === 'new' && <Chip variant="status-pending" label={item.statusLabel} />}
                  {item.status === 'ongoing' && (
                    <Chip variant="severity-medium" label={item.statusLabel} />
                  )}
                  {item.status === 'uploaded' && <Chip variant="approved" label={item.statusLabel} />}
                </View>

                <Text style={[typography.titleMd, styles.roadTitle]}>{item.title}</Text>

                <View style={styles.locationRow}>
                  <MaterialIcons name="location-on" size={16} color={colors.secondary} />
                  <Text style={[typography.bodyMd, styles.locationText]}>{item.location}</Text>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={[typography.caption, styles.noteText]} numberOfLines={1}>
                    {item.note}
                  </Text>
                  <View style={styles.detailArrow}>
                    <Text style={[typography.labelSm, styles.detailLink]}>Chi tiết</Text>
                    <MaterialIcons name="arrow-forward" size={14} color={colors.primary} />
                  </View>
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
  topTabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.md,
  },
  topTabItem: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    position: 'relative',
  },
  topTabItemActive: {},
  topTabTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  topTabTitleActive: {
    ...typography.bodyMd,
    color: colors.neutral,
    fontWeight: '700',
  },
  countBadgeActive: {
    backgroundColor: '#FEF3E2',
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  countBadgeTextActive: {
    fontSize: 10,
    color: colors.primaryDark,
    fontWeight: 'bold',
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
  topTabTitleInactive: {
    ...typography.bodyMd,
    color: colors.secondary,
    fontWeight: '500',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 4,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  tabButtonActive: {
    backgroundColor: colors.surfaceAlt,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    ...typography.labelSm,
    color: colors.secondary,
  },
  tabTextActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    color: colors.secondary,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  filterChipText: {
    color: colors.primary,
    fontWeight: '600',
  },
  listContainer: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  requestCard: {
    marginBottom: spacing.sm,
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.border,
  },
  requestCardHighlight: {
    borderColor: colors.primary,
    borderWidth: 2,
    marginTop: spacing.xs,
  },
  floatingTaskBadge: {
    position: 'absolute',
    top: -10,
    left: spacing.md,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
    zIndex: 10,
  },
  floatingBadgeText: {
    color: colors.onPrimary,
    fontSize: 9,
    fontWeight: 'bold',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  codeText: {
    color: colors.primaryDark,
    fontWeight: 'bold',
    fontFamily: 'Roboto',
  },
  timeText: {
    color: colors.secondary,
  },
  roadTitle: {
    color: colors.neutral,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.sm,
  },
  locationText: {
    color: colors.secondary,
    fontSize: 13,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.surfaceAlt,
    paddingTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  noteText: {
    color: colors.secondary,
    flex: 1,
    marginRight: spacing.sm,
  },
  detailArrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailLink: {
    color: colors.primary,
  },
});

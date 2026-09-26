import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { Chip } from '../../src/components/Chip';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { useAuthStore } from '../../src/store/auth';

interface ApprovalRequest {
  id: string;
  code: string;
  road: string;
  title: string;
  sender: string;
  timeAgo: string;
  method: string;
  deadline: string;
  riskVariant: 'severity-high' | 'severity-medium';
  riskLabel: string;
}

const PENDING_APPROVALS: ApprovalRequest[] = [
  {
    id: '1',
    code: '#DF-0231',
    road: 'Tuyến ĐH.05 - Cầu Bà Lát (Km01+850)',
    title: 'Xử lý ổ gà sâu & nứt tấm bê tông nông thôn',
    sender: 'PM Nguyễn Thùy Lan',
    timeAgo: '10 phút trước',
    method: 'Cắt viền, đục tẩy tạo nhám, đổ bù bê tông xi măng mác 300',
    deadline: 'Trong 3 ngày',
    riskVariant: 'severity-high',
    riskLabel: 'RỦI RO CAO',
  },
  {
    id: '2',
    code: '#DF-0229',
    road: 'Tuyến ĐH.05 - Vĩnh Lộc B (Km02+180)',
    title: 'Vỡ mép tấm & hư hỏng khe co giãn tại đoạn cầu',
    sender: 'PM Trần Văn Nam',
    timeAgo: '1 giờ trước',
    method: 'Đục tẩy tạo nhám, quét dính bám SikaLatex, đổ bù bê tông xi măng mác 300',
    deadline: 'Trong 5 ngày',
    riskVariant: 'severity-medium',
    riskLabel: 'TRUNG BÌNH',
  },
  {
    id: '3',
    code: '#DF-0220',
    road: 'Tuyến ĐH.05 - Tân Kiên (Km03+100)',
    title: 'Xử lý xói lở vai đường & lún nền mặt cầu',
    sender: 'PM Trần Thế Hùng',
    timeAgo: '3 giờ trước',
    method: 'Gia cố mái taluy bằng đá hộc kết hợp quét dính bám Aside',
    deadline: 'Trong 7 ngày',
    riskVariant: 'severity-high',
    riskLabel: 'RỦI RO CAO',
  },
  {
    id: '4',
    code: '#DF-0219',
    road: 'Tuyến ĐH.05 - Vĩnh Lộc B (Km01+200)',
    title: 'Hư hỏng khe co giãn tấm bê tông dọc đoạn tuyến',
    sender: 'PM Lê Minh Tuấn',
    timeAgo: 'Hôm qua',
    method: 'Vệ sinh, quét dính bám Aside, đổ bù bằng vữa bê tông xi măng mác 300',
    deadline: 'Trong 5 ngày',
    riskVariant: 'severity-high',
    riskLabel: 'RỦI RO CAO',
  },
];

export default function SupervisorHomeScreen() {
  const user = useAuthStore((state) => state.user);

  return (
    <SafeAreaScreen scroll header={<AppHeader subtitle="Ban Giám Sát" />}>
      {/* Greeting Header */}
      <View style={styles.greetingRow}>
        <View style={styles.greetingInfo}>
          <Text style={[typography.titleLg, styles.greetingTitle]}>
            Chào, {user?.full_name ?? 'Kỹ sư Trần Thế Hùng'}
          </Text>
          <Text style={[typography.caption, styles.greetingSub]}>
            Giám sát kỹ thuật hiện trường • Mã NV: {user?.employee_code ?? 'NV-8842'}
          </Text>
        </View>

        <Pressable
          style={styles.riskOverviewBtn}
          onPress={() => router.push('/(sup)/risk')}
          accessibilityRole="button"
        >
          <Ionicons name="warning-outline" size={20} color={colors.warning} />
        </Pressable>
      </View>

      {/* 3 KPI Cards */}
      <View style={styles.kpiRow}>
        {/* KPI 1: Rủi ro cao */}
        <Pressable
          style={styles.kpiPressable}
          onPress={() => router.push('/(sup)/risk')}
          accessibilityRole="button"
        >
          <Card style={styles.kpiCard}>
            <View style={styles.kpiTop}>
              <Text style={[typography.caption, styles.kpiLabel]}>Rủi ro cao</Text>
              <Ionicons name="warning" size={14} color={colors.error} />
            </View>
            <Text style={[typography.headlineLg, styles.kpiNumError]}>2</Text>
            <View style={styles.urgentTag}>
              <Text style={styles.urgentTagText}>Cần chú ý</Text>
            </View>
          </Card>
        </Pressable>

        {/* KPI 2: Chờ duyệt */}
        <Pressable
          style={styles.kpiPressable}
          onPress={() => router.push('/(sup)/approve')}
          accessibilityRole="button"
        >
          <Card style={styles.kpiCard}>
            <View style={styles.kpiTop}>
              <Text style={[typography.caption, styles.kpiLabel]}>Chờ duyệt</Text>
              <Ionicons name="time" size={14} color={colors.warning} />
            </View>
            <Text style={[typography.headlineLg, styles.kpiNumWarning]}>5</Text>
            <Text style={[typography.caption, styles.kpiSubNote]}>3 đơn mới</Text>
          </Card>
        </Pressable>

        {/* KPI 3: Đã xong T10 */}
        <Pressable
          style={styles.kpiPressable}
          onPress={() => router.push('/(sup)/reports')}
          accessibilityRole="button"
        >
          <Card style={styles.kpiCard}>
            <View style={styles.kpiTop}>
              <Text style={[typography.caption, styles.kpiLabel]}>Đã xong</Text>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
            </View>
            <Text style={[typography.headlineLg, styles.kpiNumSuccess]}>18</Text>
            <Text style={[typography.caption, styles.kpiSubSuccess]}>+4 so với T9</Text>
          </Card>
        </Pressable>
      </View>

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleWrap}>
          <Text style={[typography.titleMd, styles.sectionTitle]}>Yêu cầu phê duyệt mới</Text>
          <View style={styles.badgeCount}>
            <Text style={styles.badgeCountText}>5</Text>
          </View>
        </View>

        <Pressable onPress={() => router.push('/(sup)/approve')} accessibilityRole="button">
          <Text style={[typography.labelSm, styles.seeAllLink]}>Xem tất cả</Text>
        </Pressable>
      </View>

      {/* Pending Approval List */}
      <View style={styles.approvalList}>
        {PENDING_APPROVALS.map((item) => (
          <Pressable
            key={item.id}
            onPress={() =>
              router.push({
                pathname: '/(sup)/approve',
                params: { code: item.code },
              })
            }
            accessibilityRole="button"
          >
            <Card style={styles.approvalCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.locRow}>
                  <Ionicons name="location-outline" size={14} color={colors.secondary} />
                  <Text style={[typography.caption, styles.roadCode]}>
                    {item.code} • {item.road}
                  </Text>
                </View>
                <Chip variant={item.riskVariant} label={item.riskLabel} />
              </View>

              <Text style={[typography.titleMd, styles.taskTitle]}>{item.title}</Text>

              <View style={styles.metaRow}>
                <View style={styles.senderGroup}>
                  <View style={styles.avatarInitials}>
                    <Text style={styles.avatarText}>PM</Text>
                  </View>
                  <Text style={[typography.caption, styles.senderName]}>{item.sender}</Text>
                </View>
                <Text style={[typography.caption, styles.timeText]}>{item.timeAgo}</Text>
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.footerInfo}>
                  <Text style={[typography.caption, styles.methodLabel]}>Phương án kỹ thuật</Text>
                  <Text style={[typography.caption, styles.methodValue]}>{item.method}</Text>
                  <Text style={[typography.caption, styles.deadlineValue]}>
                    Thời hạn: {item.deadline}
                  </Text>
                </View>

                <View style={styles.viewDetailBtn}>
                  <Text style={[typography.labelSm, styles.viewDetailText]}>Thẩm định →</Text>
                </View>
              </View>
            </Card>
          </Pressable>
        ))}
      </View>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  greetingInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  greetingTitle: {
    color: colors.neutral,
  },
  greetingSub: {
    color: colors.secondary,
    marginTop: 2,
  },
  riskOverviewBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: '#FEF3E2',
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  kpiPressable: {
    flex: 1,
  },
  kpiCard: {
    padding: spacing.sm,
    gap: 2,
  },
  kpiTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kpiLabel: {
    color: colors.secondary,
  },
  kpiNumError: {
    color: colors.error,
  },
  kpiNumWarning: {
    color: colors.brandGold,
  },
  kpiNumSuccess: {
    color: colors.neutral,
  },
  urgentTag: {
    backgroundColor: '#FDECEC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  urgentTagText: {
    color: colors.error,
    fontSize: 9,
    fontWeight: 'bold',
  },
  kpiSubNote: {
    color: colors.secondary,
    fontSize: 10,
    marginTop: 2,
  },
  kpiSubSuccess: {
    color: colors.success,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    color: colors.neutral,
  },
  badgeCount: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    backgroundColor: '#FEF3E2',
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCountText: {
    color: colors.primaryDark,
    fontSize: 10,
    fontWeight: 'bold',
  },
  seeAllLink: {
    color: colors.primary,
  },
  approvalList: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  approvalCard: {
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    marginRight: spacing.xs,
  },
  roadCode: {
    color: colors.secondary,
    flex: 1,
  },
  taskTitle: {
    color: colors.neutral,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  senderGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avatarInitials: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.info,
    fontSize: 9,
    fontWeight: 'bold',
  },
  senderName: {
    color: colors.secondary,
  },
  timeText: {
    color: colors.secondary,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  methodLabel: {
    color: colors.secondary,
    fontSize: 10,
  },
  footerInfo: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  methodValue: {
    color: colors.neutral,
    fontSize: 11,
  },
  deadlineValue: {
    color: colors.secondary,
    fontSize: 10,
  },
  viewDetailBtn: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  viewDetailText: {
    color: colors.brandGold,
    fontWeight: 'bold',
  },
});

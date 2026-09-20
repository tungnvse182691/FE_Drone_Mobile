import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Chip } from '../../src/components/Chip';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

export default function PmHomeScreen() {
  return (
    <SafeAreaScreen scroll header={<AppHeader subtitle="Trang chủ" />}>
      {/* User Greeting Header */}
      <View style={styles.greetingHeader}>
        <View style={styles.greetingRow}>
          <View style={styles.greetingTitleWrap}>
            <Text style={[typography.headlineLg, styles.greetingName]}>Chào, Chị Lan</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>PM QUẢN LÝ</Text>
            </View>
          </View>
          <View style={styles.timeBadge}>
            <Ionicons name="flash" size={12} color={colors.primaryDark} />
            <Text style={styles.timeBadgeText}>09:40</Text>
          </View>
        </View>
        <Text style={[typography.bodyMd, styles.greetingSub]}>
          Hôm nay có 17 mục cần bạn xử lý trên các tuyến đường.
        </Text>
      </View>

      {/* 2 Big Stat Cards */}
      <View style={styles.statRow}>
        <Pressable
          style={({ pressed }) => [styles.statCardWrap, pressed && styles.pressed]}
          onPress={() => router.push('/(pm)/ai-inbox')}
          accessibilityRole="button"
        >
          <Card style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={[typography.labelSm, styles.statLabel]}>Chờ xác minh</Text>
              <Ionicons name="alert-circle-outline" size={20} color={colors.primary} />
            </View>
            <Text style={[typography.headlineLg, styles.statNumber]}>12</Text>
            <View style={styles.statFooterRow}>
              <Ionicons name="alert" size={13} color={colors.error} />
              <Text style={styles.statSubError}>4 mục mức CAO</Text>
            </View>
          </Card>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.statCardWrap, pressed && styles.pressed]}
          onPress={() => router.push('/(pm)/submitted-tab')}
          accessibilityRole="button"
        >
          <Card style={styles.statCard}>
            <View style={styles.statHeader}>
              <Text style={[typography.labelSm, styles.statLabel]}>Chờ Supervisor</Text>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.secondary} />
            </View>
            <Text style={[typography.headlineLg, styles.statNumber]}>5</Text>
            <View style={styles.statFooterRow}>
              <Ionicons name="time-outline" size={13} color={colors.secondary} />
              <Text style={styles.statSubSecondary}>Supervisor đang xét</Text>
            </View>
          </Card>
        </Pressable>
      </View>

      {/* Section 1: Lỗi mới cần xác minh */}
      <View style={styles.sectionWrap}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleGroup}>
            <Text style={[typography.titleMd, styles.sectionTitle]}>Lỗi mới cần xác minh</Text>
            <View style={styles.countBadgeError}>
              <Text style={styles.countBadgeErrorText}>12</Text>
            </View>
          </View>
          <Pressable
            onPress={() => router.push('/(pm)/ai-inbox')}
            style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
          >
            <Text style={styles.linkText}>Xem tất cả</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primaryDark} />
          </Pressable>
        </View>

        {/* Defect Card #DF-0231 */}
        <Card style={styles.defectCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.codeText}>#DF-0231 • TUYẾN ĐH.05</Text>
            <Chip variant="severity-high" label="CAO" />
          </View>
          <Text style={[typography.titleMd, styles.defectTitle]}>Ổ gà sâu vỡ tấm bê tông</Text>
          <View style={styles.metaRow}>
            <Ionicons name="location" size={15} color={colors.error} />
            <Text style={[typography.caption, styles.locationText]}>
              Km02+150 • Tuyến ĐH.05 (Xã Bình Chánh)
            </Text>
          </View>
          <Text style={[typography.caption, styles.detailText]}>
            Sâu 6.8cm • Diện tích 14.5 m² • Độ tin cậy AI 94.2%
          </Text>
          <View style={styles.cardActionRow}>
            <Button
              variant="primary"
              title="Xác minh AI"
              onPress={() => router.push('/(pm)/verify-a')}
            />
          </View>
        </Card>
      </View>

      {/* Section 2: Công việc đang thi công & Nghiệm thu */}
      <View style={styles.sectionWrap}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleGroup}>
            <Text style={[typography.titleMd, styles.sectionTitle]}>
              Đang thi công &amp; Nghiệm thu
            </Text>
            <View style={styles.countBadgeWarning}>
              <Text style={styles.countBadgeWarningText}>3</Text>
            </View>
          </View>
          <Pressable
            onPress={() => router.push('/(pm)/submitted-tab')}
            style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
          >
            <Text style={styles.linkText}>Xem đợt duyệt</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primaryDark} />
          </Pressable>
        </View>

        {/* Work Order Card #WO-118 - Chờ nghiệm thu */}
        <Card style={styles.woCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.codeText}>#WO-118 • TUYẾN ĐH.01</Text>
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>Chờ nghiệm thu</Text>
            </View>
          </View>
          <Text style={[typography.titleMd, styles.defectTitle]}>Bể mép tấm bê tông & hẫng lề</Text>
          <View style={styles.metaRow}>
            <Ionicons name="people-outline" size={15} color={colors.secondary} />
            <Text style={[typography.caption, styles.metaText]}>
              Đội sửa chữa số 2 (Trần Văn Nam) • Km02+150 Tuyến ĐH.01
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="videocam-outline" size={15} color={colors.success} />
            <Text style={[typography.caption, styles.metaSuccessText]}>
              Đã thi công xong: 14:30 • Kèm video flycam
            </Text>
          </View>
          <View style={styles.cardActionRow}>
            <Button
              variant="primary"
              title="Kiểm tra & Nghiệm thu"
              onPress={() => router.push('/(pm)/wo-confirm')}
            />
          </View>
        </Card>

        {/* Card đã duyệt - Chờ giao việc */}
        <Card style={styles.woCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.codeText}>#DF-0228 • TUYẾN ĐH.01</Text>
            <View style={styles.approvedBadge}>
              <Text style={styles.approvedBadgeText}>Đã duyệt đợt</Text>
            </View>
          </View>
          <Text style={[typography.titleMd, styles.defectTitle]}>Nứt gãy tấm bê tông diện rộng</Text>
          <View style={styles.metaRow}>
            <Ionicons name="shield-checkmark" size={15} color={colors.success} />
            <Text style={[typography.caption, styles.metaText]}>
              Supervisor Nguyễn Tuấn đã phê duyệt • Cần giao việc
            </Text>
          </View>
          <View style={styles.cardActionRow}>
            <Button
              variant="secondary"
              title="Giao việc Repair Crew"
              onPress={() => router.push('/(pm)/assign-crew')}
            />
          </View>
        </Card>
      </View>

      {/* Section 3: Lối tắt tác vụ nhanh */}
      <View style={styles.sectionWrap}>
        <Text style={[typography.titleMd, styles.sectionTitle, { marginBottom: spacing.sm }]}>
          Lối tắt tác vụ
        </Text>
        <View style={styles.shortcutGrid}>
          <Pressable
            style={({ pressed }) => [styles.shortcutButton, pressed && styles.pressed]}
            onPress={() => router.push('/(pm)/create-survey')}
            accessibilityRole="button"
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={[typography.labelLg, styles.shortcutButtonText]}>Tạo khảo sát</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.shortcutButton, pressed && styles.pressed]}
            onPress={() => router.push('/(pm)/batching')}
            accessibilityRole="button"
          >
            <Ionicons name="layers-outline" size={20} color={colors.primary} />
            <Text style={[typography.labelLg, styles.shortcutButtonText]}>Gộp đợt sửa</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  greetingHeader: {
    marginBottom: spacing.md,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  greetingTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  greetingName: {
    color: colors.neutral,
    fontWeight: '800',
  },
  roleBadge: {
    backgroundColor: '#F1F3F5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.secondary,
    letterSpacing: 0.5,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3E2',
    borderWidth: 1,
    borderColor: 'rgba(201, 162, 39, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  timeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  greetingSub: {
    color: colors.secondary,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCardWrap: {
    flex: 1,
  },
  statCard: {
    padding: spacing.md,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  statLabel: {
    color: colors.secondary,
    fontWeight: '600',
  },
  statNumber: {
    color: colors.neutral,
    fontWeight: '900',
    fontSize: 30,
    lineHeight: 36,
    marginVertical: 4,
  },
  statFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  statSubError: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.error,
  },
  statSubSecondary: {
    fontSize: 11,
    color: colors.secondary,
  },
  sectionWrap: {
    marginBottom: spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.neutral,
    fontWeight: '700',
  },
  countBadgeError: {
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  countBadgeErrorText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.error,
  },
  countBadgeWarning: {
    backgroundColor: '#FEF3E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  countBadgeWarningText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brandGold,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  linkText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  defectCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  woCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  codeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondary,
    letterSpacing: 0.3,
  },
  defectTitle: {
    color: colors.neutral,
    marginBottom: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  locationText: {
    color: colors.secondary,
    flex: 1,
  },
  detailText: {
    color: colors.secondary,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  metaText: {
    color: colors.secondary,
    flex: 1,
  },
  metaSuccessText: {
    color: colors.success,
    fontWeight: '600',
    flex: 1,
  },
  cardActionRow: {
    marginTop: spacing.sm,
  },
  pendingBadge: {
    backgroundColor: '#FEF3E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  pendingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brandGold,
  },
  approvedBadge: {
    backgroundColor: '#EBFBEE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  approvedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.success,
  },
  shortcutGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  shortcutButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 12,
  },
  shortcutButtonText: {
    color: colors.neutral,
  },
  pressed: {
    opacity: 0.7,
  },
});
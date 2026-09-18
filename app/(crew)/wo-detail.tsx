import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Chip } from '../../src/components/Chip';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

export default function CrewWoDetailScreen() {
  return (
    <SafeAreaScreen
      scroll
      header={
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Pressable onPress={() => router.back()} accessibilityRole="button" style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
              <Ionicons name="arrow-back" size={20} color={colors.neutral} />
            </Pressable>
            <Text style={[typography.titleMd, styles.topBarTitle]}>Chi Tiết Công Việc #Wo 118</Text>
          </View>
          <Pressable accessibilityRole="button" style={({ pressed }) => [styles.moreButton, pressed && styles.pressed]}>
            <Ionicons name="ellipsis-vertical" size={20} color={colors.secondary} />
          </Pressable>
        </View>
      }
    >
      <View style={styles.hero}>
        <View style={styles.heroRoad}>
          <View style={styles.pothole}>
            <View style={styles.potholeInner} />
            <View style={styles.depthBadge}>
              <Text style={[typography.caption, styles.depthBadgeText]}>Độ sâu: ~7.2cm</Text>
            </View>
          </View>
        </View>

        <View style={styles.cone}>
          <View style={styles.coneBand} />
        </View>

        <View style={styles.heroOverlay}>
          <View style={styles.badgeDark}>
            <Ionicons name="airplane-outline" size={13} color={colors.onPrimary} />
            <Text style={[typography.caption, styles.badgeDarkText]}>Ảnh chụp Drone</Text>
          </View>
          <View style={styles.badgeRed}>
            <Text style={[typography.caption, styles.badgeRedText]}>#DEF-04 • 1.2M X 0.8M</Text>
          </View>
          <View style={styles.badgeDark}>
            <Text style={[typography.caption, styles.badgeDarkText]}>Độ GSD: 1.1cm/px</Text>
          </View>
        </View>

        <Pressable accessibilityRole="button" style={({ pressed }) => [styles.magnify, pressed && styles.pressed]}>
          <Ionicons name="search" size={16} color={colors.neutral} />
        </Pressable>
      </View>

      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Chip variant="severity-high" label="Nghiêm trọng" />
          <View style={styles.priorityRow}>
            <View style={styles.priorityDot} />
            <Text style={[typography.caption, styles.priorityText]}>Ưu tiên xử lý trong 4h</Text>
          </View>
        </View>
        <Text style={[typography.titleMd, styles.defectTitle]}>Trám vá ổ gà sâu 7cm — Km1842+150 QL1A</Text>
        <Text style={[typography.caption, styles.defectLocation]}>Xã Hố Nai 3, Huyện Trảng Bom, Tỉnh Đồng Nai</Text>
        <View style={styles.detailBox}>
          <View style={styles.detailRow}>
            <Ionicons name="pricetag-outline" size={16} color={colors.brandGold} />
            <Text style={[typography.bodyMd, styles.detailText]}>
              Phân loại hư hại: <Text style={styles.strong}>Ổ gà & rạn nứt kết cấu mặt đường cấp 3</Text>
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailBottomRow}>
            <View style={styles.detailItem}>
              <Ionicons name="navigate" size={13} color={colors.brandGold} />
              <Text style={[typography.caption, styles.detailMuted]}>10.9574° B, 106.9128° Đ</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="checkmark-circle-outline" size={13} color={colors.success} />
              <Text style={[typography.caption, styles.detailSuccess]}>RTK ±2cm • Cách bạn 450m</Text>
            </View>
          </View>
        </View>
      </Card>

      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="git-branch-outline" size={16} color={colors.brandGold} />
            <Text style={[typography.titleMd, styles.cardTitleText]}>Vị trí & Tiếp cận mặt bằng</Text>
          </View>
          <Text style={[typography.caption, styles.cardHeaderHint]}>Làn xe cơ giới hướng Bắc</Text>
        </View>
        <View style={styles.roadMap}>
          <View style={styles.riverBand} />
          <View style={styles.roadDiagonal} />
          <View style={styles.roadHorizontal} />
          <View style={styles.destPin}>
            <View style={styles.destPinDot} />
          </View>
          <View style={styles.destBadge}>
            <Text style={[typography.caption, styles.destBadgeText]}>Km1842+150</Text>
          </View>
          <View style={styles.currentPin}>
            <View style={styles.currentPinDot} />
          </View>
          <View style={styles.currentBadge}>
            <Text style={[typography.caption, styles.currentBadgeText]}>Vị trí hiện tại</Text>
          </View>
        </View>
      </Card>

      <Card style={styles.card}>
        <View style={styles.engineerRow}>
          <View style={styles.engineerIcon}>
            <Ionicons name="construct" size={20} color={colors.brandGold} />
          </View>
          <View style={styles.engineerInfo}>
            <Text style={[typography.titleMd, styles.engineerTitle]}>Chỉ dẫn thi công hiện trường</Text>
            <Text style={[typography.caption, styles.engineerMeta]}>KS. Nguyễn Văn Hùng • Ban Duy tu QL1A</Text>
          </View>
        </View>
        <View style={styles.instructionBox}>
          <Text style={[typography.bodyMd, styles.instructionText]}>
            Cần dọn sạch đất cát trong lòng hố trước khi tưới nhựa dính bám. Sử dụng khoảng{' '}
            <Text style={styles.strong}>1.2 tấn</Text> bê tông nhựa nguội, đầm cóc kỹ tối thiểu{' '}
            <Text style={styles.strong}>4 lượt</Text> xung quanh mép nối.
          </Text>
          <View style={styles.safetyBox}>
            <Ionicons name="warning-outline" size={15} color={colors.warning} />
            <Text style={[typography.caption, styles.safetyText]}>
              <Text style={styles.strongGold}>An toàn:</Text> Đặt biển cảnh báo công trường và chóp nón giao thông cách 50m hướng đi TP. Biên Hòa.
            </Text>
          </View>
        </View>
        <View style={styles.suppliesRow}>
          <View style={styles.supplyItem}>
            <Ionicons name="car-outline" size={14} color={colors.brandGold} />
            <Text style={[typography.caption, styles.supplyText]}>Vật tư: Bê tông nhựa C12.5</Text>
          </View>
          <View style={styles.supplyItem}>
            <Ionicons name="build" size={14} color={colors.brandGold} />
            <Text style={[typography.caption, styles.supplyText]}>Thiết bị: Đầm cóc & chổi cước</Text>
          </View>
        </View>
      </Card>

      <View style={styles.ctaRow}>
        <View style={styles.ctaItem}>
          <Button variant="secondary" title="Chỉ đường" onPress={() => router.push('/(crew)/navigation')} />
        </View>
        <View style={styles.ctaItem}>
          <Button variant="primary" title="Bắt đầu" onPress={() => router.push('/(crew)/progress')} />
        </View>
      </View>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreButton: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: colors.surfaceAlt,
  },
  topBarTitle: {
    color: colors.neutral,
  },
  hero: {
    height: 224,
    borderRadius: radius.lg,
    backgroundColor: colors.neutral,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  heroRoad: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 140,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pothole: {
    width: 128,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 2,
    borderColor: colors.error,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  potholeInner: {
    width: 80,
    height: 30,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  depthBadge: {
    position: 'absolute',
    bottom: -10,
    right: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  depthBadgeText: {
    color: colors.onPrimary,
  },
  cone: {
    position: 'absolute',
    top: 56,
    left: 104,
    width: 18,
    height: 36,
    backgroundColor: colors.warning,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderBottomLeftRadius: radius.sm,
    borderBottomRightRadius: radius.sm,
    justifyContent: 'center',
  },
  coneBand: {
    height: 8,
    backgroundColor: colors.surface,
    opacity: 0.9,
  },
  heroOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeDark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.md,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  badgeDarkText: {
    color: colors.onPrimary,
  },
  badgeRed: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.md,
    backgroundColor: colors.error,
  },
  badgeRedText: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
  magnify: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardTitleText: {
    color: colors.neutral,
  },
  cardHeaderHint: {
    color: colors.secondary,
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.error,
  },
  priorityText: {
    color: colors.error,
  },
  defectTitle: {
    color: colors.neutral,
    marginTop: spacing.sm,
  },
  defectLocation: {
    color: colors.secondary,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  detailBox: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  detailText: {
    flex: 1,
    color: colors.neutral,
  },
  strong: {
    fontFamily: 'Roboto-Medium',
  },
  strongGold: {
    fontFamily: 'Roboto-Medium',
    color: colors.brandGold,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  detailBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailMuted: {
    color: colors.secondary,
  },
  detailSuccess: {
    color: colors.success,
  },
  roadMap: {
    height: 144,
    borderRadius: radius.md,
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  riverBand: {
    position: 'absolute',
    top: 32,
    left: 12,
    right: 12,
    height: 12,
    borderRadius: radius.full,
    backgroundColor: 'rgba(59,130,246,0.35)',
    transform: [{ rotate: '-10deg' }],
  },
  roadDiagonal: {
    position: 'absolute',
    top: 52,
    left: 36,
    width: 260,
    height: 7,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    transform: [{ rotate: '-38deg' }],
  },
  roadHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 88,
    height: 6,
    backgroundColor: colors.border,
  },
  destPin: {
    position: 'absolute',
    top: 18,
    right: 26,
    alignItems: 'center',
  },
  destPinDot: {
    width: 12,
    height: 12,
    borderRadius: radius.full,
    backgroundColor: colors.error,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  destBadge: {
    position: 'absolute',
    top: 34,
    right: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  destBadgeText: {
    color: colors.neutral,
    fontWeight: '700',
  },
  currentPin: {
    position: 'absolute',
    bottom: 22,
    left: 26,
  },
  currentPinDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.info,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  currentBadge: {
    position: 'absolute',
    bottom: 18,
    left: 44,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  currentBadgeText: {
    color: colors.secondary,
  },
  engineerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  engineerIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: 'rgba(245,158,11,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  engineerInfo: {
    flex: 1,
  },
  engineerTitle: {
    color: colors.neutral,
  },
  engineerMeta: {
    color: colors.secondary,
  },
  instructionBox: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  instructionText: {
    color: colors.neutral,
  },
  safetyBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  safetyText: {
    flex: 1,
    color: colors.brandGold,
  },
  suppliesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  supplyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  supplyText: {
    color: colors.secondary,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  ctaItem: {
    flex: 1,
  },
});
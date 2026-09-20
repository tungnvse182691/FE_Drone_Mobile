import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Toast } from '../../src/components/Toast';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

const CHECKLIST = [
  { label: 'Cập nhật trạng thái', detail: 'Chuyển sang "Đã hoàn thành sửa chữa"', done: true },
  { label: 'Ảnh trước', detail: '1 ảnh toàn cảnh + GPS Watermark', done: true },
  { label: 'Ảnh sau', detail: '2 ảnh nghiệm thu bề mặt tấm BTXM hoàn thiện', done: true },
];

export default function CrewCompleteScreen() {
  const [toast, setToast] = useState<string | null>(null);

  const handleSubmit = () => {
    setToast('Đã nộp hồ sơ hoàn thành #WO-118 cho PM');
    setTimeout(() => router.push('/(crew)/sync'), 1500);
  };

  return (
    <SafeAreaScreen
      scroll
      header={
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Pressable onPress={() => router.back()} accessibilityRole="button" style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
              <Ionicons name="arrow-back" size={20} color={colors.neutral} />
            </Pressable>
            <Text style={[typography.titleMd, styles.topBarTitle]}>Hoàn tất công việc #WO-118</Text>
          </View>
        </View>
      }
    >
      <Card style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <View>
            <Text style={[typography.labelSm, styles.summaryLabel]}>MÃ CÔNG VIỆC</Text>
            <Text style={[typography.titleLg, styles.summaryCode]}>#WO-118</Text>
          </View>
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={[typography.labelSm, styles.statusPillText]}>Đã xử lý tại hiện trường</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={[typography.bodyMd, styles.infoLabel]}>Hạng mục:</Text>
          <Text style={[typography.bodyMd, styles.infoValue]}>Trám vá ổ gà vỡ tấm BTXM</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[typography.bodyMd, styles.infoLabel]}>Vị trí:</Text>
          <Text style={[typography.bodyMd, styles.infoValue]}>Km02+150, Tuyến ĐH.05</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[typography.bodyMd, styles.infoLabel]}>Đội thi công:</Text>
          <Text style={[typography.bodyMd, styles.infoValue]}>Tổ Sửa chữa 02</Text>
        </View>
      </Card>

      <Card style={styles.checklistCard}>
        <View style={styles.checklistHeader}>
          <Text style={[typography.labelSm, styles.checklistTitle]}>HẠNG MỤC NGHIỆM THU BÀN GIAO (3/3)</Text>
          <View style={styles.pctBadge}>
            <Text style={[typography.labelSm, styles.pctText]}>100%</Text>
          </View>
        </View>
        <View style={styles.checklistDivider} />
        {CHECKLIST.map((item, i) => (
          <View key={i} style={styles.checkItem}>
            <View style={styles.checkIcon}>
              <Ionicons name="checkmark" size={16} color={colors.success} />
            </View>
            <View style={styles.checkContent}>
              <Text style={[typography.labelSm, styles.checkLabel]}>{item.label}</Text>
              <Text style={[typography.caption, styles.checkDetail]}>{item.detail}</Text>
            </View>
            <Text style={[typography.labelSm, styles.checkStatus]}>
              {item.label === 'Cập nhật trạng thái' ? 'Hoàn thành' : 'Đã chụp'}
            </Text>
          </View>
        ))}
      </Card>

      <View style={styles.imagePair}>
        <View style={styles.imageCol}>
          <Text style={[typography.labelSm, styles.imageLabel]}>ẢNH TRƯỚC</Text>
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image-outline" size={28} color={colors.secondary} />
            <Text style={[typography.caption, styles.imagePlaceholderText]}>Ổ gà sâu 7.2cm</Text>
          </View>
        </View>
        <View style={styles.imageCol}>
          <Text style={[typography.labelSm, styles.imageLabel]}>ẢNH SAU</Text>
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image-outline" size={28} color={colors.success} />
            <Text style={[typography.caption, styles.imagePlaceholderText]}>Bề mặt tấm BTXM phẳng</Text>
          </View>
        </View>
      </View>

      <Card style={styles.statsCard}>
        <Text style={[typography.labelSm, styles.statsTitle]}>KHỐI LƯỢNG THI CÔNG THỰC TẾ</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <Text style={[typography.titleLg, styles.statValue]}>14.5 m²</Text>
            <Text style={[typography.caption, styles.statLabel]}>Diện tích sửa chữa</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={[typography.titleLg, styles.statValueGold]}>1.25 tấn</Text>
            <Text style={[typography.caption, styles.statLabel]}>Tiêu hao vật liệu</Text>
          </View>
        </View>
      </Card>

      <Card style={styles.readyCard}>
        <View style={styles.readyRow}>
          <View style={styles.readyIcon}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          </View>
          <Text style={[typography.labelSm, styles.readyText]}>Sẵn sàng gửi cho PM xác nhận</Text>
        </View>
      </Card>

      <Text style={[typography.caption, styles.notice]}>
        * Sau khi gửi, hồ sơ công việc sẽ được khóa chỉnh sửa tại hiện trường và chuyển sang hàng đợi duyệt của Quản lý Dự án (PM).
      </Text>

      <View style={styles.ctaWrap}>
        <Button variant="primary" title="Gửi cho PM" onPress={handleSubmit} />
      </View>

      {toast ? <Toast type="success" message={toast} /> : null}
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
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
    flex: 1,
  },
  backBtn: {
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
  summaryCard: {
    marginBottom: spacing.md,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
  },
  summaryLabel: {
    color: colors.secondary,
  },
  summaryCode: {
    color: colors.neutral,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: '#EBFBEE',
    borderWidth: 1,
    borderColor: '#B2F2BB',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.success,
  },
  statusPillText: {
    color: colors.success,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  infoLabel: {
    color: colors.secondary,
  },
  infoValue: {
    color: colors.neutral,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: spacing.sm,
  },
  checklistCard: {
    marginBottom: spacing.md,
  },
  checklistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checklistTitle: {
    color: colors.neutral,
  },
  pctBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: '#EBFBEE',
  },
  pctText: {
    color: colors.success,
  },
  checklistDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  checkIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: '#EBFBEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkContent: {
    flex: 1,
  },
  checkLabel: {
    color: colors.neutral,
  },
  checkDetail: {
    color: colors.secondary,
    marginTop: 2,
  },
  checkStatus: {
    color: colors.success,
  },
  imagePair: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  imageCol: {
    flex: 1,
  },
  imageLabel: {
    color: colors.secondary,
    marginBottom: spacing.xs,
  },
  imagePlaceholder: {
    height: 100,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  imagePlaceholderText: {
    color: colors.secondary,
  },
  statsCard: {
    marginBottom: spacing.md,
  },
  statsTitle: {
    color: colors.secondary,
    marginBottom: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: colors.neutral,
  },
  statValueGold: {
    color: colors.primary,
  },
  statLabel: {
    color: colors.secondary,
    marginTop: spacing.xs,
  },
  readyCard: {
    marginBottom: spacing.md,
    backgroundColor: '#EBFBEE',
    borderWidth: 1,
    borderColor: '#B2F2BB',
  },
  readyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  readyIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyText: {
    color: colors.success,
  },
  notice: {
    color: colors.secondary,
    fontStyle: 'italic',
    marginBottom: spacing.lg,
  },
  ctaWrap: {
    paddingBottom: spacing.xl,
  },
});

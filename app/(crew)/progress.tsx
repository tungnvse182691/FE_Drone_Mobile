import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

const CONSTRUCTION_STEPS = [
  'Đặt biển cảnh báo & chóp nón an toàn cách 50m.',
  'Đục tẩy bê tông hư hỏng, vệ sinh lòng hố sâu 7cm.',
  'Quét hồ dầu liên kết xi măng & đổ bê tông M300 đá 1x2.',
  'Lu lèn phẳng mặt và thu dọn hiện trường.',
];

const QUICK_TAGS = ['+ Đã đủ vật liệu', '+ Thời tiết mưa lớn', '+ Kẹt xe tuyến ngoài'];

export default function CrewProgressScreen() {
  const [checked, setChecked] = useState<boolean[]>([true, true, true, false]);
  const [note, setNote] = useState('Đã hoàn tất đầm dùi và đổ 0.8 m³ bê tông xi măng M300, làm phẳng bề mặt tấm theo cốt cao độ chuẩn, che phủ bảo dưỡng ẩm.');

  const doneCount = checked.filter(Boolean).length;
  const progress = Math.round((doneCount / CONSTRUCTION_STEPS.length) * 100);

  const toggleStep = (index: number) => {
    setChecked((prev) => prev.map((value, i) => (i === index ? !value : value)));
  };

  return (
    <SafeAreaScreen
      scroll
      header={
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Pressable onPress={() => router.back()} accessibilityRole="button" style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
              <Ionicons name="arrow-back" size={20} color={colors.neutral} />
            </Pressable>
            <View>
              <Text style={[typography.titleMd, styles.topBarTitle]}>Cập nhật tiến độ</Text>
              <Text style={[typography.caption, styles.topBarSub]}>Lệnh sửa chữa #WO-118</Text>
            </View>
          </View>
        </View>
      }
    >
      <Card style={styles.card}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryLeft}>
            <View style={styles.woTag}>
              <Text style={[typography.labelSm, styles.woTagText]}>#WO-118</Text>
            </View>
            <Text style={[typography.caption, styles.summaryRoad]}>Km02+150 Tuyến ĐH.05</Text>
          </View>
          <View style={styles.summaryIcon}>
            <Ionicons name="build" size={18} color={colors.brandGold} />
          </View>
        </View>
        <Text style={[typography.titleMd, styles.summaryTitle]}>Đổ bù ổ gà vỡ tấm sâu 7cm — Xã Bình Chánh</Text>
      </Card>

      <Card style={styles.card}>
        <View style={styles.progressHeader}>
          <Text style={[typography.labelLg, styles.sectionLabel]}>TIẾN ĐỘ THI CÔNG</Text>
          <Text style={[typography.titleLg, styles.progressValue]}>{progress}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={[typography.caption, styles.progressMeta]}>Đã hoàn thành {doneCount}/{CONSTRUCTION_STEPS.length} bước</Text>
        <View style={styles.stepList}>
          {CONSTRUCTION_STEPS.map((step, index) => {
            const isChecked = checked[index];
            return (
              <Pressable key={step} onPress={() => toggleStep(index)} accessibilityRole="checkbox" accessibilityState={{ checked: isChecked }} style={({ pressed }) => [styles.stepRow, pressed && styles.pressed]}>
                <Ionicons
                  name={isChecked ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={isChecked ? colors.success : colors.secondary}
                />
                <Text style={[typography.bodyMd, styles.stepLabel, isChecked && styles.stepLabelDone]}>{step}</Text>
                <Text style={[typography.labelLg, { color: isChecked ? colors.success : colors.secondary }]}>
                  {isChecked ? '100%' : '0%'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card style={styles.card}>
        <View style={styles.statusHeader}>
          <Text style={[typography.labelLg, styles.sectionLabel]}>
            TRẠNG THÁI XỬ LÝ <Text style={styles.requiredMark}>*</Text>
          </Text>
          <View style={styles.needsCapture}>
            <Text style={[typography.labelSm, styles.needsCaptureText]}>Cần chụp nghiệm thu</Text>
          </View>
        </View>
        <View style={styles.segmentRow}>
          <View style={styles.segment}>
            <Ionicons name="time-outline" size={18} color={colors.secondary} />
            <Text style={[typography.caption, styles.segmentText]}>Đang thực hiện</Text>
          </View>
          <View style={styles.segment}>
            <Ionicons name="warning-outline" size={18} color={colors.secondary} />
            <Text style={[typography.caption, styles.segmentText]}>Bị chặn</Text>
          </View>
          <View style={styles.segmentActive}>
            <Ionicons name="checkmark" size={18} color={colors.onPrimary} />
            <Text style={[typography.caption, styles.segmentActiveText]}>Hoàn thành</Text>
          </View>
        </View>
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color={colors.warning} />
          <Text style={[typography.caption, styles.infoBoxText]}>
            Khi chọn "Hoàn thành", hệ thống sẽ tự động chuyển sang bước Chụp bằng chứng trước/sau để kỹ sư nghiệm thu.
          </Text>
        </View>
      </Card>

      <Card style={styles.card}>
        <View style={styles.noteHeader}>
          <Text style={[typography.labelLg, styles.sectionLabel]}>GHI CHÚ HIỆN TRƯỜNG</Text>
          <Text style={[typography.caption, styles.noteOptional]}>Tùy chọn</Text>
        </View>
        <TextInput
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={3}
          style={styles.noteInput}
          textAlignVertical="top"
          placeholder="Nhập ghi chú hiện trường..."
        />
        <View style={styles.tagRow}>
          {QUICK_TAGS.map((tag) => (
            <Pressable
              key={tag}
              style={styles.tagPill}
              onPress={() => setNote((prev) => (prev ? `${prev} ${tag}` : tag))}
            >
              <Text style={[typography.caption, styles.tagPillText]}>{tag}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.footerRow}>
          <View style={styles.footerLeft}>
            <Ionicons name="locate-outline" size={14} color={colors.success} />
            <Text style={[typography.caption, styles.footerCoord]}>10.9621° N, 106.9423° E (Sai số &lt;3m)</Text>
          </View>
          <Text style={[typography.caption, styles.footerTime]}>09:41 • 24/10/2024</Text>
        </View>
      </Card>

      <Button variant="primary" title="Lưu cập nhật & Chụp bằng chứng" onPress={() => router.push('/(crew)/viewfinder')} />
      <Text style={[typography.caption, styles.nextHint]}>Hành động tiếp theo: Mở màn hình Chụp ảnh hiện trường nghiệm thu</Text>
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
  pressed: {
    backgroundColor: colors.surfaceAlt,
  },
  topBarTitle: {
    color: colors.neutral,
  },
  topBarSub: {
    color: colors.secondary,
    marginTop: 2,
  },
  card: {
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  woTag: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  woTagText: {
    color: colors.brandGold,
  },
  summaryRoad: {
    color: colors.secondary,
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    color: colors.neutral,
    marginTop: spacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    color: colors.secondary,
    letterSpacing: 0.4,
  },
  progressValue: {
    color: colors.success,
  },
  progressTrack: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.success,
  },
  progressMeta: {
    color: colors.secondary,
    marginTop: spacing.xs,
  },
  stepList: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
  },
  stepLabel: {
    flex: 1,
    color: colors.neutral,
  },
  stepLabelDone: {
    color: colors.secondary,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  requiredMark: {
    color: colors.error,
  },
  needsCapture: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  needsCaptureText: {
    color: colors.brandGold,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  segment: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  segmentActive: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  segmentText: {
    color: colors.secondary,
  },
  segmentActiveText: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  infoBoxText: {
    flex: 1,
    color: colors.secondary,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  noteOptional: {
    color: colors.secondary,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    color: colors.neutral,
    minHeight: 72,
    marginTop: spacing.sm,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  tagPill: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  tagPillText: {
    color: colors.secondary,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.md,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
  },
  footerCoord: {
    color: colors.success,
    flexShrink: 1,
  },
  footerTime: {
    color: colors.secondary,
    marginLeft: spacing.sm,
  },
  nextHint: {
    color: colors.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { AlertButton } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Chip } from '../../src/components/Chip';
import { InputField } from '../../src/components/InputField';
import { Toast } from '../../src/components/Toast';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

const CONFIDENCE = '94.2%';

type ToastMessage = {
  type: 'success' | 'warning' | 'error';
  message: string;
};

export default function PmVerifyAScreen() {
  const [depth, setDepth] = useState('6.8');
  const [area, setArea] = useState('14.5');
  const [classification, setClassification] = useState('Ổ gà mặt nhựa lún');
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const CLASSIFICATIONS = ['Ổ gà mặt nhựa lún', 'Rạn nứt mai rùa', 'Hằn lún vệt bánh xe', 'Hư hỏng khe co giãn'];

  const pickClassification = () => {
    const options: AlertButton[] = CLASSIFICATIONS.map((c) => ({ text: c, onPress: () => setClassification(c) }));
    options.push({ text: 'Bỏ qua', style: 'cancel' as const });
    Alert.alert('Phân loại lỗi', undefined, options);
  };

  const handleAdjust = () => {
    const parsedDepth = Number(depth.trim());
    const parsedArea = Number(area.trim());
    if (!Number.isFinite(parsedDepth) || parsedDepth <= 0 || !Number.isFinite(parsedArea) || parsedArea <= 0) {
      setToast({ type: 'warning', message: '⚠️ Vui lòng nhập Độ sâu (cm) và Diện tích (m²) hợp lệ!' });
      return;
    }
    setToast({ type: 'success', message: `✅ Đã hiệu chỉnh kích thước: sâu ${depth}cm - diện tích ${area} m².` });
  };

  const handleFalsePositive = () => {
    Alert.alert('Báo AI sai (False Positive)', 'Xác nhận đây là phát hiện AI sai? Lỗi sẽ được đưa ra khỏi danh sách chờ duyệt.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xác nhận báo sai',
        style: 'destructive',
        onPress: () => {
          setToast({ type: 'warning', message: '⚠️ Đã ghi nhận lỗi AI sai. Chuyển về luồng huấn luyện lại mô hình.' });
          setTimeout(() => router.push('/(pm)/ai-inbox'), 1200);
        },
      },
    ]);
  };

  const handleConfirm = () => {
    setToast({ type: 'success', message: '✅ Đã xác minh lỗi #DF-0231. Có thể nhập đợt sửa chữa.' });
    setTimeout(() => router.push('/(pm)/ai-inbox'), 1200);
  };

  return (
    <View style={styles.screen}>
      <SafeAreaScreen scroll header={<AppHeader subtitle="Hộp Thư AI" />}>
        <View style={styles.titleRow}>
          <View style={styles.titleBlock}>
            <Text style={[typography.titleLg, styles.defectId]}>#DF-0231</Text>
            <Text style={[typography.caption, styles.defectMeta]}>QL.1A Km1842+150</Text>
          </View>
          <Chip variant="severity-high" label="RỦI RO CAO" />
        </View>

        <Card style={styles.imageCard}>
          <View style={styles.imageBox}>
            <View style={styles.bbox} />
            <Ionicons name="camera" size={28} color={colors.secondary} />
            <Text style={[typography.caption, styles.imageHint]}>Ảnh flycam độ phân giải cao</Text>
          </View>
          <View style={styles.imageBadge}>
            <View style={styles.imageDot} />
            <Text style={[typography.labelSm, styles.imageBadgeText]}>Độ tin cậy AI {CONFIDENCE}</Text>
          </View>
        </Card>

        <Card style={styles.formCard}>
          <Text style={[typography.titleMd, styles.cardTitle]}>Hiệu chỉnh thông tin lỗi</Text>
          <InputField
            label="Độ sâu đo được (cm)"
            value={depth}
            onChangeText={setDepth}
            placeholder="Ví dụ: 6.8"
          />
          <InputField
            label="Diện tích (m²)"
            value={area}
            onChangeText={setArea}
            placeholder="Ví dụ: 14.5"
          />
          <Pressable onPress={pickClassification} style={styles.selectGroup} accessibilityRole="button">
            <Text style={[typography.labelLg, styles.fieldLabel]}>Phân loại lỗi</Text>
            <View style={styles.selectBox}>
              <Text style={[typography.bodyLg, styles.selectValue]} numberOfLines={1}>
                {classification}
              </Text>
              <Ionicons name="chevron-down" size={18} color={colors.secondary} />
            </View>
          </Pressable>
        </Card>

        <View style={styles.buttonGroup}>
          <View style={styles.buttonWrap}>
            <Button variant="secondary" title="Hiệu chỉnh kích thước" onPress={handleAdjust} />
          </View>
          <View style={styles.buttonWrap}>
            <Button variant="secondary" title="Báo AI sai (False Positive)" onPress={handleFalsePositive} />
          </View>
          <Button variant="primary" title="Xác nhận lỗi AI" onPress={handleConfirm} />
        </View>
      </SafeAreaScreen>

      {toast ? <Toast type={toast.type} message={toast.message} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  titleBlock: {
    flex: 1,
    marginRight: spacing.sm,
  },
  defectId: {
    color: colors.neutral,
  },
  defectMeta: {
    color: colors.secondary,
    marginTop: spacing.xs,
  },
  imageCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  imageBox: {
    height: 180,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  bbox: {
    position: 'absolute',
    left: 48,
    top: 40,
    width: 120,
    height: 90,
    borderWidth: 2,
    borderColor: colors.error,
    backgroundColor: 'rgba(229, 72, 77, 0.08)',
    borderRadius: radius.sm,
  },
  imageHint: {
    color: colors.secondary,
    marginTop: 44,
  },
  imageBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.success,
  },
  imageBadgeText: {
    color: colors.success,
  },
  formCard: {
    marginBottom: spacing.lg,
  },
  cardTitle: {
    color: colors.neutral,
    marginBottom: spacing.md,
  },
  selectGroup: {
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    color: colors.secondary,
    marginBottom: spacing.sm,
  },
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },
  selectValue: {
    color: colors.onSurface,
    flex: 1,
  },
  buttonGroup: {
    marginBottom: spacing.md,
  },
  buttonWrap: {
    marginBottom: spacing.sm,
  },
});
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { InputField } from '../../src/components/InputField';
import { Toast } from '../../src/components/Toast';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

type ToastMessage = {
  type: 'success' | 'warning' | 'error';
  message: string;
};

export default function PmResubmitScreen() {
  const [explanation, setExplanation] = useState(
    'Đã cập nhật hệ số hao hụt 5% và bổ sung 2 nhân công cắm chốt điều tiết phân luồng xe tải.',
  );
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const handleSubmit = () => {
    setToast({ type: 'success', message: '✅ Đã nộp lại hồ sơ chỉnh sửa cho Giám sát!' });
    setTimeout(() => router.push('/(pm)/submitted-tab'), 1200);
  };

  return (
    <SafeAreaScreen scroll>
      <View style={styles.headerBar}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          style={({ pressed }) => [styles.backBtn, pressed && styles.backPressed]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.secondary} />
        </Pressable>
        <Text style={[typography.titleMd, styles.headerTitle]}>Chỉnh sửa & Trình duyệt lại</Text>
        <View style={styles.reviseBadge}>
          <Text style={[typography.labelSm, styles.reviseBadgeText]}>Yêu cầu sửa</Text>
        </View>
      </View>

      <Card style={styles.commentCard}>
        <View style={styles.commentTitleRow}>
          <Ionicons name="chatbox-ellipses-outline" size={16} color={colors.warning} />
          <Text style={[typography.labelLg, styles.commentTitle]}>
            Ý kiến của Giám sát trưởng Nguyễn Thanh Sơn:
          </Text>
        </View>
        <Text style={[typography.bodyMd, styles.commentBody]}>
          "Giảm hệ số hao hụt bê tông nhựa từ 8% xuống 5% theo định mức mới và bổ sung thêm 2 người
          điều tiết giao thông giờ cao điểm."
        </Text>
      </Card>

      <Card style={styles.formCard}>
        <Text style={[typography.labelLg, styles.fieldLabel]}>Dự toán sau điều chỉnh (VNĐ)</Text>
        <View style={styles.costBox}>
          <Text style={[typography.bodyLg, styles.costValue]}>
            17.650.000 đ (Đã giảm 850.000 đ)
          </Text>
        </View>
        <InputField
          label="Ý kiến giải trình của PM"
          value={explanation}
          onChangeText={setExplanation}
        />
      </Card>

      <View style={styles.ctaWrap}>
        <Button variant="primary" title="Lưu & Trình duyệt lại hồ sơ" onPress={handleSubmit} />
      </View>

      {toast ? <Toast type={toast.type} message={toast.message} /> : null}
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPressed: {
    opacity: 0.7,
  },
  headerTitle: {
    color: colors.neutral,
    flex: 1,
    fontSize: 14,
  },
  reviseBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.error,
  },
  reviseBadgeText: {
    color: colors.surface,
  },
  commentCard: {
    backgroundColor: '#FFFBEB',
    borderColor: colors.warning,
    marginBottom: spacing.md,
  },
  commentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  commentTitle: {
    color: '#92400E',
  },
  commentBody: {
    color: '#78350F',
    lineHeight: 18,
  },
  formCard: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    color: colors.secondary,
    marginBottom: spacing.sm,
  },
  costBox: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  costValue: {
    color: colors.success,
    fontFamily: 'monospace',
  },
  ctaWrap: {
    marginBottom: spacing.sm,
  },
});
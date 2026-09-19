import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { colors, spacing, typography } from '../../src/design-tokens';

export default function SupApproveScreen() {
  return (
    <SafeAreaScreen header={<AppHeader subtitle="Ban Giám Sát" />}>
      <Card style={styles.card}>
        <Text style={[typography.titleMd, styles.title]}>M-SUP-02: Thẩm định & Phê duyệt #REQ-045</Text>
        <Text style={[typography.bodyMd, styles.desc]}>
          Màn hình giữ chỗ (Placeholder) — Đang chờ Hoàng (Person 2) triển khai.
        </Text>
        <Text style={[typography.caption, styles.detail]}>
          Thẩm định chi tiết hồ sơ đợt sửa, xem ảnh đo đạc thực tế, chấp thuận hoặc từ chối có lý do.
        </Text>
      </Card>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    marginVertical: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    color: colors.primary,
    textAlign: 'center',
  },
  desc: {
    color: colors.neutral,
    textAlign: 'center',
    fontWeight: '500',
  },
  detail: {
    color: colors.secondary,
    textAlign: 'center',
  },
});

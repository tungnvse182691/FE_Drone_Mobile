import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { colors, spacing, typography } from '../../src/design-tokens';

export default function DroneRequestdetailScreen() {
  return (
    <SafeAreaScreen header={<AppHeader subtitle="Phi công Drone" />}>
      <Card style={styles.card}>
        <Text style={[typography.titleMd, styles.title]}>M-DRONE-03: Chi tiết yêu cầu khảo sát</Text>
        <Text style={[typography.bodyMd, styles.desc]}>
          Màn hình giữ chỗ (Placeholder) — Đang chờ Hoàng (Person 2) triển khai.
        </Text>
        <Text style={[typography.caption, styles.detail]}>
          Thông tin chi tiết tuyến đường, thông số bay và chuẩn bị cất cánh.
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

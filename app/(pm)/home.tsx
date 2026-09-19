import React, { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface PmMetric {
  label: string;
  value: string;
  sub?: string;
  icon: IconName;
}

interface PmShortcut {
  label: string;
  icon: IconName;
  route: string;
}

const PM_METRICS: PmMetric[] = [
  {
    label: 'Dự án đang quản lý',
    value: '3',
    sub: 'QL.1A • ĐT.741 • Vành Đai 3',
    icon: 'briefcase-outline',
  },
  {
    label: 'Lỗi AI mới cần duyệt',
    value: '18',
    icon: 'alert-circle-outline',
  },
  {
    label: 'Lệnh bay đang xử lý',
    value: '4',
    icon: 'airplane-outline',
  },
];

const PM_SHORTCUTS: PmShortcut[] = [
  { label: 'Tạo khảo sát mới', icon: 'add-circle-outline', route: '/(pm)/create-survey' },
  { label: 'Hộp thư AI', icon: 'mail-unread-outline', route: '/(pm)/ai-inbox' },
  { label: 'Gộp đợt sửa', icon: 'git-merge-outline', route: '/(pm)/batching' },
];

export default function PmHomeScreen() {
  return (
    <SafeAreaScreen scroll header={<AppHeader subtitle="Quản Lý Dự Án" />}>
      <Text style={[typography.titleLg, styles.greeting]}>Chào, Nguyễn Thùy Lan</Text>
      <Text style={[typography.caption, styles.greetingMeta]}>
        Quản lý dự án • Mã NV: PM-0428
      </Text>

      <View style={styles.metricRow}>
        {PM_METRICS.map((metric) => (
          <Card key={metric.label} style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={[typography.labelSm, styles.metricLabel]}>{metric.label}</Text>
              <View style={styles.metricIcon}>
                <Ionicons name={metric.icon} size={16} color={colors.secondary} />
              </View>
            </View>
            <Text style={[typography.headlineLg, styles.metricValue]}>{metric.value}</Text>
            {metric.sub ? (
              <Text style={[typography.caption, styles.metricSub]} numberOfLines={1}>
                {metric.sub}
              </Text>
            ) : null}
          </Card>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[typography.titleMd, styles.sectionTitle]}>Lối tắt nhanh</Text>
      </View>

      {PM_SHORTCUTS.map((shortcut) => (
        <Pressable
          key={shortcut.label}
          onPress={() => router.push(shortcut.route)}
          accessibilityRole="button"
        >
          <Card style={styles.shortcutCard}>
            <View style={styles.shortcutInner}>
              <View style={styles.shortcutIcon}>
                <Ionicons name={shortcut.icon} size={20} color={colors.primary} />
              </View>
              <Text style={[typography.bodyMd, styles.shortcutLabel]}>{shortcut.label}</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.secondary} />
            </View>
          </Card>
        </Pressable>
      ))}
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  greeting: {
    color: colors.neutral,
  },
  greetingMeta: {
    color: colors.secondary,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  metricRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  metricCard: {
    flex: 1,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricLabel: {
    color: colors.secondary,
    flexShrink: 1,
  },
  metricIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    marginLeft: spacing.xs,
  },
  metricValue: {
    color: colors.primary,
  },
  metricSub: {
    color: colors.secondary,
    marginTop: spacing.xs,
  },
  sectionHeader: {
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.neutral,
  },
  shortcutCard: {
    marginBottom: spacing.sm,
  },
  shortcutInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  shortcutIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  shortcutLabel: {
    color: colors.neutral,
    flex: 1,
  },
});
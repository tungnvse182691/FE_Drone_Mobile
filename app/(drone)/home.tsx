import React, { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { Chip } from '../../src/components/Chip';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { useAuthStore } from '../../src/store/auth';

type IconName = ComponentProps<typeof Ionicons>['name'];
type ChipVariant = ComponentProps<typeof Chip>['variant'];

interface TodayTask {
  code: string;
  title: string;
  desc: string;
  chip: ChipVariant;
  chipLabel: string;
  icon: IconName;
  iconColor: string;
}

const TODAY_TASKS: TodayTask[] = [
  {
    code: 'Mã: KS-741',
    title: 'Đoạn ĐT.741 - Cầu Sông Bé',
    desc: 'Khảo sát sạt lở mép taluy âm • Cần LiDAR',
    chip: 'severity-high',
    chipLabel: 'Khẩn cấp',
    icon: 'warning-outline',
    iconColor: colors.error,
  },
  {
    code: 'Mã: KS-104',
    title: 'Đoạn QL1A - Km 104+200',
    desc: 'Kiểm tra lún nứt mặt đường • 2.4 km',
    chip: 'status-pending',
    chipLabel: 'Chờ khảo sát',
    icon: 'git-branch-outline',
    iconColor: colors.warning,
  },
  {
    code: 'Mã: KS-VD3',
    title: 'Đường Vành Đai 3 - Gói XL-02',
    desc: 'Ảnh trực quan 3D tiến độ thi công hạ tầng',
    chip: 'status-pending',
    chipLabel: 'Chờ khảo sát',
    icon: 'layers-outline',
    iconColor: colors.warning,
  },
];

export default function HomeScreen() {
  const user = useAuthStore((state) => state.user);
  const roleLabel = user ? user.role_code.replace(/_/g, ' ') : '';

  return (
    <SafeAreaScreen scroll header={<AppHeader subtitle="Trang chủ Pilot" />}>
      <View style={styles.greetingRow}>
        <Text style={[typography.titleLg, styles.greeting]}>Chào, {user?.full_name}</Text>
        <View style={styles.readyBadge}>
          <View style={styles.readyDot} />
          <Text style={[typography.labelSm, styles.readyText]}>Sẵn sàng bay</Text>
        </View>
      </View>
      <Text style={[typography.caption, styles.greetingMeta]}>{roleLabel}</Text>

      <Card style={styles.kpiCard}>
        <View style={styles.kpiLeft}>
          <Text style={[typography.labelSm, styles.kpiLabel]}>NHIỆM VỤ HÔM NAY</Text>
          <View style={styles.kpiValueRow}>
            <Text style={[typography.headlineLg, styles.kpiNumber]}>3</Text>
            <Text style={[typography.bodyMd, styles.kpiUnit]}>yêu cầu khảo sát mới</Text>
          </View>
        </View>
        <View style={styles.kpiIcon}>
          <Ionicons name="airplane-outline" size={26} color={colors.primary} />
        </View>
      </Card>

      <View style={styles.telemetryRow}>
        <Card style={styles.telemetryCard}>
          <View style={styles.telemetryIcon}>
            <Ionicons name="cloud-outline" size={18} color={colors.secondary} />
          </View>
          <View style={styles.telemetryText}>
            <Text style={[typography.labelSm, styles.telemetryLabel]}>Gió thực tế</Text>
            <Text style={[typography.labelSm, styles.telemetryValue]}>8.4 km/h • An toàn</Text>
          </View>
        </Card>
        <Card style={styles.telemetryCard}>
          <View style={styles.telemetryIcon}>
            <Ionicons name="battery-charging-outline" size={18} color={colors.secondary} />
          </View>
          <View style={styles.telemetryText}>
            <Text style={[typography.labelSm, styles.telemetryLabel]}>Pin Matrice 350</Text>
            <Text style={[typography.labelSm, styles.telemetryValue]}>4 cụm • 98%</Text>
          </View>
        </Card>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[typography.titleMd, styles.sectionTitle]}>Việc cần làm</Text>
        <Text style={[typography.labelSm, styles.sectionHint]}>Ưu tiên theo tuyến</Text>
      </View>

      {TODAY_TASKS.map((task) => (
        <Pressable
          key={task.code}
          onPress={() => router.push('/(drone)/request-detail')}
          accessibilityRole="button"
        >
          <Card style={styles.taskCard}>
            <View style={styles.taskInner}>
              <View style={styles.taskIcon}>
                <Ionicons name={task.icon} size={20} color={task.iconColor} />
              </View>
              <View style={styles.taskContent}>
                <View style={styles.taskMetaRow}>
                  <Chip variant={task.chip} label={task.chipLabel} />
                  <Text style={[typography.labelSm, styles.taskCode]}>{task.code}</Text>
                </View>
                <Text style={[typography.titleMd, styles.taskTitle]}>{task.title}</Text>
                <Text style={[typography.caption, styles.taskDesc]}>{task.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.secondary} />
            </View>
          </Card>
        </Pressable>
      ))}
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greeting: {
    color: colors.neutral,
    flexShrink: 1,
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
  },
  readyDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.success,
  },
  readyText: {
    color: colors.secondary,
  },
  greetingMeta: {
    color: colors.secondary,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  kpiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kpiLeft: {
    flexShrink: 1,
  },
  kpiLabel: {
    color: colors.secondary,
  },
  kpiValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  kpiNumber: {
    color: colors.primary,
  },
  kpiUnit: {
    color: colors.neutral,
  },
  kpiIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  telemetryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  telemetryCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  telemetryIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  telemetryText: {
    flex: 1,
  },
  telemetryLabel: {
    color: colors.secondary,
  },
  telemetryValue: {
    color: colors.neutral,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.neutral,
  },
  sectionHint: {
    color: colors.secondary,
  },
  taskCard: {
    marginBottom: spacing.sm,
  },
  taskInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  taskIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  taskContent: {
    flex: 1,
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  taskCode: {
    color: colors.secondary,
  },
  taskTitle: {
    color: colors.neutral,
    marginTop: spacing.xs,
  },
  taskDesc: {
    color: colors.secondary,
    marginTop: 2,
  },
});

import React, { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { Chip } from '../../src/components/Chip';
import { FAB } from '../../src/components/FAB';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { useAuthStore } from '../../src/store/auth';
import { CREW_TASKS } from './tasks';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface CrewMetric {
  label: string;
  value: string;
  icon: IconName;
  valueColor: string;
}

const CREW_METRICS: CrewMetric[] = [
  {
    label: 'Việc đang làm',
    value: '4',
    icon: 'build-outline',
    valueColor: colors.primary,
  },
  {
    label: 'Hoàn thành',
    value: '12',
    icon: 'checkmark-circle-outline',
    valueColor: colors.success,
  },
];

export default function CrewHomeScreen() {
  const user = useAuthStore((state) => state.user);
  return (
    <View style={styles.screen}>
      <SafeAreaScreen scroll header={<AppHeader subtitle="Đội Sửa Chữa" />}>
        <Text style={[typography.titleLg, styles.greeting]}>Chào, {user?.full_name ?? 'Nguyễn Văn Tuấn'}</Text>
        <Text style={[typography.caption, styles.greetingMeta]}>Kỹ thuật viên • Đội 01 • Mã NV: {user?.employee_code ?? 'HH-RC-084'}</Text>

        <Card style={styles.teamCard}>
          <Text style={[typography.labelSm, styles.teamName]}>ĐỘI 01</Text>
          <Text style={[typography.bodyMd, styles.teamRow]}>Đội trưởng: Trần Văn Vượng</Text>
          <Text style={[typography.bodyMd, styles.teamRow]}>
            Kỹ thuật viên: {user?.full_name ?? 'Le Van Crew'} • {user?.employee_code ?? 'NV003'}
          </Text>
        </Card>

        <View style={styles.metricRow}>
          {CREW_METRICS.map((metric) => (
            <Card key={metric.label} style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Text style={[typography.labelSm, styles.metricLabel]}>{metric.label}</Text>
                <View style={styles.metricIcon}>
                  <Ionicons name={metric.icon} size={16} color={colors.secondary} />
                </View>
              </View>
              <Text style={[typography.headlineLg, { color: metric.valueColor }]}>{metric.value}</Text>
            </Card>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[typography.titleMd, styles.sectionTitle]}>Danh sách việc</Text>
          <Pressable onPress={() => router.push('/(crew)/tasks')} accessibilityRole="button">
            <Text style={[typography.labelSm, styles.seeAll]}>Xem tất cả</Text>
          </Pressable>
        </View>

        {CREW_TASKS.map((task) => (
          <Pressable key={task.code ?? task.title} onPress={() => router.push('/(crew)/wo-detail')} accessibilityRole="button">
            <Card style={styles.taskCard}>
              <View style={styles.taskInner}>
                <View style={styles.taskContent}>
                  <View style={styles.taskMetaRow}>
                    <Chip variant={task.chip} label={task.chipLabel} />
                    {task.code ? (
                      <Text style={[typography.labelSm, styles.taskCode]}>{task.code}</Text>
                    ) : null}
                  </View>
                  <Text style={[typography.titleMd, styles.taskTitle]}>{task.title}</Text>
                  <View style={styles.taskDistRow}>
                    <Ionicons name="navigate-outline" size={14} color={colors.secondary} />
                    <Text style={[typography.caption, styles.taskDist]}>{task.distance}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.secondary} />
              </View>
            </Card>
          </Pressable>
        ))}
      </SafeAreaScreen>

      <FAB icon="camera-outline" onPress={() => router.push('/(crew)/viewfinder')} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  greeting: {
    color: colors.neutral,
  },
  greetingMeta: {
    color: colors.secondary,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  teamCard: {
    marginBottom: spacing.md,
  },
  teamName: {
    color: colors.primaryDark,
  },
  teamRow: {
    color: colors.neutral,
    marginTop: spacing.xs,
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
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.neutral,
  },
  seeAll: {
    color: colors.primary,
  },
  taskCard: {
    marginBottom: spacing.sm,
  },
  taskInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
  taskDistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  taskDist: {
    color: colors.secondary,
  },
});
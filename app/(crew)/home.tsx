import React, { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { Chip } from '../../src/components/Chip';
import { FAB } from '../../src/components/FAB';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { useAuthStore } from '../../src/store/auth';
import { CREW_TASKS, TASK_MODE_CHIP } from './tasks';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

interface CrewMetric {
  label: string;
  value: string;
  icon: IconName;
  valueColor: string;
  iconColor: string;
  iconBg: string;
}

const CREW_METRICS: CrewMetric[] = [
  {
    label: 'Việc đang làm',
    value: '4',
    icon: 'build',
    valueColor: colors.primaryDark,
    iconColor: '#6B5219',
    iconBg: '#FEF9E7',
  },
  {
    label: 'Hoàn thành',
    value: '12',
    icon: 'check-circle',
    valueColor: colors.success,
    iconColor: '#2F9E44',
    iconBg: '#E9F7EC',
  },
];

export default function CrewHomeScreen() {
  const user = useAuthStore((state) => state.user);
  const displayName = user?.full_name ? user.full_name.replace(/\s*\([^)]*\)/g, '').trim() : 'Nguyễn Văn Tuấn';
  const employeeCode = user?.employee_code ?? 'HH-RC-084';

  return (
    <View style={styles.screen}>
      <SafeAreaScreen scroll header={<AppHeader subtitle="Đội Sửa Chữa" />}>
        {/* Header greeting & mã NV nổi bật rõ ràng ngoài nắng */}
        <View style={styles.greetingSection}>
          <Text style={[typography.titleLg, styles.greeting]}>Chào, {displayName}</Text>
          <View style={styles.metaRow}>
            <MaterialIcons name="badge" size={15} color={colors.secondary} />
            <Text style={[typography.caption, styles.greetingMeta]}>
              Kỹ thuật viên • Đội 01 • Mã NV:{' '}
              <Text style={styles.empCode}>{employeeCode}</Text>
            </Text>
          </View>
        </View>

        {/* teamCard ĐỘI 01 có viền trái vàng 4px */}
        <Card style={styles.teamCard}>
          <View style={styles.teamHeaderRow}>
            <MaterialIcons name="groups" size={18} color={colors.brandGold} />
            <Text style={[typography.labelSm, styles.teamName]}>ĐỘI 01</Text>
          </View>
          <Text style={[typography.bodyMd, styles.teamRow]}>
            Đội trưởng: <Text style={styles.strongText}>Trần Văn Vượng</Text>
          </Text>
          <Text style={[typography.bodyMd, styles.teamRow]}>
            Kỹ thuật viên: <Text style={styles.strongText}>{user?.full_name ?? 'Lê Văn Tuấn'}</Text> • Mã NV:{' '}
            <Text style={styles.strongText}>{employeeCode}</Text>
          </Text>
        </Card>

        {/* metricRow 2 card Việc đang làm 4 / Hoàn thành 12 có số 24px + icon nền #FEF9E7 / #E9F7EC */}
        <View style={styles.metricRow}>
          {CREW_METRICS.map((metric) => (
            <Card key={metric.label} style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Text style={[typography.caption, styles.metricLabel]}>{metric.label}</Text>
                <View style={[styles.metricIcon, { backgroundColor: metric.iconBg }]}>
                  <MaterialIcons name={metric.icon} size={16} color={metric.iconColor} />
                </View>
              </View>
              <Text style={[typography.headlineLg, styles.metricValue, { color: metric.valueColor }]}>
                {metric.value}
              </Text>
            </Card>
          ))}
        </View>

        {/* Danh sách công việc */}
        <View style={styles.sectionHeader}>
          <Text style={[typography.titleMd, styles.sectionTitle]}>Danh sách việc</Text>
          <Pressable onPress={() => router.push('/(crew)/tasks')} accessibilityRole="button">
            <Text style={[typography.labelSm, styles.seeAll]}>Xem tất cả</Text>
          </Pressable>
        </View>

        {CREW_TASKS.map((task) => {
          const modeChip = TASK_MODE_CHIP[task.task_mode];
          return (
            <Pressable
              key={task.id}
              onPress={() => router.push({ pathname: '/(crew)/wo-detail', params: { id: task.id } })}
              accessibilityRole="button"
            >
              <Card style={styles.taskCard}>
                <View style={styles.taskInner}>
                  <View style={styles.taskContent}>
                    <View style={styles.taskMetaRow}>
                      <Chip variant={modeChip.variant} label={modeChip.label} uppercase={false} />
                      <Text style={[typography.labelSm, styles.taskCode]}>{task.wo_code}</Text>
                    </View>
                    <Text style={[typography.titleMd, styles.taskTitle]}>{task.title}</Text>
                    <View style={styles.taskDistRow}>
                      <MaterialIcons name="near-me" size={14} color={colors.secondary} />
                      <Text style={[typography.caption, styles.taskDist]}>
                        {task.route_code} • {task.section_name} • {task.chainage}
                      </Text>
                    </View>
                  </View>
                  <MaterialIcons name="chevron-right" size={24} color={colors.secondary} />
                </View>
              </Card>
            </Pressable>
          );
        })}
      </SafeAreaScreen>

      {/* FAB photo-camera ở bottom 96 tránh đè bottom nav */}
      <FAB icon="photo-camera" onPress={() => router.push('/(crew)/viewfinder')} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
  },
  greetingSection: {
    marginBottom: spacing.md,
  },
  greeting: {
    color: colors.neutral,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  greetingMeta: {
    color: colors.secondary,
  },
  empCode: {
    color: colors.neutral,
    fontFamily: 'Roboto-Medium',
  },
  teamCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.cardPadding,
    marginBottom: spacing.md,
  },
  teamHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  teamName: {
    color: colors.brandGold,
  },
  teamRow: {
    color: colors.secondary,
    marginTop: 2,
  },
  strongText: {
    color: colors.neutral,
    fontFamily: 'Roboto-Medium',
  },
  metricRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.cardPadding,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
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
  },
  metricValue: {
    marginTop: 2,
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
    color: colors.brandGold,
  },
  taskCard: {
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.cardPadding,
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
    justifyContent: 'space-between',
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
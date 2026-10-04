import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { Chip } from '../../src/components/Chip';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { useAuthStore } from '../../src/store/auth';

interface DroneTask {
  code: string;
  displayCode: string;
  title: string;
  subtitle: string;
  priority: 'urgent' | 'pending';
  chipVariant: 'severity-high' | 'severity-medium' | 'severity-low';
  chipLabel: string;
  iconName: keyof typeof MaterialIcons.glyphMap;
  iconBg: string;
  iconColor: string;
}

export const INITIAL_DRONE_TASKS: DroneTask[] = [
  {
    code: '#REQ-KS-089',
    displayCode: 'Mã: KS-741',
    title: 'Tuyến ĐH.05 - Tân Kiên (Km03+100)',
    subtitle: 'Xói lở vai đường mép taluy âm • Cần ảnh 4K RGB & DSM (ODM)',
    priority: 'urgent',
    chipVariant: 'severity-high',
    chipLabel: 'KHẨN CẤP',
    iconName: 'warning',
    iconBg: '#FDECEC',
    iconColor: colors.error,
  },
  {
    code: '#REQ-KS-090',
    displayCode: 'Mã: KS-104',
    title: 'Tuyến ĐH.05 - Vĩnh Lộc B (Km01+200 - Km02+500)',
    subtitle: 'Kiểm tra ổ gà sâu & nứt tấm bê tông • 2.4 km',
    priority: 'pending',
    chipVariant: 'severity-medium',
    chipLabel: 'CHỜ KHẢO SÁT',
    iconName: 'explore',
    iconBg: '#FEF3E2',
    iconColor: colors.warning,
  },
  {
    code: '#REQ-KS-088',
    displayCode: 'Mã: KS-VD3',
    title: 'Tuyến ĐH.05 - Cầu Bà Lát (Km01+850)',
    subtitle: 'Ảnh trực quan 3D tiến độ thi công hạ tầng',
    priority: 'pending',
    chipVariant: 'severity-low',
    chipLabel: 'CHỜ KHẢO SÁT',
    iconName: 'alt-route',
    iconBg: '#FEF3E2',
    iconColor: colors.warning,
  },
];

export default function DroneHomeScreen() {
  const user = useAuthStore((state) => state.user);
  const tasks = INITIAL_DRONE_TASKS;

  return (
    <SafeAreaScreen scroll header={<AppHeader subtitle="Trang chủ" />}>

      {/* Greeting Header */}
      <View style={styles.greetingHeader}>
        <View style={styles.greetingTextGroup}>
          <Text style={[typography.headlineLg, styles.greetingName]}>
            Chào, {user?.full_name ? user.full_name.replace(/\s*\([^)]*\)/g, '').trim() : 'Nguyễn Văn An'}
          </Text>
          <Text style={[typography.caption, styles.greetingMeta]}>
            Kỹ thuật viên Drone • Đội Khảo sát Số 2
          </Text>
        </View>
        <View style={styles.readyBadge}>
          <View style={styles.readyDot} />
          <Text style={[typography.labelSm, styles.readyText]}>Sẵn sàng bay</Text>
        </View>
      </View>

      {/* Minimal Unified KPI & Telemetry Strip */}
      <Card style={styles.metricStripCard}>
        <View style={styles.metricMainRow}>
          <View style={styles.metricIconWrap}>
            <MaterialIcons name="flight-takeoff" size={24} color={colors.primary} />
          </View>
          <View style={styles.metricContent}>
            <Text style={[typography.headlineLg, styles.metricNumber]}>{tasks.length}</Text>
            <Text style={[typography.caption, styles.metricDesc]}>yêu cầu khảo sát hôm nay</Text>
          </View>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.telemetryStripRow}>
          <View style={styles.telemetryTag}>
            <MaterialIcons name="cloud-queue" size={15} color={colors.secondary} />
            <Text style={[typography.caption, styles.telemetryTagText]}>Gió 8.4 km/h • An toàn</Text>
          </View>
          <View style={styles.telemetryTag}>
            <MaterialIcons name="battery-charging-full" size={15} color={colors.success} />
            <Text style={[typography.caption, styles.telemetryTagText]}>Pin M350-HH-02: 98% (4 cụm)</Text>
          </View>
        </View>
      </Card>

      {/* Quick Access Actions */}
      <View style={styles.quickAccessRow}>
        <Pressable
          style={styles.quickButton}
          onPress={() =>
            router.push({
              pathname: '/(drone)/upload',
              params: { code: '#REQ-KS-089' },
            })
          }
          accessibilityRole="button"
        >
          <MaterialIcons name="sd-card" size={18} color={colors.primaryDark} />
          <Text style={[typography.labelSm, styles.quickButtonText]}>Nạp thẻ SD</Text>
        </Pressable>

        <Pressable
          style={styles.quickButton}
          onPress={() =>
            router.push({
              pathname: '/(drone)/log',
              params: { code: '#REQ-KS-089' },
            })
          }
          accessibilityRole="button"
        >
          <MaterialIcons name="history" size={18} color={colors.primaryDark} />
          <Text style={[typography.labelSm, styles.quickButtonText]}>Nhật ký bay</Text>
        </Pressable>

        <Pressable
          style={styles.quickButton}
          onPress={() => router.push('/(drone)/sync')}
          accessibilityRole="button"
        >
          <MaterialIcons name="sync" size={18} color={colors.primaryDark} />
          <Text style={[typography.labelSm, styles.quickButtonText]}>Đồng bộ</Text>
        </Pressable>
      </View>

      {/* Section Tasks */}
      <View style={styles.sectionHeader}>
        <Text style={[typography.titleMd, styles.sectionTitle]}>Việc cần làm</Text>
        <Text style={[typography.caption, styles.seeAll]}>Ưu tiên theo tuyến</Text>
      </View>

      {/* Tasks List Matching Figma Image 1 */}
      <View style={styles.taskList}>
        {tasks.map((task) => (
          <Pressable
            key={task.code}
            onPress={() =>
              router.push({
                pathname: '/(drone)/request-detail',
                params: { code: task.code },
              })
            }
            accessibilityRole="button"
          >
            <Card style={styles.taskCardItem}>
              <View style={[styles.taskIconBox, { backgroundColor: task.iconBg }]}>
                <MaterialIcons name={task.iconName} size={20} color={task.iconColor} />
              </View>

              <View style={styles.taskContentBox}>
                <View style={styles.taskBadgeRow}>
                  <Chip variant={task.chipVariant} label={task.chipLabel} />
                  <Text style={[typography.caption, styles.taskCodeText]}>
                    {task.displayCode}
                  </Text>
                </View>

                <Text style={[typography.titleMd, styles.taskTitleText]}>{task.title}</Text>
                <Text style={[typography.caption, styles.taskSubtitleText]} numberOfLines={1}>
                  {task.subtitle}
                </Text>
              </View>

              <MaterialIcons name="chevron-right" size={20} color={colors.secondary} />
            </Card>
          </Pressable>
        ))}
      </View>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  greetingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  greetingTextGroup: {
    flex: 1,
    marginRight: spacing.sm,
  },
  greetingName: {
    color: colors.neutral,
  },
  greetingMeta: {
    color: colors.secondary,
    marginTop: spacing.xs,
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECEEF2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
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
  metricStripCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.md,
  },
  metricMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  metricIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: '#FEF3E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricContent: {
    flex: 1,
  },
  metricNumber: {
    color: colors.primary,
    fontSize: 24,
    lineHeight: 28,
  },
  metricDesc: {
    color: colors.secondary,
    marginTop: 2,
  },
  metricDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  telemetryStripRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  telemetryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  telemetryTagText: {
    color: colors.neutral,
    fontSize: 12,
  },
  quickAccessRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  quickButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 48,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 10,
  },
  quickButtonText: {
    color: colors.primaryDark,
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
    color: colors.secondary,
  },
  taskList: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  taskCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    gap: spacing.sm,
  },
  taskIconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskContentBox: {
    flex: 1,
    gap: 2,
  },
  taskBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  taskCodeText: {
    color: colors.secondary,
    fontSize: 12,
  },
  taskTitleText: {
    color: colors.neutral,
  },
  taskSubtitleText: {
    color: colors.secondary,
    fontSize: 12,
  },
});

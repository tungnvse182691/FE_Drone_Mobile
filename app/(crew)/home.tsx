import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { FAB } from '../../src/components/FAB';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { useAuthStore } from '../../src/store/auth';
import { CREW_TASKS } from './tasks';
import { TaskMode } from '../../src/types/enums';

interface CrewMetric {
  label: string;
  value: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  valueColor: string;
  iconColor: string;
  iconBg: string;
  subLabel: string;
}

const CREW_METRICS: CrewMetric[] = [
  {
    label: 'Việc đang làm',
    value: '4',
    icon: 'build',
    valueColor: colors.primaryDark,
    iconColor: '#6B5219',
    iconBg: '#FEF9E7',
    subLabel: 'Cần xử lý hôm nay',
  },
  {
    label: 'Hoàn thành',
    value: '12',
    icon: 'check-circle',
    valueColor: colors.success,
    iconColor: '#2F9E44',
    iconBg: '#E9F7EC',
    subLabel: 'Trong tháng',
  },
];

export default function CrewHomeScreen() {
  const user = useAuthStore((state) => state.user);
  const displayName = user?.full_name ? user.full_name.replace(/\s*\([^)]*\)/g, '').trim() : 'Nguyễn Văn Tuấn';
  const employeeCode = user?.employee_code ?? 'HH-RC-084';

  return (
    <View style={styles.screen}>
      <SafeAreaScreen scroll header={<AppHeader subtitle="Đội Sửa Chữa" />}>
        {/* HERO GREETING: Lời chào + Mã NV badge tương phản cao ngoài nắng */}
        <View style={styles.heroSection}>
          <View style={styles.heroTextCol}>
            <Text style={[typography.caption, styles.heroSub]}>Xin chào,</Text>
            <Text style={[typography.headlineLg, styles.heroName]}>{displayName}</Text>
          </View>
          <View style={styles.badgeWrapper}>
            <MaterialIcons name="badge" size={14} color={colors.brandGold} />
            <Text style={[typography.labelSm, styles.badgeText]}>{employeeCode}</Text>
          </View>
        </View>

        {/* THẺ ĐỘI 01: Thẻ đội thi công hiện trường, viền trái vàng 4px */}
        <Card style={styles.teamCard}>
          <View style={styles.teamHeaderRow}>
            <View style={styles.teamTitleGroup}>
              <MaterialIcons name="engineering" size={18} color={colors.brandGold} />
              <Text style={[typography.titleMd, styles.teamTitle]}>ĐỘI THI CÔNG 01</Text>
            </View>
            <View style={styles.teamStatusPill}>
              <View style={styles.statusDot} />
              <Text style={[typography.labelSm, styles.teamStatusText]}>Hiện trường</Text>
            </View>
          </View>

          <View style={styles.teamDivider} />

          <View style={styles.teamInfoList}>
            <View style={styles.teamMemberRow}>
              <View style={styles.memberRoleCol}>
                <MaterialIcons name="person" size={15} color={colors.secondary} />
                <Text style={[typography.caption, styles.memberRoleLabel]}>Đội trưởng:</Text>
              </View>
              <Text style={[typography.bodyMd, styles.memberNameText]}>Trần Văn Vượng</Text>
            </View>

            <View style={styles.teamMemberRow}>
              <View style={styles.memberRoleCol}>
                <MaterialIcons name="build" size={15} color={colors.secondary} />
                <Text style={[typography.caption, styles.memberRoleLabel]}>Kỹ thuật viên:</Text>
              </View>
              <Text style={[typography.bodyMd, styles.memberNameText]}>
                {user?.full_name ?? 'Lê Văn Tuấn'} • {employeeCode}
              </Text>
            </View>
          </View>
        </Card>

        {/* 2 THẺ METRIC: 24px+, icon ô màu pastel, card trắng viền 1px bo 12px */}
        <View style={styles.metricRow}>
          {CREW_METRICS.map((metric) => (
            <Card key={metric.label} style={styles.metricCard}>
              <View style={styles.metricTopRow}>
                <Text style={[typography.caption, styles.metricLabel]}>{metric.label}</Text>
                <View style={[styles.metricIconBox, { backgroundColor: metric.iconBg }]}>
                  <MaterialIcons name={metric.icon} size={18} color={metric.iconColor} />
                </View>
              </View>
              <Text style={[typography.headlineLg, styles.metricValue, { color: metric.valueColor }]}>
                {metric.value}
              </Text>
              <Text style={[typography.caption, styles.metricSub]}>{metric.subLabel}</Text>
            </Card>
          ))}
        </View>

        {/* SECTION HEADER: Danh sách việc */}
        <View style={styles.sectionHeader}>
          <Text style={[typography.titleMd, styles.sectionTitle]}>Công việc cần xử lý</Text>
          <Pressable
            onPress={() => router.push('/(crew)/tasks')}
            accessibilityRole="button"
            hitSlop={8}
            style={({ pressed }) => pressed && styles.pressedText}
          >
            <View style={styles.seeAllWrap}>
              <Text style={[typography.labelLg, styles.seeAll]}>Xem tất cả</Text>
              <MaterialIcons name="chevron-right" size={18} color={colors.brandGold} />
            </View>
          </Pressable>
        </View>

        {/* LIST CÔNG VIỆC: Card thoáng, chip chế độ, footer #WO-xx, chevron phải */}
        <View style={styles.taskList}>
          {CREW_TASKS.map((task) => {
            const isRepair = task.task_mode === TaskMode.INSPECT_AND_REPAIR;
            return (
              <Pressable
                key={task.id}
                onPress={() => router.push({ pathname: '/(crew)/wo-detail', params: { id: task.id } })}
                accessibilityRole="button"
                style={({ pressed }) => [styles.taskCardTouch, pressed && styles.taskCardPressed]}
              >
                <Card style={styles.taskCard}>
                  {/* Hàng 1: Chip chế độ + Hạn xử lý */}
                  <View style={styles.taskCardHeader}>
                    <View
                      style={[
                        styles.modeChip,
                        isRepair ? styles.modeChipRepair : styles.modeChipMeasure,
                      ]}
                    >
                      <View
                        style={[
                          styles.modeDot,
                          isRepair ? styles.modeDotRepair : styles.modeDotMeasure,
                        ]}
                      />
                      <Text
                        style={[
                          typography.labelSm,
                          styles.modeChipText,
                          isRepair ? styles.modeTextRepair : styles.modeTextMeasure,
                        ]}
                      >
                        {isRepair ? 'Đo & Sửa nhanh' : 'Chỉ đo đợt'}
                      </Text>
                    </View>

                    {task.due_label ? (
                      <View style={styles.dueWrap}>
                        <MaterialIcons
                          name={task.due_urgency === 'urgent' ? 'alarm' : 'access-time'}
                          size={13}
                          color={task.due_urgency === 'urgent' ? colors.error : colors.secondary}
                        />
                        <Text
                          style={[
                            typography.caption,
                            styles.dueText,
                            task.due_urgency === 'urgent' && styles.dueTextUrgent,
                          ]}
                        >
                          {task.due_label}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Hàng 2: Tiêu đề công việc 16px rõ nét ngoài nắng */}
                  <Text style={[typography.titleMd, styles.taskTitle]} numberOfLines={2}>
                    {task.title}
                  </Text>

                  {/* Hàng 3: Dòng tuyến • trạm • lý trình kèm icon near-me */}
                  <View style={styles.locationRow}>
                    <MaterialIcons name="near-me" size={14} color={colors.brandGold} />
                    <Text style={[typography.bodyMd, styles.locationText]} numberOfLines={1}>
                      {task.route_code} • {task.section_name} • {task.chainage}
                    </Text>
                  </View>

                  {/* Hàng 4: Footer thẻ với mã WO nhỏ + khoảng cách + chevron */}
                  <View style={styles.taskCardFooter}>
                    <View style={styles.footerLeftMeta}>
                      <View style={styles.woCodeBadge}>
                        <Text style={[typography.labelSm, styles.woCodeText]}>{task.wo_code}</Text>
                      </View>
                      {task.distance_label ? (
                        <Text style={[typography.caption, styles.distanceText]}>
                          • {task.distance_label}
                        </Text>
                      ) : null}
                    </View>

                    <View style={styles.actionPrompt}>
                      <Text style={[typography.caption, styles.actionPromptText]}>Chi tiết</Text>
                      <MaterialIcons name="chevron-right" size={18} color={colors.secondary} />
                    </View>
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaScreen>

      {/* FAB chụp ảnh hiện trường dời bottom 96 tránh đè bottom nav */}
      <FAB icon="photo-camera" onPress={() => router.push('/(crew)/viewfinder')} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
  },

  /* Hero Section */
  heroSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  heroTextCol: {
    flex: 1,
  },
  heroSub: {
    color: colors.secondary,
    marginBottom: 2,
  },
  heroName: {
    color: colors.neutral,
    fontSize: 22,
    lineHeight: 28,
  },
  badgeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: {
    color: colors.brandGold,
    letterSpacing: 0.5,
  },

  /* Team Card */
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
    justifyContent: 'space-between',
  },
  teamTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  teamTitle: {
    color: colors.brandGold,
    letterSpacing: 0.3,
  },
  teamStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E9F7EC',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  teamStatusText: {
    color: colors.success,
    fontSize: 10,
  },
  teamDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  teamInfoList: {
    gap: 6,
  },
  teamMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberRoleCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  memberRoleLabel: {
    color: colors.secondary,
  },
  memberNameText: {
    color: colors.neutral,
    fontFamily: 'Roboto-Medium',
  },

  /* Metrics Row */
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
  metricTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricLabel: {
    color: colors.secondary,
    fontFamily: 'Roboto-Medium',
  },
  metricIconBox: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: 26,
    lineHeight: 32,
    marginTop: spacing.xs,
    fontFamily: 'Roboto-Medium',
  },
  metricSub: {
    color: colors.secondary,
    fontSize: 11,
    marginTop: 2,
  },

  /* Section Header */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.neutral,
  },
  seeAllWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAll: {
    color: colors.brandGold,
  },
  pressedText: {
    opacity: 0.7,
  },

  /* Task List & Card */
  taskList: {
    gap: spacing.sm,
    paddingBottom: 40,
  },
  taskCardTouch: {
    minHeight: 48,
  },
  taskCardPressed: {
    opacity: 0.92,
  },
  taskCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.cardPadding,
  },
  taskCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.full,
  },
  modeChipRepair: {
    backgroundColor: '#E9F7EC',
  },
  modeChipMeasure: {
    backgroundColor: '#FEF3E2',
  },
  modeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  modeDotRepair: {
    backgroundColor: colors.success,
  },
  modeDotMeasure: {
    backgroundColor: colors.warning,
  },
  modeChipText: {
    letterSpacing: 0.2,
  },
  modeTextRepair: {
    color: colors.success,
  },
  modeTextMeasure: {
    color: colors.warning,
  },
  dueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dueText: {
    color: colors.secondary,
  },
  dueTextUrgent: {
    color: colors.error,
    fontFamily: 'Roboto-Medium',
  },
  taskTitle: {
    color: colors.neutral,
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: spacing.sm,
  },
  locationText: {
    color: colors.secondary,
    flex: 1,
    fontSize: 13,
  },
  taskCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceAlt,
  },
  footerLeftMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  woCodeBadge: {
    backgroundColor: colors.surfaceAlt,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  woCodeText: {
    color: colors.secondary,
    fontSize: 11,
  },
  distanceText: {
    color: colors.secondary,
  },
  actionPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionPromptText: {
    color: colors.secondary,
    fontSize: 12,
  },
});
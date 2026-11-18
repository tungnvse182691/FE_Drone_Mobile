import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { CrewPressable, CrewContentTransition } from '../../src/components/crew/CrewMotion';
import { CrewHomeTaskPressable } from '../../src/components/crew/CrewHomeTaskPressable';
import { crewHomeModeTone } from '../../src/components/crew/crewHomeTones';
import { CrewTaskStatus } from '../../src/components/CrewTaskStatus';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { useAuthStore } from '../../src/store/auth';
import { useCrewInbox, CrewInboxState, TASK_MODE_CHIP, crewStatusLabel, crewDateTime } from './tasks';
import { crewTaskIsComplete } from '../../src/api/crewApi';
import { CREW_RECEIVING } from '../../src/constants/routes';

interface CrewMetric {
  label: string;
  value: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  valueColor: string;
  iconColor: string;
  iconBg: string;

}

const CREW_METRICS: CrewMetric[] = [
  {
    label: 'Chưa hoàn thành',
    value: '',
    icon: 'build',
    valueColor: colors.primaryDark,
    iconColor: '#6B5219',
    iconBg: '#FEF9E7',
  },
  {
    label: 'Hoàn thành',
    value: '',
    icon: 'check-circle',
    valueColor: colors.success,
    iconColor: '#2F9E44',
    iconBg: '#E9F7EC',
  },
];

/** Bỏ phần vai trò trong ngoặc, ví dụ "Nguyễn Văn Tuấn (Kỹ thuật viên)" -> "Nguyễn Văn Tuấn" */
function normalizeName(raw: string | undefined, fallback: string): string {
  const cleaned = (raw ?? '').replace(/\s*\([^)]*\)/g, '').trim();
  return cleaned.length > 0 ? cleaned : fallback;
}

export default function CrewHomeScreen() {
  const user = useAuthStore((state) => state.user);
  const inbox = useCrewInbox();
  const tasks = inbox.tasks.filter(t => !crewTaskIsComplete(t));
  const displayName = normalizeName(inbox.enabled ? user?.full_name : undefined, 'Chưa có tên tài khoản');
  const employeeCode = inbox.enabled ? user?.employee_code?.trim() || 'Chưa có mã nhân viên' : 'Chưa đăng nhập';

  return (
    <View style={styles.screen}>
      <SafeAreaScreen scroll header={<AppHeader subtitle="Đội sửa chữa" />}>
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

        {/* 2 THẺ METRIC: 24px+, icon ô màu pastel, card trắng viền 1px bo 12px */}
        <View style={styles.metricRow}>
          {CREW_METRICS.map((metric, index) => (
            <Card key={metric.label} style={[styles.metricCard, index === 0 ? styles.metricPending : styles.metricDone]}>
              <View style={styles.metricTopRow}>
                <Text style={[typography.caption, styles.metricLabel]}>{metric.label}</Text>
                <View style={[styles.metricIconBox, { backgroundColor: metric.iconBg }]}>
                  <MaterialIcons name={metric.icon} size={18} color={metric.iconColor} />
                </View>
              </View>
              <Text style={[typography.headlineLg, styles.metricValue, { color: metric.valueColor }]}>
                {inbox.error || inbox.query.isPending ? '—' : String(index === 0 ? tasks.length : inbox.tasks.filter(crewTaskIsComplete).length)}
              </Text>
            </Card>
          ))}
        </View>

        {/* SECTION HEADER: Danh sách việc */}
        <View style={styles.sectionHeader}>
          <Text style={[typography.titleMd, styles.sectionTitle]}>Nhiệm vụ đang theo dõi</Text>
          <CrewPressable
            onPress={() => router.push('/(crew)/tasks')}
            accessibilityRole="button"
            hitSlop={8}
            style={({ pressed }) => pressed && styles.pressedText}
          >
            <View style={styles.seeAllWrap}>
              <Text style={[typography.labelLg, styles.seeAll]}>Xem tất cả</Text>
              <MaterialIcons name="chevron-right" size={18} color={colors.brandGold} />
            </View>
          </CrewPressable>
        </View>

        {/* Nút inline Chọn nhiệm vụ để chụp ảnh */}
        <CrewPressable
          style={({ pressed }) => [styles.captureBtn, pressed && styles.captureBtnPressed]}
          onPress={() => router.push('/(crew)/tasks')}
          accessibilityRole="button"
          accessibilityLabel="Chọn nhiệm vụ để chụp ảnh"
        >
          <MaterialIcons name="photo-camera" size={20} color={colors.neutral} />
          <Text style={[typography.labelLg, styles.captureBtnText]}>Chọn nhiệm vụ để chụp ảnh</Text>
        </CrewPressable>

        {/* Nút inline Nhận việc (ACK) — C-11 */}
        <CrewPressable
          style={({ pressed }) => [styles.receivingBtn, pressed && styles.receivingBtnPressed]}
          onPress={() => router.push(CREW_RECEIVING)}
          accessibilityRole="button"
          accessibilityLabel="Nhận việc cần xác nhận"
        >
          <MaterialIcons name="inbox" size={20} color={colors.secondary} />
          <Text style={[typography.labelLg, styles.receivingBtnText]}>
            Nhận việc cần xác nhận
          </Text>
          <MaterialIcons name="chevron-right" size={18} color={colors.secondary} />
        </CrewPressable>


        {/* LIST CÔNG VIỆC: Card thoáng, chip chế độ, mã nhiệm vụ thật, chevron phải */}
        <CrewInboxState inbox={inbox} />
        {inbox.enabled && inbox.query.isPending && tasks.length === 0 ? <View testID="crew-home-loading"
          accessible accessibilityRole="progressbar" accessibilityLabel="Đang tải danh sách nhiệm vụ" style={styles.taskList}>
          {[0, 1].map(key => <View key={key} style={styles.loadingCard} importantForAccessibility="no-hide-descendants">
            <View style={[styles.loadingLine, { width: '35%' }]} />
            <View style={[styles.loadingLine, { width: '75%', height: 20 }]} />
            <View style={[styles.loadingLine, { width: '55%' }]} />
          </View>)}
        </View> : null}
        <CrewContentTransition ready={!inbox.query.isPending}>
        <View style={styles.taskList}>
          {tasks.map((task) => {
            const tone = crewHomeModeTone(task.task_mode);
            return (
              <CrewHomeTaskPressable
                key={task.id}
                disabled={!task.projectId || !task.version}
                onPress={() => router.push({ pathname: '/(crew)/wo-detail', params: { id: task.id, projectId: task.projectId } })}
                accessibilityRole="button"
                accessibilityState={{ disabled: !task.projectId || !task.version }}
                android_ripple={{ color: '#1A1D2029', foreground: true }}
                style={({ pressed }) => [styles.taskCardTouch, pressed && styles.taskCardPressed]}
              >
                <Card style={[styles.taskCard, { borderLeftWidth: 2, borderLeftColor: tone.border }]}>
                  {/* Hàng 1: Chip chế độ + Hạn xử lý */}
                  <View style={styles.taskCardHeader}>
                    <View
                      style={[
                        styles.modeChip,
                        { backgroundColor: tone.background },
                      ]}
                    >
                      <Text
                        style={[
                          typography.labelSm,
                          styles.modeChipText,
                          { color: tone.foreground },
                        ]}
                      >
                        {TASK_MODE_CHIP[task.task_mode].label}
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
                          {crewDateTime(task.due_label)}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Hàng 2: Tiêu đề công việc 16px rõ nét ngoài nắng */}
                  <Text style={[typography.titleMd, styles.taskTitle]}>
                    {task.title || 'Nhiệm vụ hiện trường'}
                  </Text>

                  {/* Hàng 3: Dòng tuyến • trạm • lý trình kèm icon near-me */}
                  <View style={styles.locationRow}>
                    <MaterialIcons name="near-me" size={14} color={colors.secondary} />
                    <Text style={[typography.bodyMd, styles.locationText]}>
                      {[task.route_code, task.section_name, task.chainage].filter(Boolean).join(' • ') || 'Chưa có tuyến / vị trí'}
                    </Text>
                  </View>

                  {!task.projectId || !task.version ? <Text style={typography.caption}>Chưa đủ thông tin dự án hoặc phiên bản để mở nhiệm vụ. Hãy tải lại danh sách.</Text> : null}
                  {/* Hàng 4: Footer thẻ với mã WO nhỏ + khoảng cách + chevron */}
                  <View style={styles.taskCardFooter}>
                    <View style={styles.taskStatus}><CrewTaskStatus status={task.status} label={crewStatusLabel(task.status)} /></View>
                    <View style={styles.footerLeftMeta}>
                      <View style={styles.woCodeBadge}>
                        <Text style={[typography.labelSm, styles.woCodeText]}>{task.wo_code || `ID nhiệm vụ: ${task.id.slice(0,8)}`}</Text>
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
              </CrewHomeTaskPressable>
            );
          })}
        </View>
        </CrewContentTransition>
      </SafeAreaScreen>
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
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  heroTextCol: {
    flex: 1,
    minWidth: 180,
  },
  heroSub: {
    color: colors.secondary,
    marginBottom: 2,
  },
  heroName: {
    color: colors.neutral,
    fontSize: 20,
    lineHeight: 26,
    fontFamily: 'Roboto-Medium',
  },
  badgeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    maxWidth: '100%',
  },
  badgeText: {
    color: colors.secondary,
    fontSize: 12,
    lineHeight: 18,
    flexShrink: 1,
  },

  /* Metrics Row */
  metricRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  metricCard: {
    flex: 1,
    minHeight: 112,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.cardPadding,
    paddingVertical: 20,
    elevation: 0,
    shadowOpacity: 0,
  },
  metricPending: { borderTopColor: '#C9A227', borderTopWidth: 2 },
  metricDone: { borderTopColor: '#A8D5BA', borderTopWidth: 2 },
  metricTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricLabel: {
    color: colors.secondary,
    fontFamily: 'Roboto-Regular',
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  metricIconBox: {
    width: 28,
    height: 28,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: 28,
    lineHeight: 34,
    fontVariant: ['tabular-nums'],
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
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.neutral,
    flexShrink: 1,
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'Roboto-Medium',
  },
  seeAllWrap: {
    minHeight: 48,
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

  /* Capture Button */
  captureBtn: {
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    minHeight: 52,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  captureBtnPressed: {
    opacity: 0.84,
  },
  captureBtnText: {
    color: colors.neutral,
    flexShrink: 1,
    textAlign: 'center',
    lineHeight: 22,
  },

  /* Receiving (ACK) Button — C-11 */
  receivingBtn: {
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    minHeight: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#89939F',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  receivingBtnText: {
    color: colors.secondary,
    flex: 1,
    textAlign: 'left',
    lineHeight: 22,
  },
  receivingBtnPressed: { backgroundColor: '#EDF0F3' },

  /* Task List & Card */
  taskList: {
    gap: 12,
    paddingBottom: spacing.xl,
  },
  taskCardTouch: {
    minHeight: 48,
    borderRadius: radius.lg,
    overflow: 'hidden',
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
    elevation: 0,
    shadowOpacity: 0,
  },
  taskCardHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    maxWidth: '100%',
    flexShrink: 1,
  },
  modeChipText: {
    letterSpacing: 0.2,
    fontSize: 12,
    lineHeight: 18,
    flexShrink: 1,
  },
  dueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flexShrink: 1,
  },
  dueText: {
    color: colors.secondary,
    flexShrink: 1,
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
    fontFamily: 'Roboto-Medium',
    fontWeight: '400',
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
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceAlt,
  },
  footerLeftMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'center',
    flexShrink: 1,
  },
  woCodeBadge: {
    maxWidth: '100%',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
    backgroundColor: '#F1F3F5',
  },
  woCodeText: {
    color: colors.neutral,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Roboto-Medium',
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
  taskStatus: { width: '100%' },
  loadingCard: { minHeight: 140, padding: spacing.md, gap: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface },
  loadingLine: { height: 16, borderRadius: radius.sm, backgroundColor: colors.border },
});

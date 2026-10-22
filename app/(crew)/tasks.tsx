import React, { useCallback, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { Chip, type ChipVariant } from '../../src/components/Chip';
import { EmptyState } from '../../src/components/EmptyState';
import { FAB } from '../../src/components/FAB';
import { defectTypeLabel } from '../../src/constants/defect-types';
import {
  crewFieldTaskCard,
  fieldTaskStatusOf,
  isActiveFieldTaskStatus,
  listCrewFieldTaskCards,
  listFieldInspectionTasks,
  type CrewFieldTaskCard,
} from '../../src/api/mock/field-tasks';
import { TaskMode } from '../../src/types/enums';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

type TaskSegment = 'active' | 'done';

/** Thẻ nhiệm vụ hiển thị ở C-02; dữ liệu wire do `src/api/mock/field-tasks.ts` (API-078) cấp. */
export type CrewTask = CrewFieldTaskCard;

export const CREW_TASKS: CrewTask[] = listCrewFieldTaskCards('active');
export const CREW_COMPLETED_TASKS: CrewTask[] = listCrewFieldTaskCards('done');

export const DEFAULT_CREW_TASK_ID = CREW_TASKS[0]?.id ?? 'task-wo-01';

export function getCrewTaskById(id?: string | null): CrewTask {
  return crewFieldTaskCard(id ?? '') ?? CREW_TASKS[0];
}

export type TaskModeFilter = 'ALL' | 'INSPECT_AND_REPAIR' | 'MEASURE_ONLY';

export const TASK_MODE_FILTERS: { key: TaskModeFilter; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'INSPECT_AND_REPAIR', label: 'Đo & Sửa nhanh' },
  { key: 'MEASURE_ONLY', label: 'Chỉ đo đợt' },
];

export const TASK_MODE_CHIP: Record<TaskMode, { variant: ChipVariant; label: string }> = {
  INSPECT_AND_REPAIR: { variant: 'fast-track', label: 'Đo & Sửa nhanh' },
  MEASURE_ONLY: { variant: 'measure-only', label: 'Chỉ đo đợt' },
  INSPECT_ONLY: { variant: 'status-pending', label: 'Chỉ kiểm tra' },
};

export default function CrewTasksScreen() {
  const [segment, setSegment] = useState<TaskSegment>('active');
  const [modeFilter, setModeFilter] = useState<TaskModeFilter>('ALL');
  const [activeTasks, setActiveTasks] = useState<CrewTask[]>(CREW_TASKS);
  const [doneTasks, setDoneTasks] = useState<CrewTask[]>(CREW_COMPLETED_TASKS);

  const loadTasks = useCallback(async () => {
    try {
      const page = await listFieldInspectionTasks({ limit: 50 });
      const active: CrewTask[] = [];
      const done: CrewTask[] = [];
      for (const item of page.items) {
        const card = crewFieldTaskCard(item.id);
        if (!card) {
          continue;
        }
        if (isActiveFieldTaskStatus(item.status ?? '')) {
          active.push({ ...card });
        } else if (item.status === 'COMPLETED') {
          done.push({ ...card });
        }
      }
      setActiveTasks(active);
      setDoneTasks(done);
    } catch {
      // Giữ danh sách đang hiển thị khi lỗi mạng; người dùng có thể kéo sang màn khác để thử lại.
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadTasks();
    }, [loadTasks]),
  );

  const segments: { key: TaskSegment; label: string; count: number }[] = [
    { key: 'active', label: 'Đang làm', count: activeTasks.length },
    { key: 'done', label: 'Hoàn thành', count: doneTasks.length },
  ];

  const list =
    segment === 'active'
      ? activeTasks.filter((task) => modeFilter === 'ALL' || task.task_mode === modeFilter)
      : doneTasks;

  return (
    <View style={styles.screen}>
      <SafeAreaScreen scroll header={<AppHeader subtitle="Công việc" />}>
        <View style={styles.segments}>
          {segments.map((s) => {
            const active = s.key === segment;
            return (
              <Pressable
                key={s.key}
                style={[styles.segment, active && styles.segmentActive]}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => setSegment(s.key)}
              >
                <Text style={[typography.labelLg, active ? styles.segmentLabelActive : styles.segmentLabel]}>
                  {s.label}
                </Text>
                <View style={[styles.countBadge, active && styles.countBadgeActive]}>
                  <Text style={[typography.labelSm, active ? styles.countTextActive : styles.countText]}>
                    {s.count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {segment === 'active' ? (
          <View style={styles.modeFilters}>
            {TASK_MODE_FILTERS.map((filter) => {
              const active = filter.key === modeFilter;
              return (
                <Pressable
                  key={filter.key}
                  style={[styles.modeFilter, active && styles.modeFilterActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setModeFilter(filter.key)}
                >
                  <Text
                    style={[
                      typography.labelLg,
                      active ? styles.modeFilterLabelActive : styles.modeFilterLabel,
                    ]}
                  >
                    {filter.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {list.length === 0 ? (
          <EmptyState
            icon="check-circle"
            title="Không có công việc trong bộ lọc này"
            message="Chuyển sang bộ lọc khác để xem danh sách công việc."
          />
        ) : (
          <View style={styles.taskList}>
            {list.map((task) => {
            const modeChip = TASK_MODE_CHIP[task.task_mode];
            const railColor =
              task.task_mode === 'MEASURE_ONLY' ? colors.secondary : colors.success;
            return (
              <Pressable
                key={task.id}
                onPress={() =>
                  router.push({ pathname: '/(crew)/wo-detail', params: { id: task.id } })
                }
                accessibilityRole="button"
              >
                <Card style={styles.taskCard}>
                  <View style={[styles.rail, { backgroundColor: railColor }]} />
                  <View style={styles.taskHeader}>
                    <View style={styles.taskMetaRow}>
                      {task.completedAt ? (
                        <Chip variant="approved" label="Đã nghiệm thu" />
                      ) : fieldTaskStatusOf(task.id) === 'SUBMITTED' ? (
                        <Chip variant="status-pending" label="Chờ PM duyệt" uppercase={false} />
                      ) : (
                        <Chip variant={modeChip.variant} label={modeChip.label} uppercase={false} />
                      )}
                    </View>
                    <View style={styles.taskDistPill}>
                      <MaterialIcons name="near-me" size={14} color={colors.brandGold} />
                      <Text style={[typography.caption, styles.taskDist]}>{task.distance_label}</Text>
                    </View>
                  </View>

                  <Text style={[typography.titleMd, styles.taskTitle]}>{task.title}</Text>

                  <View style={styles.taskRouteRow}>
                    <MaterialIcons name="alt-route" size={14} color={colors.secondary} />
                    <Text style={[typography.caption, styles.taskRoute]}>
                      Tuyến {task.route_code} • {task.section_name} • {task.chainage}
                    </Text>
                  </View>

                  <Text style={[typography.caption, styles.taskDefect]}>
                    {defectTypeLabel(task.defect_type_code)}
                    {task.batch_size > 1 ? (
                      <Text style={styles.taskBatch}> • Đợt gom {task.batch_size} vị trí</Text>
                    ) : null}
                  </Text>

                  <View style={styles.taskFooter}>
                    <View style={styles.woChip}>
                      <Text style={[typography.labelSm, styles.taskCode]}>{task.wo_code}</Text>
                    </View>
                    <View style={[styles.duePill, task.due_urgency === 'urgent' && styles.duePillUrgent]}>
                      <MaterialIcons
                        name={task.due_urgency === 'urgent' ? 'alarm' : 'access-time'}
                        size={13}
                        color={task.due_urgency === 'urgent' ? colors.error : colors.secondary}
                      />
                      <Text
                        style={[
                          typography.caption,
                          task.due_urgency === 'urgent' ? styles.taskDueUrgent : styles.taskDue,
                        ]}
                      >
                        {task.due_label}
                      </Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={16} color={colors.secondary} style={styles.taskChevron} />
                  </View>
                </Card>
              </Pressable>
            );
            })}
          </View>
        )}
      </SafeAreaScreen>

      <FAB icon="add" onPress={() => router.push('/(crew)/report-defect')} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  segments: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    gap: spacing.xs,
    padding: 4,
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segment: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.md,
  },
  segmentActive: {
    backgroundColor: colors.primary,
  },
  segmentLabel: {
    color: colors.secondary,
  },
  segmentLabelActive: {
    color: colors.onPrimary,
  },
  countBadge: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    alignItems: 'center',
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  countText: {
    color: colors.secondary,
  },
  countTextActive: {
    color: colors.onPrimary,
  },
  modeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  modeFilter: {
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  modeFilterActive: {
    borderColor: colors.primary,
    backgroundColor: '#FEF9E7',
  },
  modeFilterLabel: {
    color: colors.secondary,
  },
  modeFilterLabelActive: {
    color: colors.brandGold,
  },
  taskCard: {
    marginBottom: spacing.md,
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#1A1D20',
        shadowOpacity: 0.08,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
      },
      android: {
        elevation: 3,
      },
    }),
  },
  rail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: radius.xl,
    borderBottomLeftRadius: radius.xl,
  },
  taskList: {
    paddingBottom: 140,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  taskDistPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    flexShrink: 0,
  },
  taskDist: {
    color: colors.secondary,
  },
  taskTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.neutral,
    marginTop: spacing.sm,
  },
  taskCode: {
    color: colors.brandGold,
  },
  taskRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  taskRoute: {
    flex: 1,
    color: colors.secondary,
  },
  taskDefect: {
    color: colors.secondary,
    marginTop: spacing.xs,
  },
  taskBatch: {
    color: colors.warning,
  },
  taskFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  woChip: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    backgroundColor: '#FEF9E7',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  duePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
  },
  duePillUrgent: {
    backgroundColor: '#FDECEC',
  },
  taskDue: {
    color: colors.secondary,
  },
  taskDueUrgent: {
    color: colors.error,
  },
  taskChevron: {
    marginLeft: spacing.xs,
  },
});

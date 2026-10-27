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
import { DEFECT_TYPE_CODES, defectTypeLabel, type DefectTypeCode } from '../../src/constants/defect-types';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Button } from '../../src/components/Button';
import { useAuthStore } from '../../src/store/auth';
import { passwordSessionIdentity } from '../../src/api/authApi';
import {
  crewInboxOptions, crewTaskFromWire, crewTaskIsComplete, crewTaskActionBlock,
  getFieldInspectionTaskDetailReal, isCrewResourceId, validateCrewTaskDetail,
  type CrewTask, type OperationalCrewTask,
} from '../../src/api/crewApi';
import { RoleCode, TaskMode } from '../../src/types/enums';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
export type { CrewTask, OperationalCrewTask } from '../../src/api/crewApi';

type TaskSegment = 'active' | 'done';

export function useCrewIdentity() {
  const user = useAuthStore(s => s.user), token = useAuthStore(s => s.token), status = useAuthStore(s => s.status);
  const scope = passwordSessionIdentity(token);
  const enabled = !!scope && !!user && JSON.parse(scope)[0] === user.id && user.role_code === RoleCode.REPAIR_CREW &&
    !user.must_change_password && ['AUTHENTICATED', 'REFRESHING'].includes(status);
  return { user, scope: enabled ? scope : null, enabled };
}
export function crewReadError(error: unknown): string {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status === 401) return 'Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.';
  if (status === 403) return 'Bạn không có quyền hoặc không còn được giao nhiệm vụ này.';
  if (status === 404) return 'Không tìm thấy nhiệm vụ trong phạm vi của bạn.';
  return 'Không tải được dữ liệu nhiệm vụ. Vui lòng thử lại.';
}
export function useCrewInbox() {
  const identity = useCrewIdentity();
  const query = useInfiniteQuery({ ...crewInboxOptions(identity.scope ?? ''), enabled: identity.enabled });
  const { refetch } = query;
  useFocusEffect(useCallback(() => { if (identity.enabled) void refetch(); }, [identity.enabled, refetch]));
  const items = new Map<string, CrewTask>();
  let foreign = false;
  if (identity.enabled && !query.isError) for (const page of query.data?.pages ?? []) for (const item of page.items) {
    if (!item.crewId || item.crewId.toLowerCase() !== identity.user!.id.toLowerCase()) { foreign = true; continue; }
    if (isCrewResourceId(item.id) && !items.has(item.id)) items.set(item.id, crewTaskFromWire(item));
  }
  const error = !identity.enabled ? 'Vui lòng đăng nhập bằng tài khoản Crew.' : foreign ? 'Dữ liệu phân công không khớp tài khoản hiện tại.' : query.isError ? crewReadError(query.error) : null;
  return { ...identity, query, error, tasks: error ? [] : [...items.values()] };
}
export function CrewInboxState({ inbox }: { inbox: ReturnType<typeof useCrewInbox> }) {
  return <View>
    {inbox.query.isPending && inbox.enabled ? <Text>Đang tải nhiệm vụ…</Text> : null}
    {inbox.error ? <Text>{inbox.error}</Text> : null}
    {!inbox.error && !inbox.query.isPending && !inbox.tasks.length ? <Text>Chưa có nhiệm vụ được giao.</Text> : null}
    <Text>Phạm vi: nhiệm vụ được giao đã tải; không phải tổng lịch sử.</Text>
    {inbox.query.data?.pages[0]?.asOf ? <Text>Đã tải lúc: {inbox.query.data.pages[0].asOf}</Text> : null}
    <Button variant="secondary" title="Tải lại" disabled={!inbox.enabled} loading={inbox.query.isFetching} onPress={() => { void inbox.query.refetch(); }} />
    {inbox.query.hasNextPage && !inbox.error ? <Button variant="secondary" title="Tải thêm" loading={inbox.query.isFetchingNextPage} disabled={inbox.query.isFetching} onPress={() => { void inbox.query.fetchNextPage(); }} /> : null}
  </View>;
}
/** Mount children only after an owner-scoped detail read. A new sid unmounts old task UI. */
export function CrewTaskBoundary({ children, operational = true }: {
  children: (task: OperationalCrewTask) => React.ReactNode; operational?: boolean;
}) {
  const params = useLocalSearchParams<{ id?: string; projectId?: string }>();
  const inbox = useCrewInbox();
  const id = typeof params.id === 'string' ? params.id : '';
  const item = inbox.tasks.find(t => t.id === id);
  const projectId = typeof params.projectId === 'string' ? params.projectId : item?.projectId ?? '';
  const validIds = isCrewResourceId(id) && isCrewResourceId(projectId);
  const query = useQuery({
    queryKey: ['crew-task', inbox.scope, projectId, id], enabled: inbox.enabled && validIds, retry: false, gcTime: 0,
    queryFn: async ({ signal }) => {
      const response = await getFieldInspectionTaskDetailReal(projectId, id, signal);
      validateCrewTaskDetail(response.data, response.etag, projectId, id, inbox.user!.id);
      return crewTaskFromWire({ id, projectId, crewId: response.data.assignedToUserId!, mode: response.data.mode ?? '',
        status: response.data.status ?? '', version: response.data.version!, defectIds: [response.data.defectId], policyVersionId: null }, response.data, response.etag);
    },
  });
  const { refetch } = query;
  useFocusEffect(useCallback(() => { if (inbox.enabled && validIds) void refetch(); }, [inbox.enabled, validIds, refetch]));
  const task = inbox.enabled && validIds && !query.isError ? query.data : undefined;
  const blocked = operational && task ? crewTaskActionBlock(task) : null;
  if (!task || blocked) return <SafeAreaScreen scroll header={<AppHeader subtitle="Nhiệm vụ" />}>
    <Text>{blocked ?? (!inbox.enabled ? 'Vui lòng đăng nhập bằng tài khoản Crew.' : !id ? 'Chưa chọn nhiệm vụ.' : !validIds ? 'Chưa xác định được dự án của nhiệm vụ. Chọn nhiệm vụ trong danh sách.' : query.isError ? crewReadError(query.error) : 'Đang tải nhiệm vụ…')}</Text>
    {query.isError ? <Button variant="secondary" title="Thử lại" onPress={() => { void query.refetch(); }} /> : null}
    {!validIds && id ? <CrewInboxState inbox={inbox} /> : null}
    <Button variant="secondary" title="Danh sách nhiệm vụ" onPress={() => router.replace('/(crew)/tasks')} />
  </SafeAreaScreen>;
  return <React.Fragment key={`${inbox.scope}:${projectId}:${id}`}>{children(task as OperationalCrewTask)}</React.Fragment>;
}

export type TaskModeFilter = 'ALL' | 'INSPECT_AND_REPAIR' | 'MEASURE_ONLY';

export const TASK_MODE_FILTERS: { key: TaskModeFilter; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'INSPECT_AND_REPAIR', label: 'Đo & Sửa nhanh' },
  { key: 'MEASURE_ONLY', label: 'Chỉ đo đợt' },
];

export const TASK_MODE_CHIP: Record<TaskMode | 'UNKNOWN', { variant: ChipVariant; label: string }> = {
  UNKNOWN: { variant: 'status-pending', label: 'Chưa xác định chế độ' },
  INSPECT_AND_REPAIR: { variant: 'fast-track', label: 'Đo & Sửa nhanh' },
  MEASURE_ONLY: { variant: 'measure-only', label: 'Chỉ đo đợt' },
  INSPECT_ONLY: { variant: 'status-pending', label: 'Chỉ kiểm tra' },
};

export default function CrewTasksScreen() {
  const [segment, setSegment] = useState<TaskSegment>('active');
  const [modeFilter, setModeFilter] = useState<TaskModeFilter>('ALL');
  const inbox = useCrewInbox();
  const activeTasks = inbox.tasks.filter(t => !crewTaskIsComplete(t));
  const doneTasks = inbox.tasks.filter(crewTaskIsComplete);
  const loadError = inbox.error;

  const segments: { key: TaskSegment; label: string; count: number }[] = [
    { key: 'active', label: 'Chưa hoàn thành', count: activeTasks.length },
    { key: 'done', label: 'Hoàn thành', count: doneTasks.length },
  ];

  const list =
    segment === 'active'
      ? activeTasks.filter((task) => modeFilter === 'ALL' || task.task_mode === modeFilter)
      : doneTasks;

  return (
    <View style={styles.screen}>
      <SafeAreaScreen scroll header={<AppHeader subtitle="Công việc" />}>
        <CrewInboxState inbox={inbox} />
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

        {loadError && list.length === 0 ? (
          <EmptyState
            icon="error-outline"
            title="Lỗi tải danh sách nhiệm vụ"
            message={loadError}
          />
        ) : inbox.query.isPending ? null : list.length === 0 ? (
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
                  router.push({ pathname: '/(crew)/wo-detail', params: { id: task.id, projectId: task.projectId } })
                }
                disabled={!isCrewResourceId(task.projectId) || !task.version}
                accessibilityRole="button"
              >
                <Card style={styles.taskCard}>
                  <View style={[styles.rail, { backgroundColor: railColor }]} />
                  <View style={styles.taskHeader}>
                    <View style={styles.taskMetaRow}>
                      {crewTaskIsComplete(task) ? (
                        <Chip variant="approved" label="Hoàn thành (trạng thái BE)" />
                      ) : (task.status.toUpperCase() === 'SUBMITTED') ? (
                        <Chip variant="status-pending" label="Chờ PM duyệt" uppercase={false} />
                      ) : (task.status.toUpperCase() === 'SUPPLEMENTREQUIRED') ? (
                        <Chip variant="status-pending" label="Cần bổ sung" uppercase={false} />
                      ) : (task.status.toUpperCase() === 'ASSIGNED') ? (
                        <Chip variant="status-pending" label="Chờ nhận việc" uppercase={false} />
                      ) : (
                        <Chip variant={modeChip.variant} label={modeChip.label} uppercase={false} />
                      )}
                    </View>
                    {task.distance_label && task.distance_label !== '—' ? (
                      <View style={styles.taskDistPill}>
                        <MaterialIcons name="near-me" size={14} color={colors.brandGold} />
                        <Text style={[typography.caption, styles.taskDist]}>{task.distance_label}</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={[typography.titleMd, styles.taskTitle]}>{task.title || 'Nhiệm vụ hiện trường'}</Text>
                  <Text>{task.id}</Text>
                  {!isCrewResourceId(task.projectId) || !task.version ? <Text>Thiếu dự án hoặc phiên bản; chưa thể mở nhiệm vụ.</Text> : null}

                  {task.route_code || task.section_name || task.chainage ? (
                    <View style={styles.taskRouteRow}>
                      <MaterialIcons name="alt-route" size={14} color={colors.secondary} />
                      <Text style={[typography.caption, styles.taskRoute]}>
                        {[task.route_code ? `Tuyến ${task.route_code}` : null, task.section_name, task.chainage]
                          .filter(Boolean)
                          .join(' • ')}
                      </Text>
                    </View>
                  ) : null}

                  <Text style={[typography.caption, styles.taskDefect]}>
                    {task.defect_type_code ? defectTypeLabel(task.defect_type_code) : 'Nhiệm vụ kiểm tra hiện trường'}
                    {task.batch_size > 1 ? (
                      <Text style={styles.taskBatch}> • Đợt gom {task.batch_size} vị trí</Text>
                    ) : null}
                  </Text>

                  <View style={styles.taskFooter}>
                    <View style={styles.woChip}>
                      <Text style={[typography.labelSm, styles.taskCode]}>{task.wo_code || 'Chưa có mã WO'}</Text>
                    </View>
                    {task.due_label && task.due_label !== '—' ? (
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
                    ) : (
                      <View style={{ flex: 1 }} />
                    )}
                    <MaterialIcons name="chevron-right" size={16} color={colors.secondary} style={styles.taskChevron} />
                  </View>
                </Card>
              </Pressable>
            );
            })}
          </View>
        )}
      </SafeAreaScreen>


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

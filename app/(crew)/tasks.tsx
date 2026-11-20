import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { Chip, type ChipVariant } from '../../src/components/Chip';
import { CrewTaskStatus } from '../../src/components/CrewTaskStatus';
import { EmptyState } from '../../src/components/EmptyState';
import { FAB } from '../../src/components/FAB';
import { DEFECT_TYPE_CODES, defectTypeLabel, type DefectTypeCode } from '../../src/constants/defect-types';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, usePathname } from 'expo-router';
import { Button } from '../../src/components/Button';
import { useAuthStore } from '../../src/store/auth';
import { apiClient } from '../../src/api/client';
import { passwordSessionIdentity } from '../../src/api/authApi';
import {
  crewInboxOptions, crewTaskFromWire, crewTaskIsComplete, crewTaskActionBlock,
  getFieldInspectionTaskDetailReal, isCrewResourceId, validateCrewTaskDetail,
  type CrewTask, type OperationalCrewTask,
} from '../../src/api/crewApi';
import { RoleCode } from '../../src/types/enums';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { CrewContentTransition, CrewPressable } from '../../src/components/crew/CrewMotion';
import { crewHomeModeTone } from '../../src/components/crew/crewHomeTones';
import { CrewHomeTaskPressable } from '../../src/components/crew/CrewHomeTaskPressable';
export type { CrewTask, OperationalCrewTask } from '../../src/api/crewApi';

type TaskSegment = 'active' | 'done';

/** Presentation only: unknown wire states never grant a capability. */
export function crewStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    NEWASSIGNED: 'Chờ nhận nhiệm vụ', ASSIGNED: 'Chờ nhận nhiệm vụ', ACCEPTED: 'Đã nhận nhiệm vụ', INPROGRESS: 'Đang thực hiện',
    STARTED: 'Đang thực hiện', SUBMITTED: 'Đã gửi hồ sơ', SUPPLEMENTREQUIRED: 'Cần bổ sung',
    COMPLETED: 'Hoàn thành nhiệm vụ', REJECTED: 'Đã từ chối', CANCELLED: 'Đã hủy',
  };
  return labels[status.toUpperCase()] ?? 'Trạng thái chưa được hỗ trợ';
}
export function crewModeLabel(mode: string): string {
  const labels: Record<string, string> = { NORMAL: 'Sửa chữa theo kế hoạch', CONDITIONAL_FT: 'Sửa chữa nhanh có điều kiện',
    MEASURE_ONLY: 'Chỉ đo kiểm', INSPECT_ONLY: 'Chỉ kiểm tra', INSPECT_AND_REPAIR: 'Đo kiểm và xem xét sửa chữa' };
  return labels[mode] ?? 'Chưa có thông tin chế độ';
}

/** Display only; never parse a localized value back into a command. */
export function crewDateTime(value?: string | null): string {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Chưa có thời gian hợp lệ';
  try { return new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value)); }
  catch { return 'Chưa có thời gian hợp lệ'; }
}

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
  if (status === 409 || status === 412) return 'Dữ liệu nhiệm vụ vừa thay đổi. Vui lòng tải lại để xem phiên bản mới.';
  if (status === 404) return 'Không tìm thấy nhiệm vụ trong phạm vi của bạn.';
  return 'Không tải được dữ liệu nhiệm vụ. Vui lòng thử lại.';
}
export function useCrewInbox() {
  const identity = useCrewIdentity();
  const environment = apiClient.defaults?.baseURL ?? '';
  const options = crewInboxOptions(identity.scope ?? '', {
    actorId: identity.user?.id ?? '',
    assertCurrent: () => {
      const current = useAuthStore.getState();
      if (!identity.enabled || passwordSessionIdentity(current.token) !== identity.scope ||
          current.user?.id !== identity.user?.id || current.user?.role_code !== RoleCode.REPAIR_CREW ||
          current.user.must_change_password || !['AUTHENTICATED', 'REFRESHING'].includes(current.status) ||
          (apiClient.defaults?.baseURL ?? '') !== environment) throw Error('crew_inbox_session_changed');
    },
  });
  const query = useInfiniteQuery({ ...options, queryKey: [...options.queryKey, environment], enabled: identity.enabled });
  const { refetch } = query;
  useFocusEffect(useCallback(() => { if (identity.enabled) void refetch(); }, [identity.enabled, refetch]));
  const items = new Map<string, CrewTask>();
  let foreign = false;
  const status = (query.error as { response?: { status?: number } })?.response?.status;
  const transient = query.isError && (status == null || status === 408 || status === 429 || status >= 500);
  if (identity.enabled && (!query.isError || transient)) for (const page of query.data?.pages ?? []) for (const item of page.items) {
    if (!item.crewId || item.crewId.toLowerCase() !== identity.user!.id.toLowerCase()) { foreign = true; continue; }
    if (isCrewResourceId(item.id) && !items.has(item.id)) items.set(item.id, crewTaskFromWire(item));
  }
  const error = !identity.enabled ? 'Vui lòng đăng nhập bằng tài khoản đội sửa chữa.' : foreign ? 'Dữ liệu phân công không khớp tài khoản hiện tại.' : query.isError ? crewReadError(query.error) : null;
  const stale = !!(transient && !foreign && items.size && identity.enabled);
  return { ...identity, environment, query, error, stale, tasks: (!identity.enabled || foreign || (query.isError && !transient)) ? [] : [...items.values()] };
}
export function CrewInboxState({ inbox, presentation = 'default' }: { inbox: ReturnType<typeof useCrewInbox>; presentation?: 'default' | 'tasks' }) {
  const tasksPresentation = presentation === 'tasks';
  return <Card style={[styles.inboxPanel, tasksPresentation && styles.tasksInboxPanel]}>
    <View style={[styles.inboxHeader, tasksPresentation && styles.tasksInboxHeader]}>
      <View style={styles.inboxHeading}>
        <Text style={[typography.titleMd, styles.inboxTitle]}>{inbox.query.isPending && inbox.enabled ? 'Đang tải nhiệm vụ…' : inbox.error ? 'Chưa tải được nhiệm vụ' : 'Nhiệm vụ được giao'}</Text>
        <Text style={[typography.caption, styles.inboxSubtitle]}>Thống kê trong các nhiệm vụ đã tải.</Text>
      </View>
      <CrewPressable accessibilityRole="button" accessibilityLabel="Tải lại nhiệm vụ"
        accessibilityState={{ busy: !!inbox.query.isFetching, disabled: !inbox.enabled || !!inbox.query.isFetching }}
        disabled={!inbox.enabled || inbox.query.isFetching}
        style={[styles.inboxRefresh, tasksPresentation && styles.tasksInboxRefresh]}
        onPress={() => { void inbox.query.refetch(); }}>
        {inbox.query.isFetching ? <ActivityIndicator color={colors.secondary} /> : <MaterialIcons name="refresh" size={24} color={colors.secondary} />}
      </CrewPressable>
    </View>
    <View style={[styles.inboxBody, tasksPresentation && styles.tasksInboxBody]}>
    {inbox.stale ? <Text style={typography.bodyMd}>Đang hiển thị danh sách đã tải trước đó. Chưa cập nhật được dữ liệu mới; mở nhiệm vụ để kiểm tra lại quyền và trạng thái.</Text> : null}
    {inbox.error ? <Text style={typography.bodyMd} accessibilityLiveRegion="polite">{inbox.error}</Text> : null}
    {!inbox.error && !inbox.query.isPending && !inbox.tasks.length ? <Text style={typography.bodyMd}>Chưa có nhiệm vụ được giao.</Text> : null}
    <View style={styles.inboxFooter}>
    {inbox.query.data?.pages[0]?.asOf ? <View style={styles.inboxTimestamp}>
      <Text style={[typography.caption, styles.inboxTimestampText]}>Đã tải lúc: {crewDateTime(inbox.query.data.pages[0].asOf)} (giờ Việt Nam)</Text>
    </View> : null}
    {inbox.query.hasNextPage && !inbox.error ? <View style={styles.inboxMore}>
      <Button variant="secondary" title="Tải thêm" icon={<MaterialIcons name="expand-more" size={20} color={colors.secondary} />}
        style={[styles.inboxMoreButton, tasksPresentation && styles.tasksInboxMoreButton]}
        loading={inbox.query.isFetchingNextPage} disabled={inbox.query.isFetching} onPress={() => { void inbox.query.fetchNextPage(); }} />
    </View> : null}
    </View>
    </View>
  </Card>;
}
/** Mount children only after an owner-scoped detail read. A new sid unmounts old task UI. */
type TaskBoundaryProps = { operational: false; children: (task: CrewTask) => React.ReactNode } |
  { operational?: true; children: (task: OperationalCrewTask) => React.ReactNode };
function isOperational(task: CrewTask): task is OperationalCrewTask { return !crewTaskActionBlock(task); }
export function CrewTaskBoundary(props: TaskBoundaryProps) {
  const operational = props.operational !== false;
  const pathname = usePathname();
  const params = useLocalSearchParams<{ id?: string; projectId?: string }>();
  const inbox = useCrewInbox();
  const id = typeof params.id === 'string' ? params.id : '';
  const item = inbox.tasks.find(t => t.id === id);
  const projectId = typeof params.projectId === 'string' ? params.projectId : item?.projectId ?? '';
  const validIds = isCrewResourceId(id) && isCrewResourceId(projectId);
  const query = useQuery({
    queryKey: ['crew-task', inbox.scope, inbox.environment, projectId, id], enabled: inbox.enabled && validIds, retry: false, gcTime: 0,
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
  const executionRoute = /\/(progress|complete|repair-correction)$/.test(pathname);
  const blocked = operational && executionRoute ? 'Chức năng thi công này chưa sẵn sàng. Xem các thao tác được hỗ trợ tại chi tiết nhiệm vụ.' : operational && task ? crewTaskActionBlock(task) : null;
  if (!task || blocked) return <SafeAreaScreen scroll header={<AppHeader subtitle="Nhiệm vụ" />}>
    <Card style={{ gap: spacing.md, marginBottom: spacing.md }}><MaterialIcons name="assignment" size={32} color={colors.brandGold} /><Text style={typography.titleMd}>Thông tin nhiệm vụ</Text><Text style={typography.bodyMd}>{blocked ?? (!inbox.enabled ? 'Vui lòng đăng nhập bằng tài khoản đội sửa chữa.' : !id ? 'Chưa chọn nhiệm vụ.' : !validIds ? 'Chưa xác định được dự án của nhiệm vụ. Chọn nhiệm vụ trong danh sách.' : query.isError ? crewReadError(query.error) : 'Đang tải nhiệm vụ…')}</Text></Card>
    {query.isError ? <Button variant="secondary" title="Thử lại" onPress={() => { void query.refetch(); }} /> : null}
    {!validIds && id ? <CrewInboxState inbox={inbox} /> : null}
    <Button variant="secondary" title="Danh sách nhiệm vụ" onPress={() => router.replace('/(crew)/tasks')} />
  </SafeAreaScreen>;
  return <React.Fragment key={`${inbox.environment}:${inbox.scope}:${projectId}:${id}`}>{props.operational === false ? props.children(task) : isOperational(task) ? props.children(task) : null}</React.Fragment>;
}

export type TaskModeFilter = 'ALL' | 'NORMAL' | 'CONDITIONAL_FT' | 'MEASURE_ONLY';

export const TASK_MODE_FILTERS: { key: TaskModeFilter; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'NORMAL', label: 'Sửa chữa theo kế hoạch' },
  { key: 'CONDITIONAL_FT', label: 'Sửa chữa nhanh có điều kiện' },
  { key: 'MEASURE_ONLY', label: 'Chỉ đo kiểm' },
];

export const TASK_MODE_CHIP: Record<CrewTask['task_mode'], { variant: ChipVariant; label: string }> = {
  NORMAL: { variant: 'status-pending', label: 'Sửa chữa theo kế hoạch' },
  CONDITIONAL_FT: { variant: 'fast-track', label: 'Sửa chữa nhanh có điều kiện' },
  UNKNOWN: { variant: 'status-pending', label: 'Chưa xác định chế độ' },
  INSPECT_AND_REPAIR: { variant: 'fast-track', label: 'Đo kiểm và xem xét sửa chữa' },
  MEASURE_ONLY: { variant: 'measure-only', label: 'Chỉ đo kiểm' },
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

  const list = (segment === 'active' ? activeTasks : doneTasks)
    .filter((task) => modeFilter === 'ALL' || task.task_mode === modeFilter);

  return (
    <View style={styles.screen}>
      <SafeAreaScreen scroll header={<AppHeader subtitle="Công việc" />}>
        <CrewInboxState inbox={inbox} presentation="tasks" />
        <View style={styles.segments}>
          {segments.map((s) => {
            const active = s.key === segment;
            return (
              <CrewPressable
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
              </CrewPressable>
            );
          })}
        </View>

        <View style={styles.modeFilters}>
            {TASK_MODE_FILTERS.map((filter) => {
              const active = filter.key === modeFilter;
              const tone = crewHomeModeTone(filter.key);
              return (
                <CrewPressable
                  key={filter.key}
                  style={[styles.modeFilter, active && { backgroundColor: tone.background, borderColor: tone.border }]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setModeFilter(filter.key)}
                >
                  <Text
                    style={[
                      typography.labelLg,
                      active ? { color: tone.foreground } : styles.modeFilterLabel,
                    ]}
                  >
                    {filter.label}
                  </Text>
                </CrewPressable>
              );
            })}
        </View>

        <CrewContentTransition ready={!inbox.query.isPending} revision={TASK_MODE_FILTERS.findIndex(f => f.key === modeFilter) * 2 + (segment === 'done' ? 1 : 0)}>
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
            return (
              <CrewHomeTaskPressable
                key={task.id}
                style={{ borderRadius: 16, overflow: 'hidden' }}
                android_ripple={{ color: '#1A1D2029', foreground: true }}
                onPress={() =>
                  router.push({ pathname: '/(crew)/wo-detail', params: { id: task.id, projectId: task.projectId } })
                }
                disabled={!isCrewResourceId(task.projectId) || !task.version}
                accessibilityRole="button"
              >
                <Card style={styles.taskCard}>
                  <View style={styles.taskContent}>
                  <View style={styles.taskHeader}>
                    <View style={styles.woChip}>
                      <Text style={[typography.labelSm, styles.taskCode]}>{task.wo_code || `ID nhiệm vụ: ${task.id.slice(0,8)}`}{['NORMAL', 'CONDITIONAL_FT'].includes(task.rawMode) ? ' · Sau sửa' : ''}</Text>
                    </View>
                    <View style={styles.taskMetaRow}>
                      <CrewTaskStatus status={task.status} label={crewStatusLabel(task.status)} />
                    </View>
                    {task.distance_label && task.distance_label !== '—' ? (
                      <View style={styles.taskDistPill}>
                        <Text style={[typography.caption, styles.taskDist]}>{task.distance_label}</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={[typography.titleMd, styles.taskTitle]}>{task.title || 'Nhiệm vụ hiện trường'}</Text>

                  {!isCrewResourceId(task.projectId) || !task.version ? <Text>Thiếu dự án hoặc phiên bản; chưa thể mở nhiệm vụ.</Text> : null}

                  {task.route_code || task.section_name || task.chainage ? (
                    <View style={styles.taskRouteRow}>
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

                  </View>
                  <View style={styles.taskFooter}>
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
                          {crewDateTime(task.due_label)}
                        </Text>
                      </View>
                    ) : (
                      <View style={{ flex: 1 }} />
                    )}
                    <MaterialIcons name="chevron-right" size={16} color={colors.secondary} style={styles.taskChevron} />
                  </View>
                </Card>
              </CrewHomeTaskPressable>
            );
            })}
          </View>
        )}
        </CrewContentTransition>
      </SafeAreaScreen>


    </View>
  );
}

const styles = StyleSheet.create({
  inboxPanel: {
    padding: 0,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  inboxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: '#F3F5F6',
    borderBottomWidth: 1,
    borderBottomColor: '#DCE2E7',
  },
  // Opt-in surface for Tasks; Home and task boundaries retain the default inbox.
  tasksInboxPanel: {
    borderWidth: 0, borderRadius: 0, backgroundColor: 'transparent',
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  tasksInboxHeader: {
    paddingHorizontal: 0, paddingTop: 0, paddingBottom: 12,
    backgroundColor: 'transparent', borderBottomWidth: 0,
  },
  tasksInboxRefresh: { borderColor: '#DDC98A' },
  tasksInboxBody: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 16 },
  tasksInboxMoreButton: { borderColor: '#DDC98A' },
  inboxIcon: {
    width: 32, height: 32,
    alignItems: 'center', justifyContent: 'center',
  },
  inboxHeading: { flex: 1, minWidth: 0, gap: 2 },
  inboxTitle: { color: '#192D40', fontSize: 16, lineHeight: 24 },
  inboxSubtitle: { color: colors.secondary, lineHeight: 18 },
  inboxRefresh: {
    width: 48, height: 48,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#89939F',
    borderRadius: radius.lg, backgroundColor: '#F7F0DA',
  },
  inboxBody: { paddingHorizontal: 12, paddingVertical: 8, gap: spacing.sm },
  inboxFooter: {
    flexDirection: 'row', flexWrap: 'wrap',
    alignItems: 'center', gap: 12,
  },
  inboxTimestamp: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    flexBasis: 152, flexGrow: 1, flexShrink: 1,
  },
  inboxTimestampText: { flex: 1, color: colors.secondary, lineHeight: 18 },
  inboxMore: { maxWidth: '100%', marginLeft: 'auto' },
  inboxMoreButton: {
    minWidth: 112, minHeight: 48,
    borderWidth: 1, borderColor: '#89939F',
    borderRadius: radius.lg, backgroundColor: '#F7F0DA',
    paddingHorizontal: 12,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
  },
  segments: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    gap: spacing.xs,
    padding: 4,
    marginBottom: spacing.md,
    backgroundColor: '#E8EDF0',
    borderRadius: radius.lg,
    borderWidth: 0,
  },
  segment: {
    flex: 1,
    minHeight: 48,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.md,
  },
  segmentActive: {
    backgroundColor: '#192D40',
    borderWidth: 1,
    borderColor: '#192D40',
  },
  segmentLabel: {
    fontFamily: 'Roboto',
    fontSize: 13,
    lineHeight: 18,
    color: colors.secondary,
    flexShrink: 1,
    textAlign: 'center',
  },
  segmentLabelActive: {
    fontSize: 13,
    lineHeight: 18,
    color: '#FFFFFF',
    flexShrink: 1,
    textAlign: 'center',
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
    backgroundColor: '#F3E7C0',
  },
  countText: {
    color: colors.secondary,
  },
  countTextActive: {
    color: '#192D40',
    fontVariant: ['tabular-nums'],
  },
  modeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  modeFilter: {
    minHeight: 48,
    maxWidth: '100%',
    paddingVertical: spacing.sm,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CFD7DD',
    backgroundColor: '#F3F5F6',
  },
  modeFilterLabel: {
    color: colors.secondary,
  },
  taskCard: {
    backgroundColor: colors.surface,
    padding: 0,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 0,
    shadowOpacity: 0,
  },
  taskContent: { padding: spacing.cardPadding },
  taskList: {
    gap: 12,
    paddingBottom: spacing.xl,
  },
  taskHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    fontSize: 16,
    lineHeight: 24,
    color: '#192D40',
    marginTop: spacing.sm,
    fontWeight: '400',
  },
  taskCode: {
    color: '#192D40',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Roboto-Medium',
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
    fontSize: 13,
    lineHeight: 21,
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
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.cardPadding,
    paddingVertical: 12,
    backgroundColor: '#F1F4F6',
    borderTopWidth: 1,
    borderTopColor: '#E6EBEF',
  },
  woChip: {
    maxWidth: '100%',
    paddingVertical: 2,
    backgroundColor: 'transparent',
  },
  duePill: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  duePillUrgent: {
    // Same quiet deadline treatment as Home; urgency stays in text and icon.
  },
  taskDue: {
    color: colors.secondary,
    flexShrink: 1,
  },
  taskDueUrgent: {
    color: colors.error,
    fontFamily: 'Roboto-Medium',
  },
  taskChevron: {
    marginLeft: spacing.xs,
  },
});

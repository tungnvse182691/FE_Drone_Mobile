import React, { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Clipboard, Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { Chip, type ChipVariant } from '../../src/components/Chip';
import { EmptyState } from '../../src/components/EmptyState';
import { FAB } from '../../src/components/FAB';
import { DEFECT_TYPE_CODES, defectTypeLabel, type DefectTypeCode } from '../../src/constants/defect-types';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, usePathname } from 'expo-router';
import { Button } from '../../src/components/Button';
import { useAuthStore } from '../../src/store/auth';
import { apiClient } from '../../src/api/client';
import { passwordSessionIdentity } from '../../src/api/authApi';
import {
  crewInboxOptions, crewTaskFromWire, crewTaskIsComplete, crewTaskActionBlock,
  getFieldInspectionTaskDetailReal, isCrewResourceId, validateCrewTaskDetail,
  crewAssignmentCanOpen, type CrewListQuery, type CrewTask, type OperationalCrewTask,
} from '../../src/api/crewApi';
import { RoleCode } from '../../src/types/enums';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { CrewPressable } from '../../src/components/crew/CrewMotion';
import { CrewHomeTaskPressable } from '../../src/components/crew/CrewHomeTaskPressable';
import { crewHomeModeTone } from '../../src/components/crew/crewHomeTones';
import { CrewTaskStatus } from '../../src/components/CrewTaskStatus';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
export type { CrewTask, OperationalCrewTask } from '../../src/api/crewApi';

type TaskSegment = 'active' | 'done' | 'other';

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
  if (status === 400) return 'Bộ lọc hoặc trang tiếp theo không còn hợp lệ. Tải lại danh sách từ đầu.';
  if (status === 401) return 'Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.';
  if (status === 403) return 'Bạn không có quyền hoặc không còn được giao nhiệm vụ này.';
  if (status === 409 || status === 412) return 'Dữ liệu nhiệm vụ vừa thay đổi. Vui lòng tải lại để xem phiên bản mới.';
  if (status === 404) return 'Không tìm thấy nhiệm vụ trong phạm vi của bạn.';
  return 'Không tải được dữ liệu nhiệm vụ. Vui lòng thử lại.';
}
export function useCrewInbox(filters: CrewListQuery = {}) {
  const client = useQueryClient();
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
  }, filters);
  const query = useInfiniteQuery({ ...options, queryKey: [...options.queryKey, environment], enabled: identity.enabled });
  const { refetch } = query;
  useFocusEffect(useCallback(() => { if (identity.enabled) void refetch(); }, [identity.enabled, refetch]));
  const items = new Map<string, CrewTask>();
  let foreign = false;
  const status = (query.error as { response?: { status?: number } })?.response?.status;
  const transient = query.isError && (status == null || status === 408 || status === 429 || status >= 500);
  if (identity.enabled && (!query.isError || transient)) for (const page of query.data?.pages ?? []) for (const item of page.items) {
    if (!item.crewId || item.crewId.toLowerCase() !== identity.user!.id.toLowerCase()) { foreign = true; continue; }
    if (!isCrewResourceId(item.assignmentId)) { foreign = true; continue; }
    const key = item.assignmentId.toLowerCase();
    if (isCrewResourceId(item.id) && !items.has(key)) items.set(key, crewTaskFromWire(item));
  }
  const error = !identity.enabled ? 'Vui lòng đăng nhập bằng tài khoản đội sửa chữa.' : foreign ? 'Dữ liệu phân công không khớp tài khoản hiện tại.' : query.isError ? crewReadError(query.error) : null;
  const stale = !!(transient && !foreign && items.size && identity.enabled);
  const refresh = () => status === 400
    ? client.resetQueries({ queryKey: [...options.queryKey, environment], exact: true })
    : query.refetch();
  return { ...identity, environment, query, refresh, error, stale, tasks: (!identity.enabled || foreign || (query.isError && !transient)) ? [] : [...items.values()] };
}
export function CrewInboxState({ inbox, presentation = 'default' }: { inbox: ReturnType<typeof useCrewInbox>; presentation?: 'default' | 'tasks' | 'home' }) {
  const tasksPresentation = presentation === 'tasks';
  const homePresentation = presentation === 'home';
  return <Card style={[styles.inboxPanel, tasksPresentation && styles.tasksInboxPanel, homePresentation && styles.homeInboxPanel]}>
    <View style={[styles.inboxHeader, tasksPresentation && styles.tasksInboxHeader, homePresentation && styles.homeInboxHeader]}>
      <View style={styles.inboxHeading}>
        <Text style={[homePresentation ? typography.caption : typography.titleMd, homePresentation ? styles.inboxSubtitle : styles.inboxTitle]}>{homePresentation && !inbox.query.isPending && !inbox.error ? (inbox.query.data?.pages[0]?.asOf ? `Đã tải lúc ${crewDateTime(inbox.query.data.pages[0].asOf)} (giờ Việt Nam)` : 'Chưa có thời gian tải') : inbox.query.isPending && inbox.enabled ? 'Đang tải nhiệm vụ…' : inbox.error ? 'Chưa tải được nhiệm vụ' : 'Nhiệm vụ được giao'}</Text>
        {!homePresentation ? <Text style={[typography.caption, styles.inboxSubtitle]}>Thống kê trong các nhiệm vụ đã tải.</Text> : null}
      </View>
      <CrewPressable accessibilityRole="button" accessibilityLabel="Tải lại nhiệm vụ"
        accessibilityState={{ busy: !!inbox.query.isFetching, disabled: !inbox.enabled || !!inbox.query.isFetching }}
        disabled={!inbox.enabled || inbox.query.isFetching}
        style={[styles.inboxRefresh, tasksPresentation && styles.tasksInboxRefresh, homePresentation && styles.homeInboxRefresh]}
        onPress={() => { void inbox.refresh(); }}>
        {inbox.query.isFetching ? <ActivityIndicator color={colors.secondary} /> : <MaterialIcons name="refresh" size={24} color={colors.secondary} />}
      </CrewPressable>
    </View>
    <View style={[styles.inboxBody, tasksPresentation && styles.tasksInboxBody, homePresentation && styles.homeInboxBody]}>
    {inbox.stale ? <Text style={typography.bodyMd}>Đang hiển thị danh sách đã tải trước đó. Chưa cập nhật được dữ liệu mới; mở nhiệm vụ để kiểm tra lại quyền và trạng thái.</Text> : null}
    {inbox.error ? <Text style={typography.bodyMd} accessibilityLiveRegion="polite">{inbox.error}</Text> : null}
    {!inbox.error && !inbox.query.isPending && !inbox.tasks.length ? <Text style={typography.bodyMd}>Chưa có nhiệm vụ được giao.</Text> : null}
    <View style={styles.inboxFooter}>
    {!homePresentation && inbox.query.data?.pages[0]?.asOf ? <View style={styles.inboxTimestamp}>
      <Text style={[typography.caption, styles.inboxTimestampText]}>Đã tải lúc: {crewDateTime(inbox.query.data.pages[0].asOf)} (giờ Việt Nam)</Text>
    </View> : null}
    {inbox.query.hasNextPage && !inbox.error ? <View style={[styles.inboxMore, homePresentation && styles.homeInboxMore]}>
      <Button variant="secondary" title="Tải thêm" icon={<MaterialIcons name="expand-more" size={20} color={colors.secondary} />}
        style={[styles.inboxMoreButton, tasksPresentation && styles.tasksInboxMoreButton, homePresentation && styles.homeInboxMoreButton]}
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

/** Calendar grouping is presentation only: original deadlines and task order are retained. */
export function crewTasksDueGroups(tasks: CrewTask[], now = Date.now()) {
  const day = (value: number) => Math.floor((value + 7 * 60 * 60 * 1000) / 86400000);
  const today = day(now);
  const weekday = new Date(today * 86400000).getUTCDay();
  const weekEnd = today + (weekday === 0 ? 0 : 7 - weekday);
  const labels = ['Quá hạn', 'Hôm nay', 'Ngày mai', 'Tuần này', 'Sau tuần này', 'Chưa có hạn'];
  const groups = labels.map(label => ({ label, tasks: [] as CrewTask[] }));
  for (const task of tasks) {
    const due = Date.parse(task.due_label);
    const date = day(due);
    const index = !Number.isFinite(due) ? 5 : due < now ? 0 : date === today ? 1 : date === today + 1 ? 2 : date <= weekEnd ? 3 : 4;
    groups[index].tasks.push(task);
  }
  return groups.filter(group => group.tasks.length > 0);
}

export function crewTaskCodePreview(code: string): string {
  if (/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(code)) return code.slice(0, 8) + '…';
  const match = code.match(/^(.*-)([^-]+)$/);
  const prefix = match?.[1] ?? '';
  const value = match?.[2] ?? code;
  return prefix + value.slice(0, 8) + (value.length > 8 ? '…' : '');
}

const ACCEPTANCE_FILTERS = [
  { key: 'ALL', label: 'Tất cả tiếp nhận' }, { key: 'PENDING', label: 'Chờ tiếp nhận' },
  { key: 'ACCEPTED', label: 'Đã nhận' }, { key: 'REJECTED', label: 'Đã từ chối' },
] as const;

export default function CrewTasksScreen() {
  const [segment, setSegment] = useState<TaskSegment>('active');
  const [modeFilter, setModeFilter] = useState<TaskModeFilter>('ALL');
  const [acceptance, setAcceptance] = useState<'ALL' | 'PENDING' | 'ACCEPTED' | 'REJECTED'>('ALL');
  const [filterOpen, setFilterOpen] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const insets = useSafeAreaInsets();
  const client = useQueryClient();
  useEffect(() => {
    let active = true, changed = false;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => {
      changed = true;
      if (active) setReduceMotion(value);
    });
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (active && !changed) setReduceMotion(value);
    }).catch(() => { /* Unknown preference stays static. */ });
    return () => { active = false; subscription.remove(); };
  }, []);
  useEffect(() => { const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350); return () => clearTimeout(timer); }, [search]);
  const inbox = useCrewInbox({
    statusGroup: segment === 'active' ? 'INCOMPLETE' : segment === 'done' ? 'COMPLETED' : 'OTHER',
    mode: modeFilter === 'ALL' ? undefined : modeFilter,
    acceptance: acceptance === 'ALL' ? undefined : acceptance, search: debouncedSearch,
  });
  // Reuse an already loaded, actor/environment-scoped inbox for summary only.
  // No extra request, no global totals inferred from a server-filtered page.
  const cached = inbox.enabled ? client.getQueryData?.<NonNullable<typeof inbox.query.data>>([
    ...crewInboxOptions(inbox.scope ?? '').queryKey, inbox.environment,
  ]) : undefined;
  const summaryItems = new Map<string, CrewTask>();
  for (const page of cached?.pages ?? []) for (const item of page.items) {
    if (item.crewId?.toLowerCase() === inbox.user?.id.toLowerCase() && isCrewResourceId(item.assignmentId) && isCrewResourceId(item.id)) {
      summaryItems.set(item.assignmentId!.toLowerCase(), crewTaskFromWire(item));
    }
  }
  const loaded = summaryItems.size ? [...summaryItems.values()] : inbox.tasks;
  const completed = loaded.filter(crewTaskIsComplete).length;
  const asOf = (summaryItems.size ? cached : inbox.query.data)?.pages[0]?.asOf;
  const loadedTime = asOf && Number.isFinite(Date.parse(asOf))
    ? new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(asOf)) : '—';
  const segments: { key: TaskSegment; label: string }[] = [
    { key: 'active', label: 'Chưa hoàn thành' }, { key: 'done', label: 'Hoàn thành' }, { key: 'other', label: 'Khác' },
  ];
  // API037 has already applied the AND filters across the full server collection.
  const list = search.trim() === debouncedSearch ? inbox.tasks : [];
  const groups = crewTasksDueGroups(list);
  const tabCount = (key: TaskSegment) => summaryItems.size ? (key === 'done' ? completed : key === 'active' ? loaded.filter(task => !crewTaskIsComplete(task) && !['CANCELLED', 'REJECTED', 'UNKNOWN'].includes(task.status.toUpperCase())).length : loaded.filter(task => ['CANCELLED', 'REJECTED', 'UNKNOWN'].includes(task.status.toUpperCase())).length) : key === segment && !inbox.query.isPending ? list.length : '—';
  const ripple = { color: '#1A1D2020' };

  return <View style={styles.screen}>
    <SafeAreaScreen scroll header={<AppHeader subtitle="Công việc" />}>
      <View style={v2.controls}>
        <View style={v2.tabs} accessibilityRole="tablist">
          {segments.map(item => <Pressable key={item.key} accessibilityRole="tab" accessibilityLabel={item.label}
            accessibilityState={{ selected: segment === item.key }} android_ripple={ripple}
            style={[v2.tab, segment === item.key && v2.tabActive]} onPress={() => setSegment(item.key)}>
            <Text style={[typography.labelLg, v2.tabText, segment === item.key && v2.tabTextActive]}>{item.label}</Text>
            <View style={[v2.tabBadge, segment === item.key && v2.tabBadgeActive]}><Text style={[typography.caption, v2.tabCount, segment === item.key && v2.tabTextActive]}>{tabCount(item.key)}</Text></View>
          </Pressable>)}
        </View>
        <Text style={[typography.caption, v2.summaryCaption]}>Trong các nhiệm vụ đã tải · {loadedTime === '—' ? 'Chưa có thời gian tải' : `Tải lúc ${loadedTime}`}</Text>
        <View style={v2.searchRow}>
          <View style={v2.searchField}>
            <MaterialIcons name="search" size={20} color={v2Palette.muted} />
            <TextInput value={search} onChangeText={setSearch} maxLength={100} autoCapitalize="none"
              accessibilityLabel="Tìm theo mã nhiệm vụ" placeholder="Tìm mã nhiệm vụ" placeholderTextColor={v2Palette.muted}
              style={[typography.bodyMd, v2.searchInput]} />
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Bộ lọc" accessibilityState={{ expanded: filterOpen }}
            android_ripple={ripple} style={v2.iconButton} onPress={() => { Keyboard.dismiss(); setFilterOpen(true); }}>
            <MaterialIcons name="filter-alt" size={23} color={v2Palette.navy} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Tải lại nhiệm vụ" disabled={!inbox.enabled || inbox.query.isFetching}
            accessibilityState={{ busy: !!inbox.query.isFetching, disabled: !inbox.enabled || !!inbox.query.isFetching }}
            android_ripple={ripple} style={v2.iconButton} onPress={() => { void inbox.refresh(); }}>
            {inbox.query.isFetching ? <ActivityIndicator color={v2Palette.navy} /> : <MaterialIcons name="refresh" size={24} color={v2Palette.navy} />}
          </Pressable>
        </View>
      </View>
      {acceptance === 'REJECTED' ? <Text style={[typography.bodyMd, v2.notice]}>Lịch sử phân công đã từ chối</Text> : null}
      {inbox.stale ? <Text style={[typography.bodyMd, v2.notice]}>Đang hiển thị danh sách đã tải trước đó. Chưa cập nhật được dữ liệu mới; mở nhiệm vụ để kiểm tra lại quyền và trạng thái.</Text> : null}
      {inbox.error && list.length > 0 ? <Text style={[typography.bodyMd, v2.notice]} accessibilityLiveRegion="polite">{inbox.error}</Text> : null}
      {inbox.query.isPending && inbox.enabled ? <View accessibilityLabel="Đang tải nhiệm vụ" accessibilityState={{ busy: true }}>
        {[0, 1, 2].map(index => <View key={index} style={v2.skeletonRow} importantForAccessibility="no-hide-descendants">
          {[38, 88, 65, 76, 45].map((width, line) => <View key={line} style={[v2.skeletonLine, { width: `${width}%` }]} />)}
        </View>)}
      </View> : inbox.error && !list.length ? <EmptyState icon="error-outline" title="Lỗi tải danh sách nhiệm vụ" message={inbox.error} />
        : !list.length ? <EmptyState icon="check-circle" title="Không có công việc trong bộ lọc này" message="Chuyển sang bộ lọc khác để xem danh sách công việc." />
        : groups.map(group => <View key={group.label}>
          <View style={v2.groupHeading}><Text style={[typography.titleLg, v2.groupTitle]}>{group.label}</Text><Text style={[typography.bodyMd, v2.muted]}>{group.tasks.length} việc</Text></View>
          {group.tasks.map(task => <View key={task.assignmentId} style={[v2.taskRow, { borderLeftColor: crewHomeModeTone(task.task_mode).border }]}>
            <View style={v2.taskIdentity}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Sao chép mã nhiệm vụ ${crewTaskCodePreview(task.wo_code || task.id)}`}
                android_ripple={ripple} style={v2.copyCode} onPress={() => { Clipboard.setString(task.wo_code || task.id); AccessibilityInfo.announceForAccessibility('Đã sao chép mã nhiệm vụ'); }}>
                <Text style={[typography.labelSm, v2.codeText]}>{crewTaskCodePreview(task.wo_code || task.id)}</Text>
              </Pressable>
              <CrewTaskStatus status={task.isHistory ? 'REJECTED' : task.status} label={task.isHistory ? 'Phân công đã từ chối' : crewStatusLabel(task.status)} />
            </View>
            <CrewHomeTaskPressable accessibilityRole="button" accessibilityLabel={`Mở nhiệm vụ ${task.title || crewTaskCodePreview(task.wo_code || task.id)}`}
              disabled={!crewAssignmentCanOpen(task)} accessibilityState={{ disabled: !crewAssignmentCanOpen(task) }}
              android_ripple={{ color: '#1A1D2029', foreground: true }} style={({ pressed }) => [v2.taskBody, pressed && v2.taskPressed]}
              onPress={() => crewAssignmentCanOpen(task) && router.push({ pathname: '/(crew)/wo-detail', params: { id: task.id, projectId: task.projectId } })}>
              <View style={v2.taskCardHeader}>
                <View style={[v2.modeChip, { backgroundColor: crewHomeModeTone(task.task_mode).background }]}>
                  <Text style={[typography.labelSm, v2.modeChipText, { color: crewHomeModeTone(task.task_mode).foreground }]}>{TASK_MODE_CHIP[task.task_mode].label}</Text>
                </View>
                {task.due_label && task.due_label !== '—' ? <View style={v2.dueWrap}>
                  <MaterialIcons name={task.due_urgency === 'urgent' ? 'alarm' : 'access-time'} size={13} color={task.due_urgency === 'urgent' ? colors.error : colors.secondary} />
                  <Text style={[typography.caption, v2.dueText, task.due_urgency === 'urgent' && v2.dueTextUrgent]}>{crewDateTime(task.due_label)}</Text>
                </View> : null}
              </View>
              <Text style={[typography.titleMd, v2.taskTitle]}>{task.title || 'Nhiệm vụ hiện trường'}</Text>
              <View style={v2.locationRow}><Text style={[typography.bodyMd, v2.locationText]}>{[task.route_code ? `Tuyến ${task.route_code}` : null, task.section_name, task.chainage].filter(Boolean).join(' • ') || 'Chưa có tuyến / vị trí'}</Text></View>
              <View style={v2.taskMetadata}>
              {task.isHistory ? <Text style={[typography.bodyMd, v2.muted]}>Lịch sử từ chối · {crewDateTime(task.rejectedAt)}. Không mở hồ sơ hiện hành.</Text> : !crewAssignmentCanOpen(task) ? <Text style={[typography.bodyMd, v2.muted]}>Thiếu dự án hoặc phiên bản; chưa thể mở nhiệm vụ.</Text> : null}
              {task.defect_type_code || task.batch_size > 1 || ['NORMAL', 'CONDITIONAL_FT'].includes(task.rawMode) ? <Text style={[typography.caption, v2.acceptance]}>{[task.defect_type_code ? defectTypeLabel(task.defect_type_code) : null, task.batch_size > 1 ? `Đợt gom ${task.batch_size} vị trí` : null, ['NORMAL', 'CONDITIONAL_FT'].includes(task.rawMode) ? 'Sau sửa' : null].filter(Boolean).join(' · ')}</Text> : null}
              </View>
              <View style={v2.taskCardFooter}>
                <View style={v2.footerLeftMeta}><Text style={[typography.caption, v2.acceptance]}>{task.isHistory ? `Đã từ chối · ${crewDateTime(task.rejectedAt)}` : task.acceptanceOutcome === 'ACCEPTED' ? `Đã nhận · ${crewDateTime(task.acceptedAt)}` : task.acceptanceOutcome === 'PENDING' ? 'Chờ tiếp nhận' : 'Chưa xác định kết quả tiếp nhận'}</Text>{task.distance_label && task.distance_label !== '—' ? <Text style={[typography.caption, v2.dueText]}>{task.distance_label}</Text> : null}</View>
                <View style={v2.actionPrompt}><Text style={[typography.caption, v2.actionPromptText]}>Chi tiết</Text><MaterialIcons name="chevron-right" size={18} color={colors.secondary} /></View>
              </View>
            </CrewHomeTaskPressable>
          </View>)}
        </View>)}
      {inbox.query.hasNextPage && !inbox.error ? <View style={styles.listMore}><Button variant="secondary" title="Tải thêm" loading={inbox.query.isFetchingNextPage} disabled={inbox.query.isFetching} onPress={() => { void inbox.query.fetchNextPage(); }} /></View> : null}
    </SafeAreaScreen>
    {filterOpen ? <Modal visible transparent animationType={reduceMotion ? 'none' : 'slide'} onRequestClose={() => setFilterOpen(false)}>
      <View style={v2.modalRoot}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Đóng bộ lọc" onPress={() => setFilterOpen(false)} />
        <View style={[v2.sheet, { paddingBottom: Math.max(insets.bottom, spacing.md) }]} accessibilityViewIsModal>
          <View style={v2.handle} />
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={v2.sheetContent}>
            <Text style={[typography.titleLg, v2.groupTitle]}>Bộ lọc</Text>
            <Text style={[typography.bodyMd, v2.muted]}>Chọn xong danh sách tự cập nhật ngay.</Text>
            <Text style={[typography.titleMd, v2.filterHeading]}>Tiếp nhận</Text>
            <View style={v2.chips}>{ACCEPTANCE_FILTERS.map(item => <Pressable key={item.key} accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ selected: acceptance === item.key }} android_ripple={ripple} onPress={() => setAcceptance(item.key)} style={[v2.chip, acceptance === item.key && v2.chipSelected]}><Text style={[typography.bodyMd, v2.chipText, acceptance === item.key && v2.chipTextSelected]}>{item.label}</Text></Pressable>)}</View>
            <Text style={[typography.titleMd, v2.filterHeading]}>Loại công việc</Text>
            <View style={v2.chips}>{TASK_MODE_FILTERS.map(item => <Pressable key={item.key} accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ selected: modeFilter === item.key }} android_ripple={ripple} onPress={() => setModeFilter(item.key)} style={[v2.chip, modeFilter === item.key && v2.chipSelected]}><Text style={[typography.bodyMd, v2.chipText, modeFilter === item.key && v2.chipTextSelected]}>{item.label}</Text></Pressable>)}</View>
          </ScrollView>
          <View style={v2.sheetActions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Xóa lọc" android_ripple={ripple} style={[v2.sheetButton, v2.resetButton]} onPress={() => { setAcceptance('ALL'); setModeFilter('ALL'); }}><Text style={[typography.labelLg, v2.chipText]}>Xóa lọc</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Hoàn tất" android_ripple={ripple} style={[v2.sheetButton, v2.applyButton]} onPress={() => setFilterOpen(false)}><Text style={[typography.labelLg, v2.chipText]}>Hoàn tất</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal> : null}
  </View>;
}

// Approved v2 palette; local token debt only, no shared token changes.
const v2Palette = { navy: '#192D40', muted: '#5A6470', quiet: '#6E7A85' };
const v2 = StyleSheet.create({
  summaryCaption: { color: v2Palette.muted, marginTop: spacing.sm, lineHeight: 18 },
  controls: { paddingBottom: spacing.xs },
  tabs: { flexDirection: 'row', alignItems: 'stretch', gap: spacing.xs, padding: spacing.xs, backgroundColor: colors.border, borderRadius: radius.lg + spacing.xs },
  tab: { flex: 1, flexShrink: 1, minWidth: 0, minHeight: 48, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: spacing.sm, paddingHorizontal: spacing.xs, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  tabActive: { backgroundColor: colors.primary },
  tabText: { color: v2Palette.muted, textAlign: 'center', lineHeight: 20, fontSize: 13 },
  tabTextActive: { color: v2Palette.navy },
  tabBadge: { minWidth: 22, paddingHorizontal: 5, paddingVertical: 2, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt },
  tabBadgeActive: { backgroundColor: colors.primary },
  tabCount: { fontVariant: ['tabular-nums'], fontSize: 12, color: v2Palette.muted, textAlign: 'center' },
  searchRow: { flexDirection: 'row', gap: 8, paddingTop: 12 },
  searchField: { flex: 1, minWidth: 0, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 },
  searchInput: { flex: 1, minWidth: 0, minHeight: 48, color: colors.neutral, paddingVertical: 10 },
  iconButton: { width: 48, height: 48, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  groupHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 16, paddingBottom: 16 },
  groupTitle: { color: v2Palette.navy, flexShrink: 1 },
  muted: { color: v2Palette.muted },
  notice: { color: v2Palette.muted, marginVertical: 8 },
  taskRow: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 2, borderRadius: radius.lg, marginBottom: 12, overflow: 'hidden' },
  taskIdentity: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingHorizontal: spacing.cardPadding, paddingTop: spacing.cardPadding, marginBottom: 12 },
  codeText: { color: v2Palette.navy, fontSize: 12, lineHeight: 18, fontFamily: 'Roboto-Medium', flexShrink: 1 },
  taskBody: { minHeight: 48, paddingHorizontal: spacing.cardPadding, paddingBottom: spacing.cardPadding, borderRadius: radius.lg, overflow: 'hidden' },
  taskPressed: { opacity: 0.92 },
  taskCardHeader: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 3, paddingHorizontal: 8, borderRadius: radius.full, maxWidth: '100%', flexShrink: 1 },
  modeChipText: { letterSpacing: 0.2, fontSize: 12, lineHeight: 18, flexShrink: 1 },
  dueWrap: { flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 1 },
  dueText: { color: colors.secondary, flexShrink: 1 },
  dueTextUrgent: { color: colors.error, fontFamily: 'Roboto-Medium' },
  acceptance: { color: v2Palette.muted, flexShrink: 1, lineHeight: 18 },
  taskTitle: { color: colors.neutral, fontSize: 16, lineHeight: 22, marginBottom: 6, fontFamily: 'Roboto-Medium', fontWeight: '400' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: spacing.sm },
  locationText: { color: colors.secondary, flex: 1, fontSize: 13 },
  taskMetadata: { gap: spacing.xs, marginBottom: spacing.sm },
  taskCardFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.surfaceAlt },
  footerLeftMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center', flexShrink: 1 },
  actionPrompt: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  actionPromptText: { color: colors.secondary, fontSize: 12 },
  copyCode: { minHeight: 48, maxWidth: '100%', justifyContent: 'center' },
  skeletonRow: { paddingVertical: 20, borderTopWidth: 1, borderTopColor: colors.border, gap: 14 },
  skeletonLine: { height: 16, borderRadius: 4, backgroundColor: '#D8DEE3' },
  modalRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#1A1D2080' },
  sheet: { maxHeight: '90%', backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12 },
  handle: { width: 42, height: 5, borderRadius: 3, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 },
  sheetContent: { paddingHorizontal: 20, gap: 6, paddingBottom: 16 },
  filterHeading: { color: v2Palette.navy, marginTop: 14, marginBottom: 4, fontSize: 14, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, minHeight: 48, maxWidth: '100%', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  chipSelected: { backgroundColor: v2Palette.navy, borderColor: v2Palette.navy },
  chipText: { color: v2Palette.navy, flexShrink: 1, lineHeight: 22, textAlign: 'center' },
  chipTextSelected: { color: colors.surface },
  sheetActions: { flexDirection: 'row', gap: 12, paddingHorizontal: 20 },
  sheetButton: { flex: 1, minHeight: 48, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', padding: 12, overflow: 'hidden' },
  resetButton: { borderWidth: 1, borderColor: colors.border },
  applyButton: { backgroundColor: colors.primary },
});

const styles = StyleSheet.create({
  homeInboxPanel: { backgroundColor: 'transparent', borderWidth: 0, padding: 0, elevation: 0, shadowOpacity: 0 },
  homeInboxHeader: { paddingHorizontal: 0, paddingVertical: 0, backgroundColor: 'transparent', borderBottomWidth: 0 },
  homeInboxRefresh: { backgroundColor: colors.surface, borderColor: colors.border },
  homeInboxBody: { paddingHorizontal: 0, paddingVertical: 0 },
  homeInboxMore: { width: '100%', marginLeft: 0, marginTop: spacing.sm },
  homeInboxMoreButton: { width: '100%' },
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
  screen: { flex: 1, backgroundColor: colors.surfaceAlt },
  listMore: { paddingVertical: 16 },
});

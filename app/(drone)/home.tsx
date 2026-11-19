import { useOperatorReadScope } from '../../src/hooks/useOperatorReadScope';
import { readOperatorSnapshot, operatorCachedNotice } from '../../src/api/operatorOfflineCache';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { operatorTaskVisual, OperatorTaskSkeleton } from '../../src/components/drone/OperatorTaskRow';
import { EmptyState } from '../../src/components/EmptyState';
import { AnimatedPressable } from '../../src/components/AnimatedPressable';
import { colors, typography } from '../../src/design-tokens';
import { useAuthStore } from '../../src/store/auth';
import { listOperatorSurveyTasksReal, type SurveyTaskV2ResponseDto } from '../../src/api/droneApi';
import { operatorTaskDisplayCode, operatorTaskStatusLabel, operatorTaskTargetBand } from '../../src/api/operator-task-view';
import { operatorAppearance } from '../../src/components/drone/appearance';

export default function DroneHomeScreen() {
  const user = useAuthStore((state) => state.user);
  const scope = useOperatorReadScope();
  const loadedScope = useRef<string | null>(null);
  const [dataScope, setDataScope] = useState<string | null>(null);
  const [tasks, setTasks] = useState<SurveyTaskV2ResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const requestSerial = useRef(0);

  const fetchTasks = useCallback(async () => {
    const inScope = scope.capture(), request = ++requestSerial.current;
    const isCurrent = () => inScope() && request === requestSerial.current;
    if (!isCurrent()) return;
    if (loadedScope.current !== scope.key) setTasks([]);
    loadedScope.current = scope.key;
    setDataScope(scope.key);
    setLoading(true);
    setLoadError(null);
    try {
      const page = await readOperatorSnapshot('tasks:', () => listOperatorSurveyTasksReal(null, 50));
      if (!isCurrent()) return;
      setTasks([...new Map((page.items || []).map(item => [item.id.toLowerCase(), item])).values()]);
      setHasMore(!!page.nextCursor);
      setLoadError(operatorCachedNotice(page.cachedAt));
    } catch {
      if (!isCurrent()) return;
      setLoadError('Không thể tải danh sách nhiệm vụ. Vui lòng kiểm tra kết nối.');

    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [scope.key, scope.capture]);

  useFocusEffect(
    useCallback(() => {
      void fetchTasks();
      return () => { requestSerial.current++; };
    }, [fetchTasks]),
  );

  if (!scope.key || dataScope !== scope.key) return <SafeAreaScreen><Text>Đang tải dữ liệu của phiên hiện tại…</Text></SafeAreaScreen>;

  const ongoingCount = tasks.filter(t => ['ACCEPTED', 'IN_PROGRESS', 'INPROGRESS'].includes(t.status?.toUpperCase())).length;
  const submittedCount = tasks.filter(t => t.status?.toUpperCase() === 'SUBMITTED').length;

  return (
    <SafeAreaScreen scroll header={<AppHeader subtitle="Trang chủ" variant="operatorCompact" />}>
      <View style={styles.overview}>
      <View style={styles.greetingHeader}>
        <Text style={[typography.titleMd, styles.greetingName]}>
          Chào, {user?.full_name?.trim() || 'Phi công'}
        </Text>
        <Text style={styles.greetingMeta}>Phi công hiện trường</Text>
      </View>
      <View style={styles.metrics}>
        {[
          { key: 'loaded', count: tasks.length, label: 'Đã tải', icon: 'download' as const, color: '#FFFFFF' },
          { key: 'ongoing', count: ongoingCount, label: 'Đang thực hiện', icon: 'autorenew' as const, color: colors.primary },
          { key: 'submitted', count: submittedCount, label: 'Đã nộp', icon: 'check-circle' as const, color: '#FFFFFF' },
        ].map(metric => (
          <View key={metric.key} style={styles.metricColumn}>
            <MaterialIcons name={metric.icon} size={20} color={metric.color} accessible={false} />
            <Text testID={`operator-kpi-${metric.key}`} style={{ ...styles.metricNumber, color: metric.color }}>{metric.count}{''}</Text>
            <Text style={styles.metricLabel}>{metric.label}</Text>
          </View>
        ))}
      </View>
      {hasMore ? <Text style={styles.pageNote}>Số liệu của trang đầu đã tải.</Text> : null}
      </View>
      {/* Section Tasks */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeading}>
          <Text style={[typography.titleMd, styles.sectionTitle]}>Nhiệm vụ khảo sát</Text>
          {loading && tasks.length > 0 ? <ActivityIndicator size="small" color={colors.brandGold} accessibilityLabel="Đang cập nhật nhiệm vụ" /> : null}
        </View>
        <AnimatedPressable
          onPress={() => router.push('/(drone)/requests')}
          accessibilityRole="button"
          accessibilityLabel="Xem tất cả nhiệm vụ khảo sát"
          android_ripple={{ color: '#EADDAF' }}
          pressedScale={0.98}
          style={styles.seeAllPress}
        >
          <Text style={[typography.caption, styles.seeAll]}>Xem tất cả</Text>
          <MaterialIcons name="chevron-right" size={16} color={colors.primaryDark} />
        </AnimatedPressable>
      </View>

      {/* Tasks List */}
      {loadError && tasks.length > 0 ? <View style={styles.errorCard}><Text accessibilityRole="alert" style={styles.errorText}>{loadError}</Text></View> : null}
      {loading && tasks.length === 0 ? (
        <OperatorTaskSkeleton />
      ) : loadError && tasks.length === 0 ? (
        <EmptyState
          icon="error-outline"
          title="Không tải được dữ liệu"
          message={loadError}
          actionLabel="Thử lại"
          onAction={() => void fetchTasks()}
        />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon="flight-takeoff"
          title="Chưa có nhiệm vụ"
          message="Bạn chưa có nhiệm vụ khảo sát nào được giao trên hệ thống."
          actionLabel="Tải lại"
          onAction={() => void fetchTasks()}
        />
      ) : (
        <View style={styles.taskList}>
          {tasks.slice(0, 5).map(task => <OperatorTaskRow key={task.id} task={task}
            onPress={() => router.push({ pathname: '/(drone)/request-detail', params: { taskId: task.id, code: operatorTaskDisplayCode(task.id) } })} />)}
        </View>
      )}
    </SafeAreaScreen>
  );
}

// Home-only presentation; shared task rows and every navigation callback stay unchanged.
export function OperatorTaskRow({ task, onPress }: { task: SurveyTaskV2ResponseDto; onPress: () => void }) {
  const code = operatorTaskDisplayCode(task.id);
  const label = operatorTaskStatusLabel(task.status);
  const visual = operatorTaskVisual(task.status);
  const segments = task.scope?.reduce((count, scope) => count + (scope.segmentIds?.length ?? 0), 0) ?? 0;
  const ongoing = ['ACCEPTED', 'IN_PROGRESS', 'INPROGRESS'].includes(task.status?.toUpperCase());
  return <AnimatedPressable onPress={onPress} style={styles.taskCard} pressedScale={0.985}
    android_ripple={{ color: '#EADDAF' }} accessibilityRole="button"
    accessibilityLabel={`Xem nhiệm vụ ${code}, ${label}`}>
    <View style={styles.taskBody}>
      <View style={styles.taskMetadata}>
        <Text style={styles.taskCode}>Mã {code}</Text>
        {ongoing ? <Text testID="operator-current-task" style={styles.currentTask}>NHIỆM VỤ HIỆN TẠI</Text> : null}
      </View>
      <View style={styles.taskHeading}>
        <Text style={styles.taskTitle}>Khảo sát {operatorTaskTargetBand(task)}</Text>
        <MaterialIcons name="chevron-right" size={22} color={premium.navy} accessible={false} />
      </View>
    </View>
    <View style={styles.taskFooter}>
      <View style={[styles.statusChip, { backgroundColor: visual.background }]}>
        <View accessible={false} style={[styles.statusDot, { backgroundColor: visual.rail }]} />
        <Text style={[styles.statusText, { color: visual.ink }]}>{label}</Text>
      </View>
      <View style={styles.segmentGroup}>
        <MaterialIcons name="route" size={16} color={premium.muted} accessible={false} />
        <Text style={styles.segmentText}>{segments} phân đoạn</Text>
      </View>
    </View>
  </AnimatedPressable>;
}

// Proposed palette is local to Operator Home; global design tokens are untouched.
const premium = { navy: '#192D40', muted: '#526170', line: '#DCE2E7', soft: '#F3F5F6', onNavy: '#C9D3DC' };
const styles = StyleSheet.create({
  overview: { marginBottom: 24, gap: 20, padding: 20, borderRadius: 20, backgroundColor: premium.navy },
  greetingHeader: { gap: 4 },
  greetingName: { color: '#FFFFFF', fontSize: 20, fontWeight: '500', lineHeight: 28 },
  greetingMeta: { ...typography.caption, lineHeight: 18, color: premium.onNavy },
  metrics: { flexDirection: 'row', alignItems: 'stretch', gap: 12 },
  metricColumn: { flex: 1, minWidth: 0, gap: 8, alignItems: 'center' },
  metricNumber: { fontFamily: 'Roboto-Medium', fontSize: 28, fontWeight: '500', lineHeight: 36, color: colors.neutral, fontVariant: ['tabular-nums'] },
  metricLabel: { ...typography.caption, lineHeight: 18, minHeight: 36, alignSelf: 'stretch', textAlign: 'center', color: premium.onNavy },
  pageNote: { ...typography.caption, lineHeight: 18, color: premium.onNavy },
  sectionHeader: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { color: premium.navy, fontWeight: '500' },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  errorCard: { ...operatorAppearance.card, padding: 12, marginBottom: 12 },
  errorText: { ...typography.bodyMd, color: colors.secondary },
  seeAllPress: { minHeight: 48, minWidth: 48, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#F7F0DA', flexDirection: 'row', alignItems: 'center', gap: 4, overflow: 'hidden' },
  seeAll: { ...typography.caption, color: colors.primaryDark },
  taskList: { gap: 12, paddingBottom: 32 },
  taskCard: { minHeight: 48, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: premium.line, overflow: 'hidden' },
  taskBody: { padding: 16, gap: 12 },
  taskMetadata: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  taskCode: { ...typography.caption, fontFamily: 'Roboto-Medium', color: premium.navy, backgroundColor: premium.soft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, lineHeight: 18 },
  currentTask: { ...typography.labelSm, color: colors.primaryDark, flexShrink: 1, lineHeight: 18 },
  taskHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  taskTitle: { ...typography.titleMd, fontWeight: '500', color: premium.navy, lineHeight: 24, flex: 1, minWidth: 0 },
  taskFooter: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: premium.soft, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, maxWidth: '100%' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { ...typography.caption, lineHeight: 18, flexShrink: 1 },
  segmentGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  segmentText: { ...typography.caption, color: premium.muted, lineHeight: 18 },
});

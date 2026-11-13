import { useOperatorReadScope } from '../../src/hooks/useOperatorReadScope';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { OperatorTaskRow, OperatorTaskSkeleton } from '../../src/components/drone/OperatorTaskRow';
import { EmptyState } from '../../src/components/EmptyState';
import { AnimatedPressable } from '../../src/components/AnimatedPressable';
import { colors, typography } from '../../src/design-tokens';
import { useAuthStore } from '../../src/store/auth';
import { listOperatorSurveyTasksReal, type SurveyTaskV2ResponseDto } from '../../src/api/droneApi';
import { operatorTaskDisplayCode } from '../../src/api/operator-task-view';
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
      const page = await listOperatorSurveyTasksReal(null, 50);
      if (!isCurrent()) return;
      setTasks([...new Map((page.items || []).map(item => [item.id.toLowerCase(), item])).values()]);
      setHasMore(!!page.nextCursor);
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
      <View style={styles.greetingHeader}>
        <Text style={[typography.titleMd, styles.greetingName]}>
          Chào, {user?.full_name?.trim() || 'Phi công'}
        </Text>
        <Text style={styles.greetingMeta}>Phi công hiện trường</Text>
      </View>
      <View style={styles.metrics}>
        {[
          { key: 'loaded', count: tasks.length, label: 'Đã tải', icon: 'download' as const, color: colors.secondary },
          { key: 'ongoing', count: ongoingCount, label: 'Đang thực hiện', icon: 'autorenew' as const, color: colors.brandGold },
          { key: 'submitted', count: submittedCount, label: 'Đã nộp', icon: 'check-circle' as const, color: colors.success },
        ].map(metric => (
          <View key={metric.key} style={styles.metricColumn}>
            <MaterialIcons name={metric.icon} size={20} color={metric.color} accessibilityLabel={metric.label} />
            <Text testID={`operator-kpi-${metric.key}`} style={{ ...styles.metricNumber, color: metric.color }}>{metric.count}{''}</Text>
            <Text style={styles.metricLabel} numberOfLines={2}>{metric.label}</Text>
          </View>
        ))}
      </View>
      {hasMore ? <Text style={styles.pageNote}>Số liệu của trang đầu đã tải.</Text> : null}
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

const styles = StyleSheet.create({
  greetingHeader: { gap: 4, marginBottom: 16 },
  greetingName: { color: colors.neutral, lineHeight: 26 },
  greetingMeta: { ...typography.caption, lineHeight: 18, color: colors.secondary },
  metrics: { flexDirection: 'row', alignItems: 'stretch', gap: 12, marginBottom: 24 },
  metricColumn: { ...operatorAppearance.card, flex: 1, minWidth: 0, gap: 4, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 8 },
  metricNumber: { fontFamily: 'Roboto-Medium', fontSize: 28, fontWeight: '500', lineHeight: 36, color: colors.neutral, fontVariant: ['tabular-nums'] },
  metricLabel: { ...typography.caption, lineHeight: 17, minHeight: 34, textAlign: 'center', color: colors.secondary },
  pageNote: { ...typography.caption, lineHeight: 18, color: colors.secondary, marginTop: 8 },
  sectionHeader: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 4, marginBottom: 8 },
  sectionTitle: { color: colors.neutral },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  errorCard: { ...operatorAppearance.card, padding: 12, marginBottom: 12 },
  errorText: { ...typography.bodyMd, color: colors.secondary },
  seeAllPress: { minHeight: 48, minWidth: 48, flexDirection: 'row', alignItems: 'center', gap: 4 },
  seeAll: { ...typography.caption, color: colors.primaryDark },
  taskList: { gap: 12, paddingBottom: 32 },
});

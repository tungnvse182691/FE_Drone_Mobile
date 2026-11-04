import { useOperatorReadScope } from '../../src/hooks/useOperatorReadScope';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { Chip } from '../../src/components/Chip';
import { EmptyState } from '../../src/components/EmptyState';
import { AnimatedPressable } from '../../src/components/AnimatedPressable';
import { Button } from '../../src/components/Button';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { useAuthStore } from '../../src/store/auth';
import { listOperatorSurveyTasksReal, type SurveyTaskV2ResponseDto } from '../../src/api/droneApi';
import { operatorTaskDisplayCode, operatorTaskStatusLabel, operatorTaskTargetBand } from '../../src/api/operator-task-view';

const softShadow = Platform.select({
  ios: { shadowColor: '#1A1D20', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  android: { elevation: 3 },
  default: {},
});

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

  const pendingTasks = tasks.filter((t) => {
    const s = t.status?.toUpperCase();
    return s === 'NEW_ASSIGNED' || s === 'NEWASSIGNED' || s === 'REASSIGNED';
  });
  const ongoingTasks = tasks.filter((t) => {
    const s = t.status?.toUpperCase();
    return s === 'ACCEPTED' || s === 'IN_PROGRESS' || s === 'INPROGRESS';
  });
  const urgentCount = pendingTasks.length;
  const ongoingCount = ongoingTasks.length;

  return (
    <SafeAreaScreen scroll header={<AppHeader subtitle="Trang chủ" />}>
      {/* Greeting Header */}
      <View style={styles.greetingHeader}>
        <View style={styles.greetingTextGroup}>
          <Text style={[typography.titleMd, styles.greetingName]}>
            Chào, {user?.full_name ? user.full_name.replace(/\s*\([^)]*\)/g, '').trim() : 'Kỹ thuật viên Drone'}
          </Text>
          <Text style={[typography.caption, styles.greetingMeta]}>
            Phi công hiện trường • {user?.phone_or_email ?? 'RoadGuard'}
          </Text>
        </View>
      </View>

      {/* KPI Metric Strip */}
      <Card style={styles.metricStripCard}>
        <View style={styles.metricMainRow}>
          <View style={styles.metricIconWrap}>
            <MaterialIcons name="flight-takeoff" size={24} color={colors.primary} />
          </View>
          <View style={styles.metricContent}>
            <Text style={[typography.headlineLg, styles.metricNumber]}>{tasks.length}</Text>
            <Text style={[typography.caption, styles.metricDesc]}>nhiệm vụ trong danh sách đã tải</Text>
            {hasMore ? <Text style={typography.caption}>Chỉ hiển thị trang đầu, chưa phải toàn bộ nhiệm vụ.</Text> : null}
            <Text style={[typography.caption, styles.metricSub]}>
              {urgentCount} chờ tiếp nhận • {ongoingCount} đang thực hiện
            </Text>
          </View>
        </View>

      </Card>

      {hasMore ? <Button title="Xem tiếp nhiệm vụ" variant="secondary" onPress={() => router.push('/(drone)/requests')} /> : null}

      {/* Quick Access Actions */}
      <View style={styles.quickAccessRow}>
        <AnimatedPressable
          style={styles.quickButton}
          onPress={() => router.push('/(drone)/requests')}
          accessibilityRole="button"
        >
          <MaterialIcons name="assignment" size={18} color={colors.primaryDark} />
          <Text style={[typography.labelSm, styles.quickButtonText]}>Nhiệm vụ</Text>
        </AnimatedPressable>

        <AnimatedPressable
          style={styles.quickButton}
          onPress={() => router.push('/(drone)/log')}
          accessibilityRole="button"
        >
          <MaterialIcons name="history" size={18} color={colors.primaryDark} />
          <Text style={[typography.labelSm, styles.quickButtonText]}>Nhật ký lệnh</Text>
        </AnimatedPressable>

        <AnimatedPressable
          style={styles.quickButton}
          onPress={() => router.push('/(drone)/sync')}
          accessibilityRole="button"
        >
          <MaterialIcons name="sync" size={18} color={colors.primaryDark} />
          <Text style={[typography.labelSm, styles.quickButtonText]}>Đồng bộ</Text>
        </AnimatedPressable>
      </View>

      {/* Section Tasks */}
      <View style={styles.sectionHeader}>
        <Text style={[typography.titleMd, styles.sectionTitle]}>Nhiệm vụ khảo sát</Text>
        <AnimatedPressable
          onPress={() => router.push('/(drone)/requests')}
          accessibilityRole="button"
          style={styles.seeAllPress}
        >
          <Text style={[typography.caption, styles.seeAll]}>Xem tất cả</Text>
          <MaterialIcons name="chevron-right" size={16} color={colors.primaryDark} />
        </AnimatedPressable>
      </View>

      {/* Tasks List */}
      {loadError ? <Text accessibilityRole="alert">{loadError} Danh sách đã tải vẫn được giữ trong phiên này.</Text> : null}
      {loading && tasks.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[typography.caption, styles.loadingText]}>Đang đọc nhiệm vụ khảo sát…</Text>
        </View>
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
          {tasks.slice(0, 5).map((task) => {
            const displayCode = operatorTaskDisplayCode(task.id);
            const statusLabel = operatorTaskStatusLabel(task.status);
            const totalSegments = task.scope?.reduce((acc, s) => acc + (s.segmentIds?.length ?? 0), 0) ?? 0;
            const targetBand = operatorTaskTargetBand(task);
            const s = task.status?.toUpperCase();
            const isOngoing = s === 'ACCEPTED' || s === 'IN_PROGRESS' || s === 'INPROGRESS';
            const isCompleted = s === 'COMPLETED';

            return (
              <AnimatedPressable
                key={task.id}
                onPress={() =>
                  router.push({
                    pathname: '/(drone)/request-detail',
                    params: { taskId: task.id, code: displayCode },
                  })
                }
                accessibilityRole="button"
              >
                <Card style={styles.taskCardItem}>
                  <View style={styles.taskContentBox}>
                    <View style={styles.taskBadgeRow}>
                      <Chip
                        variant={isCompleted ? 'approved' : isOngoing ? 'severity-medium' : 'status-pending'}
                        label={statusLabel}
                      />
                      <Text style={[typography.caption, styles.taskCodeText]}>{displayCode}</Text>
                    </View>

                    <Text style={[typography.titleMd, styles.taskTitleText]}>
                      Dải {targetBand} • {totalSegments} phân đoạn
                    </Text>
                    <Text style={[typography.caption, styles.taskSubtitleText]} numberOfLines={1}>
                      Dự án: {task.projectId.slice(0, 8).toUpperCase()}…
                    </Text>
                  </View>

                  <MaterialIcons name="chevron-right" size={20} color={colors.secondary} />
                </Card>
              </AnimatedPressable>
            );
          })}
        </View>
      )}
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  greetingHeader: {
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
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.secondary,
  },
  readyText: {
    color: colors.secondary,
  },
  metricStripCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
    ...softShadow,
  },
  metricMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  metricContent: {
    flex: 1,
  },
  metricNumber: {
    color: colors.neutral,
    lineHeight: 30,
  },
  metricDesc: {
    color: colors.secondary,
    fontWeight: '500',
  },
  metricSub: {
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
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  telemetryTag: {
    flexDirection: 'row',
    maxWidth: '100%',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  telemetryTagText: {
    color: colors.secondary,
    flexShrink: 1,
  },
  quickAccessRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  quickButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...softShadow,
  },
  quickButtonText: {
    textAlign: 'center',
    flexShrink: 1,
    color: colors.primaryDark,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.neutral,
  },
  seeAllPress: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAll: {
    color: colors.primaryDark,
    fontWeight: '600',
  },
  loadingContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    color: colors.secondary,
  },
  taskList: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  taskCardItem: {
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    paddingVertical: spacing.md,
    ...softShadow,
  },
  rail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  taskIconBox: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  taskContentBox: {
    flex: 1,
    minWidth: 0,
  },
  taskBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  taskCodeText: {
    color: colors.secondary,
    fontWeight: '500',
  },
  taskTitleText: {
    color: colors.neutral,
    marginBottom: 2,
  },
  taskSubtitleText: {
    color: colors.secondary,
  },
});

import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { Chip } from '../../src/components/Chip';
import { EmptyState } from '../../src/components/EmptyState';
import { AnimatedPressable } from '../../src/components/AnimatedPressable';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { useAuthStore } from '../../src/store/auth';
import { listOperatorSurveyTasksReal, type SurveyTaskV2ResponseDto } from '../../src/api/droneApi';
import { operatorTaskDisplayCode, operatorTaskStatusLabel } from '../../src/api/operator-task-view';

const softShadow = Platform.select({
  ios: { shadowColor: '#1A1D20', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  android: { elevation: 3 },
  default: {},
});

export default function DroneHomeScreen() {
  const user = useAuthStore((state) => state.user);
  const [tasks, setTasks] = useState<SurveyTaskV2ResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const page = await listOperatorSurveyTasksReal(null, 50);
      setTasks(page.items || []);
    } catch {
      setLoadError('Không thể tải danh sách nhiệm vụ. Vui lòng kiểm tra kết nối.');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchTasks();
    }, [fetchTasks]),
  );

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
          <Text style={[typography.headlineLg, styles.greetingName]}>
            Chào, {user?.full_name ? user.full_name.replace(/\s*\([^)]*\)/g, '').trim() : 'Kỹ thuật viên Drone'}
          </Text>
          <Text style={[typography.caption, styles.greetingMeta]}>
            Phi công hiện trường • {user?.phone_or_email ?? 'RoadGuard'}
          </Text>
        </View>
        <View style={styles.readyBadge}>
          <View style={styles.readyDot} />
          <Text style={[typography.labelSm, styles.readyText]}>Chưa xác nhận an toàn</Text>
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
            <Text style={[typography.caption, styles.metricDesc]}>nhiệm vụ khảo sát được gán</Text>
            <Text style={[typography.caption, styles.metricSub]}>
              {urgentCount} chờ tiếp nhận • {ongoingCount} đang thực hiện
            </Text>
          </View>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.telemetryStripRow}>
          <View style={styles.telemetryTag}>
            <MaterialIcons name="cloud-queue" size={15} color={colors.secondary} />
            <Text style={[typography.caption, styles.telemetryTagText]}>Thời tiết: Chưa có dữ liệu</Text>
          </View>
          <View style={styles.telemetryTag}>
            <MaterialIcons name="battery-unknown" size={15} color={colors.secondary} />
            <Text style={[typography.caption, styles.telemetryTagText]}>Thiết bị: Chưa có dữ liệu</Text>
          </View>
        </View>
      </Card>

      {/* Quick Access Actions */}
      <View style={styles.quickAccessRow}>
        <AnimatedPressable
          style={styles.quickButton}
          onPress={() => {
            const firstActive = ongoingTasks[0] || tasks[0];
            router.push({
              pathname: '/(drone)/upload',
              params: firstActive ? { code: operatorTaskDisplayCode(firstActive.id), taskId: firstActive.id } : {},
            });
          }}
          accessibilityRole="button"
        >
          <MaterialIcons name="sd-card" size={18} color={colors.primaryDark} />
          <Text style={[typography.labelSm, styles.quickButtonText]}>Nạp thẻ SD</Text>
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
        <Text style={[typography.titleMd, styles.sectionTitle]}>Việc cần làm</Text>
        <AnimatedPressable
          onPress={() => router.push('/(drone)/requests')}
          accessibilityRole="button"
          style={styles.seeAllPress}
        >
          <Text style={[typography.caption, styles.seeAll]}>Xem tất cả ({tasks.length})</Text>
          <MaterialIcons name="chevron-right" size={16} color={colors.primaryDark} />
        </AnimatedPressable>
      </View>

      {/* Tasks List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[typography.caption, styles.loadingText]}>Đang đọc nhiệm vụ khảo sát…</Text>
        </View>
      ) : loadError ? (
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
            const targetBand = task.scope?.[0]?.targetBand ?? '—';
            const s = task.status?.toUpperCase();
            const isPending = s === 'NEW_ASSIGNED' || s === 'NEWASSIGNED' || s === 'REASSIGNED';
            const isOngoing = s === 'ACCEPTED' || s === 'IN_PROGRESS' || s === 'INPROGRESS';

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
                  <View
                    style={[
                      styles.rail,
                      { backgroundColor: isPending ? colors.warning : isOngoing ? colors.primary : colors.success },
                    ]}
                  />

                  <View style={[styles.taskIconBox, { backgroundColor: colors.surfaceAlt }]}>
                    <MaterialIcons
                      name={isPending ? 'explore' : isOngoing ? 'flight-takeoff' : 'check-circle'}
                      size={20}
                      color={isPending ? colors.warning : isOngoing ? colors.primary : colors.success}
                    />
                  </View>

                  <View style={styles.taskContentBox}>
                    <View style={styles.taskBadgeRow}>
                      <Chip
                        variant={isPending ? 'status-pending' : isOngoing ? 'severity-medium' : 'approved'}
                        label={statusLabel}
                      />
                      <Text style={[typography.caption, styles.taskCodeText]}>{displayCode}</Text>
                    </View>

                    <Text style={[typography.titleMd, styles.taskTitleText]}>
                      Dải {targetBand} • {totalSegments} phân đoạn
                    </Text>
                    <Text style={[typography.caption, styles.taskSubtitleText]} numberOfLines={1}>
                      Dự án: {task.projectId.slice(0, 8).toUpperCase()}… • Bản: {task.version ?? '—'}
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
    alignItems: 'center',
    gap: spacing.sm,
  },
  telemetryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  telemetryTagText: {
    color: colors.secondary,
  },
  quickAccessRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  quickButton: {
    flex: 1,
    flexDirection: 'row',
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
    color: colors.primaryDark,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.neutral,
  },
  seeAllPress: {
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
    paddingLeft: spacing.lg,
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
  },
  taskBadgeRow: {
    flexDirection: 'row',
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

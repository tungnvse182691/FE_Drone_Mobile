import { useOperatorReadScope } from '../../src/hooks/useOperatorReadScope';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { Chip } from '../../src/components/Chip';
import { EmptyState } from '../../src/components/EmptyState';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { listOperatorSurveyTasksReal, type SurveyTaskV2ResponseDto } from '../../src/api/droneApi';
import { operatorTaskDisplayCode, operatorTaskStatusLabel } from '../../src/api/operator-task-view';
import { parseProblemDetails } from '../../src/api/problemDetails';
import { messageFor } from '../../src/api/errorCatalog';

const softShadow = Platform.select({
  ios: { shadowColor: '#1A1D20', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  android: { elevation: 3 },
  default: {},
});

type TabKey = 'pending' | 'ongoing' | 'completed' | 'other';

interface SurveyRequestItem {
  id: string;
  code: string;
  timeAgo: string;
  title: string;
  location: string;
  note: string;
  statusRaw: string;
  statusLabel: string;
  tab: TabKey;
  isCurrentTask?: boolean;
}

function classifyTab(status: string): TabKey {
  const s = status?.toUpperCase();
  if (s === 'NEW_ASSIGNED' || s === 'NEWASSIGNED' || s === 'REASSIGNED') return 'pending';
  if (s === 'ACCEPTED' || s === 'IN_PROGRESS' || s === 'INPROGRESS') return 'ongoing';
  if (s === 'COMPLETED') return 'completed';
  return 'other';
}

function mapDtoToItem(dto: SurveyTaskV2ResponseDto): SurveyRequestItem {
  const tab = classifyTab(dto.status);
  const totalSegments = dto.scope?.reduce((acc, s) => acc + (s.segmentIds?.length ?? 0), 0) ?? 0;
  const targetBand = dto.scope?.[0]?.targetBand ?? '—';
  const isOngoing = tab === 'ongoing';

  return {
    id: dto.id,
    code: operatorTaskDisplayCode(dto.id),
    timeAgo: 'Đã giao',
    title: `Khảo sát dải ${targetBand} • ${totalSegments} phân đoạn`,
    location: `Mã dự án: ${dto.projectId.slice(0, 8).toUpperCase()}…`,
    note: `Phiên bản: ${dto.version ?? '—'}`,
    statusRaw: dto.status,
    statusLabel: operatorTaskStatusLabel(dto.status),
    tab,
    isCurrentTask: isOngoing,
  };
}

export default function DroneRequestsScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const scope = useOperatorReadScope();
  const loadedScope = useRef<string | null>(null);
  const [dataScope, setDataScope] = useState<string | null>(null);
  const [tasks, setTasks] = useState<SurveyRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    const isCurrent = scope.capture();
    if (!isCurrent()) return;
    if (loadedScope.current !== scope.key) setTasks([]);
    loadedScope.current = scope.key;
    setDataScope(scope.key);
    setLoading(true);
    setError(null);
    try {
      const page = await listOperatorSurveyTasksReal(null, 50);
      if (!isCurrent()) return;
      const mapped = (page.items || []).map(mapDtoToItem);
      setTasks(mapped);
    } catch (err) {
      if (!isCurrent()) return;
      const data = (err as { response?: { data?: unknown } })?.response?.data;
      const code = parseProblemDetails(data).code;
      setError(code ? messageFor(code) : 'Không thể tải danh sách nhiệm vụ khảo sát.');

    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [scope.key, scope.capture]);

  useFocusEffect(
    useCallback(() => {
      void fetchTasks();
    }, [fetchTasks]),
  );

  if (!scope.key || dataScope !== scope.key) return <SafeAreaScreen><Text>Đang tải dữ liệu của phiên hiện tại…</Text></SafeAreaScreen>;

  const pendingCount = tasks.filter((r) => r.tab === 'pending').length;
  const ongoingCount = tasks.filter((r) => r.tab === 'ongoing').length;
  const completedCount = tasks.filter((r) => r.tab === 'completed').length;

  const filteredRequests = tasks.filter((item) => item.tab === activeTab);

  return (
    <SafeAreaScreen scroll header={<AppHeader subtitle="Trang chủ" />}>
      {/* Top Segmented Tabs: Yêu cầu mới ({pendingCount}) | Nhật ký */}
      <View style={styles.topTabContainer}>
        <Pressable style={[styles.topTabItem, styles.topTabItemActive]} accessibilityRole="button">
          <View style={styles.topTabTitleRow}>
            <Text style={styles.topTabTitleActive}>Yêu cầu mới</Text>
            <View style={styles.countBadgeActive}>
              <Text style={styles.countBadgeTextActive}>{pendingCount}</Text>
            </View>
          </View>
          <View style={styles.activeUnderline} />
        </Pressable>

        <Pressable
          style={styles.topTabItem}
          onPress={() => router.push('/(drone)/log')}
          accessibilityRole="button"
        >
          <Text style={styles.topTabTitleInactive}>Nhật ký</Text>
        </Pressable>
      </View>

      {/* 3 Tabs Filter Row */}
      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tabButton, activeTab === 'pending' && styles.tabButtonActive]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
            Chờ nhận ({pendingCount})
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tabButton, activeTab === 'ongoing' && styles.tabButtonActive]}
          onPress={() => setActiveTab('ongoing')}
        >
          <Text style={[styles.tabText, activeTab === 'ongoing' && styles.tabTextActive]}>
            Đang thực hiện ({ongoingCount})
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tabButton, activeTab === 'completed' && styles.tabButtonActive]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>
            Đã xong ({completedCount})
          </Text>
        </Pressable>
      </View>

      <Pressable onPress={() => setActiveTab('other')} accessibilityRole="button"><Text style={typography.caption}>Trạng thái khác ({tasks.filter(t => t.tab === 'other').length})</Text></Pressable>
      <Text style={typography.caption}>Số lượng theo danh sách đã tải, tối đa 50 nhiệm vụ.</Text>
      {/* Header Info Section */}
      <View style={styles.sectionHeader}>
        <Text style={[typography.labelSm, styles.sectionTitle]}>
          NHIỆM VỤ KHẢO SÁT ({filteredRequests.length})
        </Text>
        <Pressable style={styles.filterChip} onPress={() => void fetchTasks()}>
          <MaterialIcons name="refresh" size={14} color={colors.primary} />
          <Text style={[typography.caption, styles.filterChipText]}>Làm mới</Text>
        </Pressable>
      </View>

      {/* Content */}
      {error ? <Text accessibilityRole="alert">{error} Danh sách đã tải vẫn được giữ trong phiên này.</Text> : null}
      {loading && tasks.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[typography.caption, styles.loadingText]}>Đang tải danh sách nhiệm vụ…</Text>
        </View>
      ) : error && tasks.length === 0 ? (
        <EmptyState
          icon="error-outline"
          title="Không tải được nhiệm vụ"
          message={error}
          actionLabel="Thử lại"
          onAction={() => void fetchTasks()}
        />
      ) : filteredRequests.length === 0 ? (
        <EmptyState
          icon="flight-takeoff"
          title="Không có nhiệm vụ"
          message={
            activeTab === 'pending'
              ? 'Hiện tại không có nhiệm vụ mới đang chờ tiếp nhận.'
              : activeTab === 'ongoing'
                ? 'Không có nhiệm vụ nào đang trong quá trình thực hiện.'
                : 'Chưa có nhiệm vụ nào hoàn tất trong mục này.'
          }
          actionLabel="Tải lại"
          onAction={() => void fetchTasks()}
        />
      ) : (
        <View style={styles.listContainer}>
          {filteredRequests.map((item) => {
            const isOngoing = item.isCurrentTask;
            const isPending = item.tab === 'pending';
            const railColor = isPending
              ? colors.warning
              : isOngoing
                ? colors.primary
                : colors.success;

            return (
              <Pressable
                key={item.id}
                onPress={() =>
                  router.push({
                    pathname: '/(drone)/request-detail',
                    params: { taskId: item.id, code: item.code },
                  })
                }
                accessibilityRole="button"
              >
                <Card style={[styles.requestCard, isOngoing && styles.requestCardHighlight]}>
                  <View style={[styles.rail, { backgroundColor: railColor }]} />
                  {isOngoing && (
                    <View style={styles.floatingTaskBadge}>
                      <Text style={styles.floatingBadgeText}>ĐANG THỰC HIỆN</Text>
                    </View>
                  )}

                  <View style={styles.cardHeader}>
                    <View style={styles.metaRow}>
                      <Text style={[typography.caption, styles.codeText]}>{item.code}</Text>
                      <Text style={[typography.caption, styles.timeText]}>• {item.timeAgo}</Text>
                    </View>

                    {item.tab === 'pending' && (
                      <Chip variant="status-pending" label={item.statusLabel} />
                    )}
                    {item.tab === 'ongoing' && (
                      <Chip variant="severity-medium" label={item.statusLabel} />
                    )}
                    {item.tab === 'completed' && (
                      <Chip variant="approved" label={item.statusLabel} />
                    )}
                  </View>

                  <Text style={[typography.titleMd, styles.roadTitle]}>{item.title}</Text>

                  <View style={styles.locationRow}>
                    <MaterialIcons name="folder-open" size={16} color={colors.secondary} />
                    <Text style={[typography.bodyMd, styles.locationText]}>{item.location}</Text>
                  </View>

                  <View style={styles.cardFooter}>
                    <Text style={[typography.caption, styles.noteText]} numberOfLines={1}>
                      {item.note}
                    </Text>
                    <View style={styles.detailArrow}>
                      <Text style={[typography.labelSm, styles.detailLink]}>Chi tiết</Text>
                      <MaterialIcons name="arrow-forward" size={14} color={colors.primary} />
                    </View>
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </View>
      )}
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  topTabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.md,
  },
  topTabItem: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTabItemActive: {
    position: 'relative',
  },
  topTabTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  topTabTitleActive: {
    ...typography.labelLg,
    color: colors.primary,
  },
  topTabTitleInactive: {
    ...typography.bodyMd,
    color: colors.secondary,
  },
  countBadgeActive: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  countBadgeTextActive: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: 'bold',
  },
  activeUnderline: {
    position: 'absolute',
    bottom: -1,
    left: spacing.lg,
    right: spacing.lg,
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: 3,
    marginBottom: spacing.md,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.xs + 2,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  tabButtonActive: {
    backgroundColor: colors.surface,
    ...softShadow,
  },
  tabText: {
    ...typography.labelSm,
    color: colors.secondary,
  },
  tabTextActive: {
    color: colors.neutral,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.secondary,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
  },
  filterChipText: {
    color: colors.primary,
  },
  loadingContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    color: colors.secondary,
  },
  listContainer: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  requestCard: {
    position: 'relative',
    overflow: 'hidden',
    paddingLeft: spacing.lg,
  },
  requestCardHighlight: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  rail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  floatingTaskBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderBottomLeftRadius: radius.sm,
  },
  floatingBadgeText: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: 'bold',
    fontSize: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  codeText: {
    fontWeight: 'bold',
    color: colors.neutral,
  },
  timeText: {
    color: colors.secondary,
  },
  roadTitle: {
    color: colors.neutral,
    marginBottom: spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.sm,
  },
  locationText: {
    color: colors.secondary,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
  },
  noteText: {
    color: colors.secondary,
    flex: 1,
    marginRight: spacing.sm,
  },
  detailArrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailLink: {
    color: colors.primary,
  },
});

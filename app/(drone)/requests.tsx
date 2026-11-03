import { useOperatorTaskPages } from '../../src/hooks/useOperatorTaskPages';
import { Button } from '../../src/components/Button';
import React, { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { Chip } from '../../src/components/Chip';
import { EmptyState } from '../../src/components/EmptyState';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { type SurveyTaskV2ResponseDto } from '../../src/api/droneApi';
import { operatorTaskDisplayCode, operatorTaskStatusLabel, operatorTaskTargetBand } from '../../src/api/operator-task-view';

const softShadow = Platform.select({
  ios: { shadowColor: '#1A1D20', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  android: { elevation: 3 },
  default: {},
});

type TabKey = 'pending' | 'ongoing' | 'submitted' | 'supplement' | 'completed' | 'other';

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
  if (s === 'SUBMITTED') return 'submitted';
  if (s === 'SUPPLEMENT_REQUIRED' || s === 'SUPPLEMENTREQUIRED') return 'supplement';
  if (s === 'COMPLETED') return 'completed';
  return 'other';
}

function mapDtoToItem(dto: SurveyTaskV2ResponseDto): SurveyRequestItem {
  const tab = classifyTab(dto.status);
  const totalSegments = dto.scope?.reduce((acc, s) => acc + (s.segmentIds?.length ?? 0), 0) ?? 0;
  const targetBand = operatorTaskTargetBand(dto);
  const isOngoing = tab === 'ongoing';

  return {
    id: dto.id,
    code: operatorTaskDisplayCode(dto.id),
    timeAgo: 'Đã giao',
    title: `Khảo sát dải ${targetBand} • ${totalSegments} phân đoạn`,
    location: `Mã dự án: ${dto.projectId.slice(0, 8).toUpperCase()}…`,
    note: operatorTaskStatusLabel(dto.status),
    statusRaw: dto.status,
    statusLabel: operatorTaskStatusLabel(dto.status),
    tab,
    isCurrentTask: isOngoing,
  };
}

export default function DroneRequestsScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const pages = useOperatorTaskPages();
  const { loading, error } = pages;
  const tasks = pages.tasks.map(mapDtoToItem);
  const fetchTasks = pages.refresh;
  if (!pages.ready) return <SafeAreaScreen><Text>Đang tải dữ liệu của phiên hiện tại…</Text></SafeAreaScreen>;

  const pendingCount = tasks.filter((r) => r.tab === 'pending').length;
  const filters: { key: TabKey; label: string }[] = [
    { key: 'pending', label: 'Chờ nhận' },
    { key: 'ongoing', label: 'Đang thực hiện' },
    { key: 'submitted', label: 'Đã nộp' },
    { key: 'supplement', label: 'Cần bổ sung' },
    { key: 'completed', label: 'Hoàn tất' },
    { key: 'other', label: 'Trạng thái khác' },
  ];

  const filteredRequests = tasks.filter((item) => item.tab === activeTab);

  return (
    <SafeAreaScreen scroll header={<AppHeader subtitle="Nhiệm vụ khảo sát" />}>
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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
        {filters.map(filter => {
          const label = `${filter.label} (${tasks.filter(t => t.tab === filter.key).length})`;
          return <Pressable key={filter.key}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: activeTab === filter.key }}
            style={[styles.tabButton, activeTab === filter.key && styles.tabButtonActive]}
            onPress={() => setActiveTab(filter.key)}>
            <Text style={[styles.tabText, activeTab === filter.key && styles.tabTextActive]}>{label}</Text>
          </Pressable>;
        })}
      </ScrollView>

      <Text style={typography.caption}>Số lượng theo danh sách đã tải; các bộ lọc áp dụng trên những trang đã tải.</Text>
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
                : 'Không có nhiệm vụ thuộc trạng thái này trong các trang đã tải.'
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
                : item.tab === 'completed' ? colors.success : item.tab === 'supplement' ? colors.warning : colors.secondary;

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

                    <Chip
                      variant={item.tab === 'completed' ? 'approved' : item.tab === 'ongoing' ? 'severity-medium' : 'status-pending'}
                      label={item.statusLabel}
                      uppercase={false}
                    />
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
      {pages.nextCursor ? <Button title={error ? 'Thử lại tải thêm' : 'Tải thêm nhiệm vụ'} variant="secondary" disabled={loading} loading={loading} onPress={() => void pages.loadMore()} /> : !loading && !error ? <Text style={typography.caption}>Đã tải hết danh sách nhiệm vụ.</Text> : null}
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
    flexShrink: 0,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
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
    flexWrap: 'wrap',
    gap: spacing.xs,
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

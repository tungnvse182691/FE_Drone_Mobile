import { useOperatorTaskPages } from '../../src/hooks/useOperatorTaskPages';
import { Button } from '../../src/components/Button';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
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

type TabKey = 'pending' | 'ongoing' | 'submitted' | 'supplement' | 'completed' | 'other';

interface SurveyRequestItem {
  id: string;
  code: string;
  title: string;
  location: string;
  statusLabel: string;
  tab: TabKey;
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

  return {
    id: dto.id,
    code: operatorTaskDisplayCode(dto.id),
    title: `Khảo sát dải ${targetBand} • ${totalSegments} phân đoạn`,
    location: `Mã dự án: ${dto.projectId.slice(0, 8).toUpperCase()}…`,
    statusLabel: operatorTaskStatusLabel(dto.status),
    tab,
  };
}

export default function DroneRequestsScreen() {
  const [activeTab, setActiveTab] = useState<TabKey | 'all'>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const pages = useOperatorTaskPages();
  const { loading, error } = pages;
  const tasks = pages.tasks.map(mapDtoToItem);
  const fetchTasks = pages.refresh;
  if (!pages.ready) return <SafeAreaScreen><Text>Đang tải dữ liệu của phiên hiện tại…</Text></SafeAreaScreen>;

  const filters: { key: TabKey; label: string }[] = [
    { key: 'pending', label: 'Chờ nhận' },
    { key: 'ongoing', label: 'Đang thực hiện' },
    { key: 'submitted', label: 'Đã nộp' },
    { key: 'supplement', label: 'Cần bổ sung' },
    { key: 'completed', label: 'Hoàn tất' },
    { key: 'other', label: 'Trạng thái khác' },
  ];

  const availableFilters = filters.map(filter => ({ ...filter, count: tasks.filter(t => t.tab === filter.key).length }))
    .filter(filter => filter.count > 0);
  // A refresh or account switch can remove the selected state. Keep remaining tasks visible.
  const selectedFilter = availableFilters.find(filter => filter.key === activeTab);
  const selectedKey = selectedFilter?.key ?? 'all';
  const selectedLabel = selectedFilter?.label ?? 'Tất cả trạng thái';
  const filteredRequests = selectedKey === 'all' ? tasks : tasks.filter(item => item.tab === selectedKey);
  const options = [{ key: 'all' as const, label: 'Tất cả trạng thái', count: tasks.length }, ...availableFilters];

  return (
    <SafeAreaScreen scroll header={<AppHeader subtitle="Nhiệm vụ khảo sát" />}>
      <View style={styles.toolbar}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Lọc trạng thái: ${selectedLabel}`}
          accessibilityState={{ expanded: filterOpen }}
          onPress={() => setFilterOpen(open => !open)} style={styles.filterToggle}>
          <MaterialIcons name="filter-list" size={20} color={colors.secondary} />
          <Text style={styles.filterLabel}>{selectedLabel}</Text>
          <MaterialIcons name={filterOpen ? 'expand-less' : 'expand-more'} size={22} color={colors.secondary} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Làm mới nhiệm vụ"
          style={styles.iconButton} onPress={() => void fetchTasks()}>
          <MaterialIcons name="refresh" size={24} color={colors.secondary} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Nhật ký lệnh"
          style={styles.iconButton} onPress={() => router.push('/(drone)/log')}>
          <MaterialIcons name="history" size={24} color={colors.secondary} />
        </Pressable>
      </View>
      {filterOpen ? <View style={styles.filterMenu} accessibilityRole="radiogroup">
        {options.map(option => <Pressable key={option.key} accessibilityRole="radio"
          accessibilityLabel={`${option.label} (${option.count})`}
          accessibilityState={{ checked: selectedKey === option.key }}
          style={[styles.filterOption, selectedKey === option.key && styles.filterOptionSelected]}
          onPress={() => { setActiveTab(option.key); setFilterOpen(false); }}>
          <Text style={[styles.optionLabel, selectedKey === option.key && styles.optionLabelSelected]}>{option.label}</Text>
          <Text style={styles.optionCount}>{option.count}</Text>
          <MaterialIcons name={selectedKey === option.key ? 'radio-button-checked' : 'radio-button-unchecked'}
            size={20} color={selectedKey === option.key ? colors.primary : colors.secondary} />
        </Pressable>)}
      </View> : null}
      <Text style={[typography.caption, styles.resultSummary]}>
        {filteredRequests.length} nhiệm vụ · Trong {tasks.length} nhiệm vụ đã tải
      </Text>

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
            selectedKey === 'pending'
              ? 'Hiện tại không có nhiệm vụ mới đang chờ tiếp nhận.'
              : selectedKey === 'ongoing'
                ? 'Không có nhiệm vụ nào đang trong quá trình thực hiện.'
                : 'Không có nhiệm vụ thuộc trạng thái này trong các trang đã tải.'
          }
          actionLabel="Tải lại"
          onAction={() => void fetchTasks()}
        />
      ) : (
        <View style={styles.listContainer}>
          {filteredRequests.map((item) => {
            const isOngoing = item.tab === 'ongoing';
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
                accessibilityLabel={`Xem nhiệm vụ ${item.code}, ${item.statusLabel}`}
              >
                <Card style={styles.requestCard}>
                  <View style={[styles.rail, { backgroundColor: railColor }]} />
                  <View style={styles.cardHeader}>
                    <View style={styles.metaRow}>
                      <Text style={[typography.caption, styles.codeText]}>{item.code}</Text>
                    </View>

                    <Chip
                      variant={item.tab === 'completed' ? 'approved' : item.tab === 'supplement' ? 'severity-medium' : 'status-pending'}
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
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  filterToggle: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  filterLabel: {
    ...typography.labelSm,
    flex: 1,
    color: colors.neutral,
  },
  iconButton: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  filterMenu: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  filterOption: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterOptionSelected: { backgroundColor: colors.surfaceAlt },
  optionLabel: { ...typography.bodyMd, color: colors.neutral, flex: 1 },
  optionLabelSelected: { fontWeight: '600' },
  optionCount: { ...typography.caption, color: colors.secondary },
  resultSummary: { color: colors.secondary, marginVertical: spacing.sm },
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
  rail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
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
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
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

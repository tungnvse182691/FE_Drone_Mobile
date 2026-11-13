import { useOperatorTaskPages } from '../../src/hooks/useOperatorTaskPages';
import { Button } from '../../src/components/Button';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { OperatorTaskRow, OperatorTaskSkeleton } from '../../src/components/drone/OperatorTaskRow';
import { EmptyState } from '../../src/components/EmptyState';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { operatorTaskDisplayCode } from '../../src/api/operator-task-view';
import { operatorAppearance } from '../../src/components/drone/appearance';

type TabKey = 'pending' | 'ongoing' | 'submitted' | 'supplement' | 'completed' | 'other';

const FILTER_ICON: Record<TabKey | 'all', { name: React.ComponentProps<typeof MaterialIcons>['name']; color: string }> = {
  all: { name: 'filter-list', color: colors.secondary },
  pending: { name: 'schedule', color: colors.warning },
  ongoing: { name: 'flight-takeoff', color: colors.brandGold },
  submitted: { name: 'task-alt', color: colors.success },
  supplement: { name: 'error-outline', color: colors.warning },
  completed: { name: 'check-circle', color: colors.success },
  other: { name: 'help-outline', color: colors.secondary },
};

function classifyTab(status: string): TabKey {
  const s = status?.toUpperCase();
  if (s === 'NEW_ASSIGNED' || s === 'NEWASSIGNED' || s === 'REASSIGNED') return 'pending';
  if (s === 'ACCEPTED' || s === 'IN_PROGRESS' || s === 'INPROGRESS') return 'ongoing';
  if (s === 'SUBMITTED') return 'submitted';
  if (s === 'SUPPLEMENT_REQUIRED' || s === 'SUPPLEMENTREQUIRED') return 'supplement';
  if (s === 'COMPLETED') return 'completed';
  return 'other';
}

export default function DroneRequestsScreen() {
  const [activeTab, setActiveTab] = useState<TabKey | 'all'>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const pages = useOperatorTaskPages();
  const { loading, error } = pages;
  const tasks = pages.tasks.map(dto => ({ ...dto, tab: classifyTab(dto.status) }));
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
    <SafeAreaScreen scroll header={<AppHeader subtitle="Nhiệm vụ khảo sát" variant="operatorCompact" />}>
      <View style={styles.toolbar}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Lọc trạng thái: ${selectedLabel}`}
          accessibilityState={{ expanded: filterOpen }}
          onPress={() => setFilterOpen(open => !open)} style={styles.filterToggle}>
          <MaterialIcons name="filter-list" size={20} color={colors.secondary} />
          <Text style={styles.filterLabel}>{selectedLabel}</Text>
          <MaterialIcons name={filterOpen ? 'expand-less' : 'expand-more'} size={22} color={colors.secondary} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Làm mới nhiệm vụ"
          disabled={loading} accessibilityState={{ disabled: loading, busy: loading }}
          style={styles.iconButton} onPress={() => void fetchTasks()}>
          {loading ? <ActivityIndicator size="small" color={colors.brandGold} accessibilityLabel="Đang tải nhiệm vụ" /> : <MaterialIcons name="refresh" size={24} color={colors.secondary} />}
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
          <MaterialIcons name={FILTER_ICON[option.key].name} size={20} color={FILTER_ICON[option.key].color} />
          <Text style={[styles.optionLabel, selectedKey === option.key && styles.optionLabelSelected]}>{option.label}</Text>
          <Text style={styles.optionCount}>{option.count}</Text>
          <MaterialIcons name={selectedKey === option.key ? 'radio-button-checked' : 'radio-button-unchecked'}
            size={20} color={selectedKey === option.key ? colors.primary : colors.secondary} />
        </Pressable>)}
      </View> : null}
      <Text style={[typography.caption, styles.resultSummary]}>
        {selectedKey === 'all' ? `${tasks.length} nhiệm vụ đã tải` : `${filteredRequests.length} trong ${tasks.length} nhiệm vụ đã tải`}
      </Text>

      {/* Content */}
      {error && tasks.length > 0 ? <View style={styles.errorCard}><Text accessibilityRole="alert" style={styles.errorText}>{error}</Text></View> : null}
      {loading && tasks.length === 0 ? (
        <OperatorTaskSkeleton />
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
          {filteredRequests.map(item => <OperatorTaskRow key={item.id} task={item}
            onPress={() => router.push({ pathname: '/(drone)/request-detail', params: { taskId: item.id, code: operatorTaskDisplayCode(item.id) } })} />)}
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
    borderColor: operatorAppearance.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  filterLabel: {
    ...typography.bodyMd,
    flex: 1,
    color: colors.neutral,
  },
  iconButton: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  filterMenu: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: operatorAppearance.border,
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
  filterOptionSelected: { backgroundColor: operatorAppearance.pressed },
  optionLabel: { ...typography.bodyMd, color: colors.neutral, flex: 1 },
  optionLabelSelected: { fontWeight: '600' },
  optionCount: { ...typography.caption, color: colors.secondary },
  resultSummary: { color: colors.secondary, marginVertical: spacing.sm },
  errorCard: { ...operatorAppearance.card, padding: 12, marginBottom: 12 },
  errorText: { ...typography.bodyMd, color: colors.secondary },
  listContainer: { gap: 12, paddingBottom: 24 },
});

import { useOperatorTaskPages } from '../../src/hooks/useOperatorTaskPages';
import { Button } from '../../src/components/Button';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { AnimatedPressable } from '../../src/components/AnimatedPressable';
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

const STATUS_GROUP = { all: undefined, pending: 'WAITING', ongoing: 'IN_PROGRESS', submitted: 'SUBMITTED', supplement: 'SUPPLEMENT_REQUIRED', completed: 'COMPLETED', other: 'OTHER' } as const;

export default function DroneRequestsScreen() {
  const [activeTab, setActiveTab] = useState<TabKey | 'all'>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [search, setSearch] = useState(''), [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => { const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350); return () => clearTimeout(timer); }, [search]);
  const pages = useOperatorTaskPages({ statusGroup: STATUS_GROUP[activeTab], search: debouncedSearch });
  const { loading, error } = pages;
  const tasks = search.trim() === debouncedSearch ? pages.tasks : [];
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

  const selectedKey = activeTab;
  const selectedLabel = filters.find(filter => filter.key === activeTab)?.label ?? 'Tất cả trạng thái';
  const filteredRequests = tasks;
  const options = [{ key: 'all' as const, label: 'Tất cả trạng thái' }, ...filters];

  return (
    <SafeAreaScreen scroll header={<AppHeader subtitle="Nhiệm vụ khảo sát" variant="operatorCompact" />}>
      <View style={styles.controls}>
      <View style={styles.toolbar}>
        <AnimatedPressable android_ripple={{ color: operatorAppearance.pressed }} accessibilityRole="button" accessibilityLabel={`Lọc trạng thái: ${selectedLabel}`}
          accessibilityState={{ expanded: filterOpen }}
          onPress={() => setFilterOpen(open => !open)} style={styles.filterToggle}>
          <MaterialIcons name="filter-list" size={20} color={colors.secondary} />
          <Text style={styles.filterLabel}>{selectedLabel}</Text>
          <MaterialIcons name={filterOpen ? 'expand-less' : 'expand-more'} size={22} color={colors.secondary} />
        </AnimatedPressable>
        <AnimatedPressable android_ripple={{ color: operatorAppearance.pressed }} accessibilityRole="button" accessibilityLabel="Làm mới nhiệm vụ"
          disabled={loading} accessibilityState={{ disabled: loading, busy: loading }}
          style={styles.iconButton} onPress={() => void fetchTasks()}>
          {loading ? <ActivityIndicator size="small" color={colors.brandGold} accessibilityLabel="Đang tải nhiệm vụ" /> : <MaterialIcons name="refresh" size={24} color={colors.secondary} />}
        </AnimatedPressable>
        <AnimatedPressable android_ripple={{ color: operatorAppearance.pressed }} accessibilityRole="button" accessibilityLabel="Nhật ký lệnh"
          style={styles.iconButton} onPress={() => router.push('/(drone)/log')}>
          <MaterialIcons name="history" size={24} color={colors.secondary} />
        </AnimatedPressable>
      </View>
      {filterOpen ? <View style={styles.filterMenu} accessibilityRole="radiogroup">
        {options.map(option => <AnimatedPressable key={option.key} pressedScale={0.995} android_ripple={{ color: operatorAppearance.pressed }} accessibilityRole="radio"
          accessibilityLabel={option.label}
          accessibilityState={{ checked: selectedKey === option.key }}
          style={[styles.filterOption, selectedKey === option.key && styles.filterOptionSelected]}
          onPress={() => { setActiveTab(option.key); setFilterOpen(false); }}>
          <MaterialIcons name={FILTER_ICON[option.key].name} size={20} color={FILTER_ICON[option.key].color} />
          <Text style={[styles.optionLabel, selectedKey === option.key && styles.optionLabelSelected]}>{option.label}</Text>
          <MaterialIcons name={selectedKey === option.key ? 'radio-button-checked' : 'radio-button-unchecked'}
            size={20} color={selectedKey === option.key ? colors.primary : colors.secondary} />
        </AnimatedPressable>)}
      </View> : null}
      <TextInput value={search} onChangeText={setSearch} maxLength={100} autoCapitalize="none"
        accessibilityLabel="Tìm tên dự án hoặc ID nhiệm vụ" placeholder="Tên dự án hoặc ID nhiệm vụ" placeholderTextColor={colors.secondary}
        style={[typography.bodyMd, { minHeight: 48, color: colors.neutral, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: 12 }]} />
      <Text style={[typography.caption, styles.resultSummary]}>
        {`${tasks.length} nhiệm vụ đã tải trong bộ lọc này`}
      </Text>
      </View>

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
                : 'Không có nhiệm vụ khớp bộ lọc và tìm kiếm hiện tại.'
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
      {search.trim() === debouncedSearch && pages.nextCursor ? <Button style={styles.loadMore} icon={<MaterialIcons name="expand-more" size={20} color={colors.secondary} />} title={error ? 'Thử lại tải thêm' : 'Tải thêm nhiệm vụ'} variant="secondary" disabled={loading} loading={loading} onPress={() => void pages.loadMore()} /> : !loading && !error ? <Text style={[typography.caption, styles.endOfList]}>Đã tải hết danh sách nhiệm vụ.</Text> : null}
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  controls: { gap: 12, marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#DCE2E7' },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  filterToggle: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: '#C7D0D8',
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  filterLabel: {
    ...typography.bodyMd,
    flex: 1,
    color: '#192D40',
    lineHeight: 22,
  },
  iconButton: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#DCE2E7', backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' },
  filterMenu: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
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
  filterOptionSelected: { backgroundColor: '#F7F0DA' },
  optionLabel: { ...typography.bodyMd, color: colors.neutral, flex: 1 },
  optionLabelSelected: { fontWeight: '600' },
  optionCount: { ...typography.caption, color: '#526170', fontVariant: ['tabular-nums'], minWidth: 24, textAlign: 'right' },
  resultSummary: { color: '#526170', lineHeight: 18 },
  loadMore: { alignSelf: 'center', maxWidth: '100%', borderRadius: radius.full, borderColor: operatorAppearance.border, backgroundColor: operatorAppearance.pressed, marginBottom: spacing.md },
  endOfList: { color: colors.secondary, textAlign: 'center', paddingBottom: spacing.md },
  errorCard: { ...operatorAppearance.card, padding: 12, marginBottom: 12 },
  errorText: { ...typography.bodyMd, color: colors.secondary },
  listContainer: { gap: 12, paddingBottom: 24 },
});

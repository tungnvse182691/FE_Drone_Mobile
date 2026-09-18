import React, { ComponentProps, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { Chip } from '../../src/components/Chip';
import { EmptyState } from '../../src/components/EmptyState';
import { FAB } from '../../src/components/FAB';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

type ChipVariant = ComponentProps<typeof Chip>['variant'];

type TaskSegment = 'active' | 'done';

interface CrewTask {
  title: string;
  distance: string;
  chip: ChipVariant;
  chipLabel: string;
  code?: string;
  completedAt?: string;
}

export const CREW_TASKS: CrewTask[] = [
  {
    code: '#WO-118',
    title: 'Trám vá ổ gà sâu 7cm — Km1842+150 QL1A',
    distance: 'Cách 450m',
    chip: 'severity-high',
    chipLabel: 'Nghiêm trọng',
  },
  {
    code: '#WO-116',
    title: 'Xử lý nứt lưới & sụt lún taluy — ĐT.743B',
    distance: 'Cách 1.8 km',
    chip: 'severity-medium',
    chipLabel: 'Trung bình',
  },
  {
    code: '#WO-114',
    title: 'Bù lún mố cầu Suối Cả — Tỉnh lộ 769',
    distance: 'Cách 3.5 km',
    chip: 'severity-medium',
    chipLabel: 'Trung bình',
  },
  {
    code: '#WO-109',
    title: 'Sơn dặm vạch kẻ đường phản quang — Vành Đai 3',
    distance: 'Cách 5.2 km',
    chip: 'severity-low',
    chipLabel: 'Thấp',
  },
];

const CREW_COMPLETED_TASKS: CrewTask[] = [
  {
    code: '#WO-115',
    title: 'Trám vá ổ gà rải rác — Km1841+900 QL1A',
    distance: 'Cách 200m',
    chip: 'approved',
    chipLabel: 'Đã nghiệm thu',
    completedAt: '10/09/2026',
  },
  {
    code: '#WO-112',
    title: 'Bù lún mặt đường đầu cầu — Cầu Suối Cả, TL769',
    distance: 'Cách 3.5 km',
    chip: 'approved',
    chipLabel: 'Đã nghiệm thu',
    completedAt: '05/09/2026',
  },
  {
    code: '#WO-108',
    title: 'Sửa chữa hằn lún vệt bánh xe — Km1840+300 QL1A',
    distance: 'Cách 900m',
    chip: 'approved',
    chipLabel: 'Đã nghiệm thu',
    completedAt: '28/08/2026',
  },
  {
    code: '#WO-105',
    title: 'Xử lý nứt lưới mặt đường bê tông — ĐT.743B',
    distance: 'Cách 1.8 km',
    chip: 'approved',
    chipLabel: 'Đã nghiệm thu',
    completedAt: '20/08/2026',
  },
  {
    code: '#WO-102',
    title: 'Sơn dặm hoàn thiện vạch kẻ phản quang — Vành Đai 3',
    distance: 'Cách 5.2 km',
    chip: 'approved',
    chipLabel: 'Đã nghiệm thu',
    completedAt: '15/08/2026',
  },
];

const SEGMENTS: { key: TaskSegment; label: string; count: number }[] = [
  { key: 'active', label: 'Đang làm', count: CREW_TASKS.length },
  { key: 'done', label: 'Hoàn thành', count: CREW_COMPLETED_TASKS.length },
];

export default function CrewTasksScreen() {
  const [segment, setSegment] = useState<TaskSegment>('active');

  const list = segment === 'active' ? CREW_TASKS : CREW_COMPLETED_TASKS;

  return (
    <View style={styles.screen}>
      <SafeAreaScreen scroll header={<AppHeader subtitle="Công việc" />}>
        <View style={styles.segments}>
          {SEGMENTS.map((s) => {
            const active = s.key === segment;
            return (
              <Pressable
                key={s.key}
                style={[styles.segment, active && styles.segmentActive]}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => setSegment(s.key)}
              >
                <Text style={[typography.labelSm, active ? styles.segmentLabelActive : styles.segmentLabel]}>
                  {s.label} ({s.count})
                </Text>
              </Pressable>
            );
          })}
        </View>

        {list.length === 0 ? (
          <EmptyState
            icon="checkmark-circle-outline"
            title="Chưa có công việc hoàn thành"
            message="Danh sách sẽ được cập nhật khi có nghiệm thu."
          />
        ) : (
          list.map((task) => (
            <Pressable key={task.code ?? task.title} onPress={() => router.push('/(crew)/wo-detail')} accessibilityRole="button">
              <Card style={styles.taskCard}>
                <View style={styles.taskHeader}>
                  <View style={styles.taskMetaRow}>
                    <Chip variant={task.chip} label={task.chipLabel} />
                    {task.code ? (
                      <Text style={[typography.labelSm, styles.taskCode]}>{task.code}</Text>
                    ) : null}
                    <View style={styles.taskDistRow}>
                      <Ionicons name="navigate-outline" size={14} color={colors.secondary} />
                      <Text style={[typography.caption, styles.taskDist]}>{task.distance}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.secondary} />
                </View>
                <Text style={[typography.titleMd, styles.taskTitle]}>{task.title}</Text>
                {task.completedAt ? (
                  <View style={styles.taskDateRow}>
                    <Ionicons name="checkmark-circle-outline" size={14} color={colors.success} />
                    <Text style={[typography.caption, styles.taskDate]}>Nghiệm thu {task.completedAt}</Text>
                  </View>
                ) : null}
              </Card>
            </Pressable>
          ))
        )}
      </SafeAreaScreen>

      <FAB icon="add" onPress={() => router.push('/(crew)/report-defect')} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  segments: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: colors.primary,
  },
  segmentLabel: {
    color: colors.secondary,
  },
  segmentLabelActive: {
    color: colors.onPrimary,
  },
  taskCard: {
    marginBottom: spacing.sm,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  taskDistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  taskDist: {
    color: colors.secondary,
  },
  taskTitle: {
    color: colors.neutral,
    marginTop: spacing.sm,
  },
  taskCode: {
    color: colors.secondary,
  },
  taskDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  taskDate: {
    color: colors.success,
  },
});
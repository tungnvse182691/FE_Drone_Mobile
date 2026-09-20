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
    title: 'Đổ bù ổ gà vỡ tấm sâu 7cm — Km02+150 Tuyến ĐH.05',
    distance: 'Cách 450m',
    chip: 'severity-high',
    chipLabel: 'Nghiêm trọng',
  },
  {
    code: '#WO-116',
    title: 'Sửa chữa bể mép tấm bê tông — Km03+120 Tuyến ĐH.01',
    distance: 'Cách 1.8 km',
    chip: 'severity-medium',
    chipLabel: 'Trung bình',
  },
  {
    code: '#WO-114',
    title: 'Gia cố lún sụt mố cầu — Km04+800 Tuyến ĐH.01',
    distance: 'Cách 3.5 km',
    chip: 'severity-medium',
    chipLabel: 'Trung bình',
  },
  {
    code: '#WO-109',
    title: 'Đắp bù lề đường xói lở bảo vệ mép tấm — Km01+450 Tuyến NT-08',
    distance: 'Cách 5.2 km',
    chip: 'severity-low',
    chipLabel: 'Thấp',
  },
];

const CREW_COMPLETED_TASKS: CrewTask[] = [
  {
    code: '#WO-115',
    title: 'Xử lý vũng lún đọng nước mặt bê tông — Km02+900 Tuyến ĐH.05',
    distance: 'Cách 200m',
    chip: 'approved',
    chipLabel: 'Đã nghiệm thu',
    completedAt: '10/09/2026',
  },
  {
    code: '#WO-112',
    title: 'Bù phẳng mặt tấm đầu cầu lún sụt — Km03+400 Tuyến NT-08',
    distance: 'Cách 3.5 km',
    chip: 'approved',
    chipLabel: 'Đã nghiệm thu',
    completedAt: '05/09/2026',
  },
  {
    code: '#WO-108',
    title: 'Bơm keo trám nứt gãy xuyên tấm BTXM — Km01+300 Tuyến ĐX.12',
    distance: 'Cách 900m',
    chip: 'approved',
    chipLabel: 'Đã nghiệm thu',
    completedAt: '28/08/2026',
  },
  {
    code: '#WO-105',
    title: 'Gia cố khe co giãn tiếp giáp tấm bê tông — Tuyến ĐH.01',
    distance: 'Cách 1.8 km',
    chip: 'approved',
    chipLabel: 'Đã nghiệm thu',
    completedAt: '20/08/2026',
  },
  {
    code: '#WO-102',
    title: 'Đắp gia cố lề đất K95 chống sụt mép — Tuyến NT-08',
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
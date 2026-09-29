import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { Chip, type ChipVariant } from '../../src/components/Chip';
import { EmptyState } from '../../src/components/EmptyState';
import { FAB } from '../../src/components/FAB';
import { DEFECT_TYPE_CODES, defectTypeLabel, type DefectTypeCode } from '../../src/constants/defect-types';
import { TaskMode } from '../../src/types/enums';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

type TaskSegment = 'active' | 'done';

export interface CrewTask {
  id: string;
  wo_code: string;
  title: string;
  task_mode: TaskMode;
  defect_type_code: DefectTypeCode;
  route_code: string;
  section_name: string;
  chainage: string;
  locality: string;
  due_label: string;
  due_urgency: 'normal' | 'urgent';
  distance_label: string;
  defect_location: string;
  description: string;
  repair_method: string;
  safety_note: string;
  batch_size: number;
  coordinates: { latitude: number; longitude: number };
  completedAt?: string;
}

export const CREW_TASKS: CrewTask[] = [
  {
    id: 'task-wo-01',
    wo_code: '#WO-01',
    title: 'Đổ bù ổ gà sâu vỡ tấm bê tông Km02+150',
    task_mode: TaskMode.INSPECT_AND_REPAIR,
    defect_type_code: DEFECT_TYPE_CODES.POTH_DEEP,
    route_code: 'ĐH.05',
    section_name: 'Cầu Bà Lát',
    chainage: 'Km02+150',
    locality: 'Xã Bình Chánh, TP. Hồ Chí Minh',
    due_label: 'Hạn 17:00 hôm nay',
    due_urgency: 'urgent',
    distance_label: 'Cách 450m',
    defect_location: 'Làn xe cơ giới hướng Bắc',
    description:
      'Ổ gà sâu làm lộ và vỡ mặt tấm bê tông trên làn xe cơ giới, nước và bùn đọng gây trơn trượt.',
    repair_method:
      'Đục tẩy toàn bộ mảng bê tông vỡ vụn, xịt rửa sạch bụi cát, quét lớp hồ dầu xi măng liên kết trước khi đổ bê tông.',
    safety_note:
      'Đặt biển cảnh báo công trường và chóp nón giao thông cách 50m hướng đi trung tâm huyện Bình Chánh.',
    batch_size: 1,
    coordinates: { latitude: 10.783, longitude: 106.7001 },
  },
  {
    id: 'task-wo-02',
    wo_code: '#WO-02',
    title: 'Khảo sát đợt gom nứt tấm bê tông Km01+850',
    task_mode: TaskMode.MEASURE_ONLY,
    defect_type_code: DEFECT_TYPE_CODES.SLAB_CRK,
    route_code: 'ĐH.05',
    section_name: 'Vĩnh Lộc B',
    chainage: 'Km01+850',
    locality: 'Xã Bình Chánh, TP. Hồ Chí Minh',
    due_label: 'Hạn 12:00 hôm nay',
    due_urgency: 'urgent',
    distance_label: 'Cách 1.8 km',
    defect_location: 'Sát mép tảm phía tải trọng',
    description:
      'Nứt tấm bê tông lan rộng dọc mép tảm, nước đọng lại sau mưa, nguy cơ vỡ hở khi xe tải trọng đi qua.',
    repair_method:
      'Chỉ đo đạc hiện trường và gửi số đo về PM. Không tự ý sửa chữa tại chỗ trong đợt gom này.',
    safety_note:
      'Quan sát từ vai xe, đánh dấu mốc đo bằng sơn kẻ, không đứng trong vùng nước đọng.',
    batch_size: 5,
    coordinates: { latitude: 10.7875, longitude: 106.705 },
  },
  {
    id: 'task-wo-03',
    wo_code: '#WO-03',
    title: 'Kiểm tra xói lở vai đường Km03+100',
    task_mode: TaskMode.INSPECT_AND_REPAIR,
    defect_type_code: DEFECT_TYPE_CODES.SHLD_EROS,
    route_code: 'ĐH.05',
    section_name: 'Tân Kiên',
    chainage: 'Km03+100',
    locality: 'Xã Bình Chánh, TP. Hồ Chí Minh',
    due_label: 'Hạn 16:30 hôm nay',
    due_urgency: 'normal',
    distance_label: 'Cách 3.2 km',
    defect_location: 'Vai đường phía Đông',
    description:
      'Xói lở vai đường lan rộng sau mưa lớn, đất bị cuốn trôi xuống dưới taluy âm.',
    repair_method:
      'Đo chiều dài, chiều rộng và độ sâu phần xói lở. Nếu vượt ngưỡng quy định sửa nhanh thì gửi số đo về PM để lập phương án.',
    safety_note:
      'Mang đầy đủ thiết bị bảo hộ, kiểm tra độ ổn định của bờ taluy trước khi vào hiện trường.',
    batch_size: 1,
    coordinates: { latitude: 10.7712, longitude: 106.7218 },
  },
];

export const CREW_COMPLETED_TASKS: CrewTask[] = [
  {
    id: 'task-wo-04',
    wo_code: '#WO-04',
    title: 'Xử lý lún võng đọng nước mặt bê tông Km02+900',
    task_mode: TaskMode.INSPECT_AND_REPAIR,
    defect_type_code: DEFECT_TYPE_CODES.DEPR_POND,
    route_code: 'ĐH.05',
    section_name: 'Tân Kiên',
    chainage: 'Km02+900',
    locality: 'Xã Bình Chánh, TP. Hồ Chí Minh',
    due_label: 'Đã nghiệm thu 10/09/2026',
    due_urgency: 'normal',
    distance_label: 'Cách 200m',
    defect_location: 'Làn ngoài cùng hướng Tân Kiên',
    description: 'Lún võng đọng nước trên mặt tấm bê tông đoạn Km02+900.',
    repair_method: 'Đã hoàn thành theo phương án được PM duyệt.',
    safety_note: 'Đã thu dọn biển cảnh báo sau nghiệm thu.',
    batch_size: 1,
    coordinates: { latitude: 10.7761, longitude: 106.7127 },
    completedAt: '10/09/2026',
  },
  {
    id: 'task-wo-05',
    wo_code: '#WO-05',
    title: 'Gia cố khe co giãn tiếp giáp tấm bê tông Km00+400',
    task_mode: TaskMode.INSPECT_AND_REPAIR,
    defect_type_code: DEFECT_TYPE_CODES.EDGE_BRK,
    route_code: 'ĐH.05',
    section_name: 'Vĩnh Lộc B',
    chainage: 'Km00+400',
    locality: 'Xã Bình Chánh, TP. Hồ Chí Minh',
    due_label: 'Đã nghiệm thu 05/09/2026',
    due_urgency: 'normal',
    distance_label: 'Cách 1.8 km',
    defect_location: 'Mép tảm phía Tây',
    description: 'Vỡ mép tấm bê tông tại khe co giãn Km00+400.',
    repair_method: 'Đã hoàn thành theo phương án được PM duyệt.',
    safety_note: 'Đã thu dọn biển cảnh báo sau nghiệm thu.',
    batch_size: 1,
    coordinates: { latitude: 10.7902, longitude: 106.6884 },
    completedAt: '05/09/2026',
  },
];

export const DEFAULT_CREW_TASK_ID = CREW_TASKS[0].id;

export function getCrewTaskById(id?: string | null): CrewTask {
  return CREW_TASKS.find((task) => task.id === id) ?? CREW_TASKS[0];
}

export type TaskModeFilter = 'ALL' | 'INSPECT_AND_REPAIR' | 'MEASURE_ONLY';

export const TASK_MODE_FILTERS: { key: TaskModeFilter; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'INSPECT_AND_REPAIR', label: 'Đo & Sửa nhanh' },
  { key: 'MEASURE_ONLY', label: 'Chỉ đo đợt' },
];

export const TASK_MODE_CHIP: Record<TaskMode, { variant: ChipVariant; label: string }> = {
  INSPECT_AND_REPAIR: { variant: 'fast-track', label: 'Đo & Sửa nhanh' },
  MEASURE_ONLY: { variant: 'measure-only', label: 'Chỉ đo đợt' },
  INSPECT_ONLY: { variant: 'status-pending', label: 'Chỉ kiểm tra' },
};

const SEGMENTS: { key: TaskSegment; label: string; count: number }[] = [
  { key: 'active', label: 'Đang làm', count: CREW_TASKS.length },
  { key: 'done', label: 'Hoàn thành', count: CREW_COMPLETED_TASKS.length },
];

export default function CrewTasksScreen() {
  const [segment, setSegment] = useState<TaskSegment>('active');
  const [modeFilter, setModeFilter] = useState<TaskModeFilter>('ALL');

  const list =
    segment === 'active'
      ? CREW_TASKS.filter((task) => modeFilter === 'ALL' || task.task_mode === modeFilter)
      : CREW_COMPLETED_TASKS;

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

        {segment === 'active' ? (
          <View style={styles.modeFilters}>
            {TASK_MODE_FILTERS.map((filter) => {
              const active = filter.key === modeFilter;
              return (
                <Pressable
                  key={filter.key}
                  style={[styles.modeFilter, active && styles.modeFilterActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setModeFilter(filter.key)}
                >
                  <Text
                    style={[
                      typography.caption,
                      active ? styles.modeFilterLabelActive : styles.modeFilterLabel,
                    ]}
                  >
                    {filter.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {list.length === 0 ? (
          <EmptyState
            icon="check-circle"
            title="Không có công việc trong bộ lọc này"
            message="Chuyển sang bộ lọc khác để xem danh sách công việc."
          />
        ) : (
          list.map((task) => {
            const modeChip = TASK_MODE_CHIP[task.task_mode];
            return (
              <Pressable
                key={task.id}
                onPress={() =>
                  router.push({ pathname: '/(crew)/wo-detail', params: { id: task.id } })
                }
                accessibilityRole="button"
              >
                <Card style={styles.taskCard}>
                  <View style={styles.taskHeader}>
                    <View style={styles.taskMetaRow}>
                      {task.completedAt ? (
                        <Chip variant="approved" label="Đã nghiệm thu" />
                      ) : (
                        <Chip variant={modeChip.variant} label={modeChip.label} uppercase={false} />
                      )}
                    </View>
                    <View style={styles.taskDistRow}>
                      <MaterialIcons name="navigation" size={14} color={colors.secondary} />
                      <Text style={[typography.caption, styles.taskDist]}>{task.distance_label}</Text>
                    </View>
                  </View>

                  <Text style={[typography.titleMd, styles.taskTitle]}>{task.title}</Text>

                  <View style={styles.taskRouteRow}>
                    <MaterialIcons name="alt-route" size={13} color={colors.secondary} />
                    <Text style={[typography.caption, styles.taskRoute]}>
                      Tuyến {task.route_code} • {task.section_name} • {task.chainage}
                    </Text>
                  </View>

                  <View style={styles.taskDefectRow}>
                    <Text style={[typography.caption, styles.taskDefect]}>
                      {defectTypeLabel(task.defect_type_code)}
                    </Text>
                    {task.batch_size > 1 ? (
                      <Text style={[typography.caption, styles.taskBatch]}>
                        Đợt gom {task.batch_size} vị trí
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.taskFooter}>
                    <MaterialIcons
                      name={task.due_urgency === 'urgent' ? 'alarm' : 'access-time'}
                      size={13}
                      color={task.due_urgency === 'urgent' ? colors.error : colors.secondary}
                    />
                    <Text
                      style={[
                        typography.caption,
                        task.due_urgency === 'urgent' ? styles.taskDueUrgent : styles.taskDue,
                      ]}
                    >
                      {task.due_label}
                    </Text>
                    <MaterialIcons name="chevron-right" size={16} color={colors.secondary} style={styles.taskChevron} />
                  </View>
                </Card>
              </Pressable>
            );
          })
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
    marginBottom: spacing.md,
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
  modeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  modeFilter: {
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  modeFilterActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(201,162,39,0.12)',
  },
  modeFilterLabel: {
    color: colors.secondary,
  },
  modeFilterLabelActive: {
    color: colors.primaryDark,
    fontFamily: 'Roboto-Medium',
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
  taskRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  taskRoute: {
    flex: 1,
    color: colors.secondary,
  },
  taskDefectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  taskDefect: {
    color: colors.neutral,
  },
  taskBatch: {
    color: colors.warning,
  },
  taskFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  taskDue: {
    flex: 1,
    color: colors.secondary,
  },
  taskDueUrgent: {
    flex: 1,
    color: colors.error,
  },
  taskChevron: {
    marginLeft: spacing.xs,
  },
});

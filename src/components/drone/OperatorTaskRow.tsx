import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Card } from '../Card';
import { operatorAppearance } from './appearance';
import { colors, typography } from '../../design-tokens';
import type { SurveyTaskV2ResponseDto } from '../../api/droneApi';
import { operatorTaskDisplayCode, operatorTaskStatusLabel, operatorTaskTargetBand } from '../../api/operator-task-view';

interface OperatorTaskRowProps {
  task: SurveyTaskV2ResponseDto;
  onPress: () => void;
}

// Operator-only palette: unknown wire values remain neutral, never successful.
export function operatorTaskVisual(status: string) {
  const key = status?.replace(/_/g, '').toUpperCase();
  if (['NEWASSIGNED', 'REASSIGNED', 'SUPPLEMENTREQUIRED', 'POSTPONED'].includes(key))
    return { rail: colors.warning, background: '#FEF3E2', ink: colors.primaryDark };
  if (key === 'COMPLETED') return { rail: colors.success, background: '#E9F7EC', ink: colors.secondary };
  if (['REJECTED', 'CANCELLED'].includes(key)) return { rail: colors.error, background: '#FDECEC', ink: colors.secondary };
  if (['ACCEPTED', 'INPROGRESS'].includes(key)) return { rail: colors.brandGold, background: '#FEF3E2', ink: colors.primaryDark };
  return { rail: colors.secondary, background: colors.surfaceAlt, ink: colors.secondary };
}

// Presentation only: status and scope remain sourced from the assigned task DTO.
export function OperatorTaskRow({ task, onPress }: OperatorTaskRowProps) {
  const label = operatorTaskStatusLabel(task.status);
  const code = operatorTaskDisplayCode(task.id);
  const segments = task.scope?.reduce((count, scope) => count + (scope.segmentIds?.length ?? 0), 0) ?? 0;
  const status = task.status?.toUpperCase();
  const ongoing = ['ACCEPTED', 'IN_PROGRESS', 'INPROGRESS'].includes(status);
  const visual = operatorTaskVisual(task.status);
  const icon = status === 'COMPLETED' ? 'check-circle-outline'
    : status === 'SUBMITTED' ? 'task-alt'
    : ['SUPPLEMENT_REQUIRED', 'SUPPLEMENTREQUIRED'].includes(status) ? 'error-outline'
    : ['ACCEPTED', 'IN_PROGRESS', 'INPROGRESS'].includes(status) ? 'flight-takeoff' : 'schedule';

  return <Pressable onPress={onPress} style={styles.touch}
    android_ripple={{ color: operatorAppearance.pressed }}
    accessibilityRole="button" accessibilityLabel={`Xem nhiệm vụ ${code}, ${label}`}>
    <Card style={{ ...styles.card, borderLeftWidth: 4, borderLeftColor: visual.rail }}>
      {ongoing ? <Text testID="operator-current-task" style={styles.currentTask}>NHIỆM VỤ HIỆN TẠI</Text> : null}
      <View style={styles.heading}>
        <Text style={styles.title}>Khảo sát {operatorTaskTargetBand(task)}</Text>
        <MaterialIcons name="chevron-right" size={20} color={colors.secondary} />
      </View>
      <View style={[styles.status, { backgroundColor: visual.background }]}>
        <View testID="operator-status-dot" style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: visual.rail }} />
        <MaterialIcons name={icon} size={16} color={visual.ink} />
        <Text style={[styles.statusText, { color: visual.ink }]}>{label}</Text>
      </View>
      <View style={styles.metadata}>
        <Text style={styles.metaText}>{segments} phân đoạn</Text>
        <Text style={styles.metaText}>Mã {code}</Text>
      </View>
    </Card>
  </Pressable>;
}

export function OperatorTaskSkeleton() {
  return <View accessibilityRole="progressbar" accessibilityLabel="Đang tải nhiệm vụ" style={styles.skeletonGroup}>
    {[0, 1].map(key => <View key={key} style={styles.skeletonCard}>
      <View style={styles.skeletonTitle} /><View style={styles.skeletonLine} />
    </View>)}
  </View>;
}

const styles = StyleSheet.create({
  touch: { minHeight: 48, borderRadius: 12, overflow: 'hidden' },
  currentTask: { ...typography.labelSm, color: colors.secondary },
  card: { ...operatorAppearance.card, padding: 16, gap: 8 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { ...typography.titleMd, lineHeight: 24, color: colors.neutral, flex: 1, minWidth: 0 },
  status: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999, backgroundColor: colors.surfaceAlt, maxWidth: '100%' },
  statusText: { ...typography.caption, lineHeight: 18, color: colors.secondary, flexShrink: 1 },
  metadata: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  metaText: { ...typography.caption, lineHeight: 18, color: colors.secondary },
  skeletonGroup: { gap: 12 },
  skeletonCard: { borderRadius: 12, padding: 16, gap: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  skeletonTitle: { width: '70%', height: 24, borderRadius: 4, backgroundColor: colors.border },
  skeletonLine: { width: '45%', height: 18, borderRadius: 4, backgroundColor: colors.border },
});

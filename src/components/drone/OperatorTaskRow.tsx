import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable } from '../AnimatedPressable';
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

  return <AnimatedPressable onPress={onPress} style={styles.touch} pressedScale={0.985}
    android_ripple={{ color: operatorAppearance.pressed }}
    accessibilityRole="button" accessibilityLabel={`Xem nhiệm vụ ${code}, ${label}`}>
    <Card style={styles.card}>
      <View style={styles.body}>
      <View style={styles.metadata}>
        <Text style={styles.code}>Mã {code}</Text>
        {ongoing ? <Text testID="operator-current-task" style={styles.currentTask}>NHIỆM VỤ HIỆN TẠI</Text> : null}
      </View>
      <View style={styles.heading}>
        <Text style={styles.title}>Khảo sát {operatorTaskTargetBand(task)}</Text>
        <MaterialIcons name="chevron-right" size={22} color="#192D40" accessible={false} />
      </View>
      </View>
      <View style={styles.footer}>
      <View style={[styles.status, { backgroundColor: visual.background }]}>
        <View testID="operator-status-dot" style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: visual.rail }} />
        <MaterialIcons name={icon} size={16} color={visual.ink} />
        <Text style={[styles.statusText, { color: visual.ink }]}>{label}</Text>
      </View>
      <View style={styles.segmentGroup}>
        <MaterialIcons name="route" size={16} color="#526170" accessible={false} />
        <Text style={styles.metaText}>{segments} phân đoạn</Text>
      </View>
      </View>
    </Card>
  </AnimatedPressable>;
}

export function OperatorTaskSkeleton() {
  return <View accessibilityRole="progressbar" accessibilityLabel="Đang tải nhiệm vụ" style={styles.skeletonGroup}>
    {[0, 1].map(key => <View key={key} style={styles.skeletonCard}>
      <View style={styles.skeletonTitle} /><View style={styles.skeletonLine} />
    </View>)}
  </View>;
}

const styles = StyleSheet.create({
  touch: { minHeight: 48, borderRadius: 16, overflow: 'hidden' },
  currentTask: { ...typography.labelSm, color: colors.primaryDark, lineHeight: 18, flexShrink: 1 },
  card: { ...operatorAppearance.card, borderRadius: 16, borderColor: '#DCE2E7', padding: 0, overflow: 'hidden' },
  body: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  footer: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#F3F5F6', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  segmentGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { ...typography.titleMd, fontWeight: '500', lineHeight: 24, color: '#192D40', flex: 1, minWidth: 0 },
  status: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999, backgroundColor: colors.surfaceAlt, maxWidth: '100%' },
  statusText: { ...typography.caption, lineHeight: 18, color: colors.secondary, flexShrink: 1 },
  metadata: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  code: { ...typography.caption, fontFamily: 'Roboto-Medium', fontVariant: ['tabular-nums'], lineHeight: 18, color: '#192D40', backgroundColor: '#F3F5F6', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  metaText: { ...typography.caption, lineHeight: 18, color: '#526170' },
  skeletonGroup: { gap: 12 },
  skeletonCard: { borderRadius: 12, padding: 16, gap: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  skeletonTitle: { width: '70%', height: 24, borderRadius: 4, backgroundColor: colors.border },
  skeletonLine: { width: '45%', height: 18, borderRadius: 4, backgroundColor: colors.border },
});

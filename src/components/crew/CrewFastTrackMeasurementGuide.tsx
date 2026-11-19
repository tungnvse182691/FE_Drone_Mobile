import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../design-tokens';
import type { FieldMeasurementInput, RepairEligibilityReadView } from '../../api/crewApi';
import { readAssignedFastTrackEligibility } from '../../api/crewFastTrackEligibility';
import { currentQueueIdentity, sameQueueIdentity, type QueueIdentity } from '../../offline/upload-queue';
import { CrewContentTransition, CrewPressable } from './CrewMotion';

type Measurement = Pick<FieldMeasurementInput, 'type' | 'value' | 'unit'>;
type Props = { projectId: string; taskId: string; measurement: Measurement };
const keepActual = 'Giữ số đo thực tế. Máy chủ xác nhận điều kiện sửa nhanh khi đánh giá và bắt đầu thi công.';
const unknown = { range: null, message: 'Chưa xác định ngưỡng sửa nhanh từ chính sách hiện tại.' };

// Shift decimal digits for display only; avoid floating-point boundary rounding.
function shiftedDecimal(value: number, shift: number) {
  const [coefficient, exponent = '0'] = String(value).split('e');
  const [whole, fraction = ''] = coefficient.split('.');
  const digits = whole + fraction;
  const point = whole.length + Number(exponent) + shift;
  const decimal = point <= 0 ? `0.${'0'.repeat(-point)}${digits}` : point >= digits.length ? digits + '0'.repeat(point - digits.length) : `${digits.slice(0, point)}.${digits.slice(point)}`;
  return decimal.replace(/^0+(?=\d)/, '').replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '').replace('.', ',');
}

export function measurementPolicyDisplayRange(view: RepairEligibilityReadView, measurement: Measurement) {
  const original = measurementPolicyGuide(view, measurement).range;
  if (!original) return null;
  const rule = view.rules!.find(candidate => candidate.code === measurement.type)!;
  const powers: Record<string, number> = {mm: 0, cm: 1, m: 3};
  if (!Object.prototype.hasOwnProperty.call(powers, rule.unit) || !Object.prototype.hasOwnProperty.call(powers, measurement.unit)) return original;
  const shift = powers[rule.unit] - powers[measurement.unit];
  return `${shiftedDecimal(rule.minimum, shift)}–${shiftedDecimal(rule.maximum, shift)} ${measurement.unit}`;
}

/** Presentation only: never grants execution authority or modifies measurements. */
export function measurementPolicyGuide(view: RepairEligibilityReadView, measurement: Measurement): {range: string | null; message: string; notApplicable?: boolean} {
  if (view.policyState !== 'CONFIGURED' || !view.policyRevisionId || !view.policyContentHash ||
      view.missingReasons.some(reason => reason === 'PINNED_POLICY_SOURCE_MISMATCH' || reason === 'POLICY_UNAVAILABLE') ||
      !Array.isArray(view.rules) || !view.rules.length) return unknown;
  const codes = new Set<string>();
  for (const rule of view.rules) {
    if (!rule || typeof rule.code !== 'string' || !rule.code.trim() || codes.has(rule.code) ||
        typeof rule.unit !== 'string' || !rule.unit.trim() || rule.unit.length > 16 ||
        !Number.isFinite(rule.minimum) || !Number.isFinite(rule.maximum) ||
        rule.minimum < 0 || rule.maximum < rule.minimum) return unknown;
    codes.add(rule.code);
  }
  const rule = view.rules.find(candidate => candidate.code === measurement.type);
  // Absence in a validated policy is not a read failure or a measurement error.
  if (!rule) return {range:null, message:'', notApplicable:true};
  // Preserve all server decimal digits; do not round a threshold into a different boundary.
  const number = (value: number) => String(value).replace('.', ',');
  const range = `${number(rule.minimum)}–${number(rule.maximum)} ${rule.unit}`;
  if (measurement.unit !== rule.unit) return {range, message:`Chính sách dùng ${rule.unit}; số đo đang dùng ${measurement.unit}. Cần đối chiếu đúng đơn vị, không tự quy đổi.`};
  if (measurement.value === null || !Number.isFinite(measurement.value)) return {range, message:'Nhập số đo thực tế để đối chiếu khoảng này.'};
  if (measurement.value < rule.minimum || measurement.value > rule.maximum) return {range, message:'Số đo đang ngoài khoảng sửa nhanh. Vẫn lưu số đo thực tế để đánh giá.'};
  return {range, message:'Trong khoảng số đo; chưa xác nhận đủ điều kiện thi công.'};
}

export function CrewFastTrackMeasurementGuide(props: Props) {
  const identity = currentQueueIdentity();
  if (!identity || identity.role !== 'REPAIR_CREW') return null;
  return <MeasurementPolicyRead key={JSON.stringify([identity, props.projectId, props.taskId])} {...props} identity={identity}/>;
}

function MeasurementPolicyRead({identity, projectId, taskId, measurement}: Props & {identity: QueueIdentity}) {
  const [expanded, setExpanded] = useState(false);
  const [view, setView] = useState<RepairEligibilityReadView | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const sequence = useRef(0), inFlight = useRef(false);
  const read = async () => {
    if (inFlight.current || !sameQueueIdentity(identity)) return;
    const request = ++sequence.current;
    inFlight.current = true; setView(null); setState('loading');
    try {
      const result = await readAssignedFastTrackEligibility(identity, projectId, taskId);
      if (sequence.current === request && sameQueueIdentity(identity)) {setView(result.eligibility); setState('ready');}
    } catch {
      if (sequence.current === request && sameQueueIdentity(identity)) setState('error');
    } finally {
      if (sequence.current === request) inFlight.current = false;
    }
  };
  useEffect(() => {
    void read();
    return () => {sequence.current++; inFlight.current = false;};
    // The keyed parent remounts for a new task/identity. Typing must not refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity.actor, identity.role, identity.environment, identity.scope, identity.partition, projectId, taskId]);
  const guide = view && sameQueueIdentity(identity) ? measurementPolicyGuide(view, measurement) : null;
  const displayRange = view && guide?.range ? measurementPolicyDisplayRange(view, measurement) : null;
  if (state === 'ready' && guide?.notApplicable) return null;
  return <View style={styles.panel}>
    <CrewPressable accessibilityRole="button" accessibilityLabel="Chi tiết ngưỡng sửa nhanh" accessibilityState={{expanded}} onPress={()=>setExpanded(value=>!value)} style={styles.heading}>
      <MaterialIcons name="info-outline" size={18} color={colors.primaryDark}/><Text style={styles.title}>Ngưỡng sửa nhanh</Text>{displayRange?<Text style={styles.range}>{displayRange}</Text>:null}<MaterialIcons name={expanded?'expand-less':'expand-more'} size={20} color={colors.primaryDark}/>
    </CrewPressable>
    {!guide?.range||expanded?<CrewContentTransition ready={state !== 'loading'}>
      <View style={styles.content} accessibilityLiveRegion="polite">
        {!guide?.range||expanded?<Text style={styles.message}>{state === 'loading' ? 'Đang đọc ngưỡng theo nhiệm vụ…' : state === 'error' ? 'Chưa đọc được chính sách. Chưa xác định ngưỡng sửa nhanh.' : guide?.message ?? unknown.message}</Text>:null}
      </View>
    </CrewContentTransition>:null}
    {expanded?<CrewContentTransition ready><View style={styles.details}>{guide?.range?<Text style={styles.caption}>{displayRange!==guide.range?`Quy đổi để đối chiếu · chính sách gốc: ${guide.range}. `:''}Khoảng cho phép theo chính sách nhiệm vụ · gồm cả hai mốc</Text>:null}<Text style={styles.caption}>{keepActual}</Text></View></CrewContentTransition>:null}
    {state === 'error' || (state === 'ready' && !guide?.range)?<CrewPressable accessibilityRole="button" accessibilityLabel="Đọc lại ngưỡng sửa nhanh" onPress={()=>void read()} style={({pressed})=>[styles.retry,pressed&&styles.pressed]}><MaterialIcons name="refresh" size={18} color={colors.primaryDark}/><Text style={styles.retryText}>Đọc lại chính sách</Text></CrewPressable>:null}
  </View>;
}

const styles = StyleSheet.create({
  panel:{paddingHorizontal:spacing.sm,borderRadius:12,borderWidth:1,borderColor:'#E8D9A8',backgroundColor:'#FBF8EE'},
  heading:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:spacing.sm,minHeight:48,paddingVertical:spacing.sm},
  details:{gap:spacing.sm,paddingBottom:spacing.sm},
  title:{...typography.labelLg,color:colors.primaryDark,flex:1},
  content:{gap:spacing.xs,paddingBottom:spacing.sm},
  range:{...typography.labelLg,color:colors.primaryDark,flexShrink:1},
  message:{...typography.bodyMd,color:colors.secondary},
  caption:{...typography.caption,color:colors.secondary},
  retry:{minHeight:48,flexDirection:'row',alignItems:'center',alignSelf:'flex-start',gap:spacing.sm,paddingHorizontal:spacing.sm,borderRadius:8},
  retryText:{...typography.labelLg,color:colors.primaryDark,flexShrink:1},
  pressed:{backgroundColor:'#F1E8CA'},
});

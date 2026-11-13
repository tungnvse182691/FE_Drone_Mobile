import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../Button';
import { colors, spacing, typography } from '../../design-tokens';
import { currentQueueIdentity, sameQueueIdentity, type QueueIdentity } from '../../offline/upload-queue';
import { readAssignedFastTrackEligibility } from '../../api/crewFastTrackEligibility';

const reasonLabels: Record<string,string> = {
  ASSESSMENT_REQUIRED:'Cần đánh giá số đo trước sửa',
  ASSESSMENT_SOURCE_OR_LOCATION_UNVERIFIED:'Cần xác nhận nguồn số đo và vị trí',
  CURRENT_EXECUTION_AUTHORITY_DENIED:'Phân công hiện tại chưa cho phép thi công',
  TEST_ONLY_SOURCE_NOT_EXECUTABLE:'Nguồn thử nghiệm chưa cho phép thi công',
  ROAD_HANDOVER_MAPPING_UNKNOWN:'Chưa xác nhận bàn giao tuyến đường',
  POLICY_UNAVAILABLE:'Chưa có chính sách sửa nhanh hợp lệ',
  PINNED_POLICY_SOURCE_MISMATCH:'Chính sách đã thay đổi, cần kiểm tra lại',
  FIRST_START_NOT_VERIFIED:'Chưa xác nhận thời điểm bắt đầu nhiệm vụ',
  EXECUTION_WINDOW_EXPIRED:'Đã hết thời gian cho phép sửa nhanh',
  STOP_CONDITION_OBSERVATION_UNKNOWN:'Cần kiểm tra điều kiện an toàn trước sửa',
};

export function CrewFastTrackEligibility({projectId,taskId}:{projectId:string;taskId:string}) {
  const identity=currentQueueIdentity();
  if(!identity||identity.role!=='REPAIR_CREW')return null;
  return <EligibilityRead key={JSON.stringify([identity,projectId,taskId])} identity={identity} projectId={projectId} taskId={taskId} />;
}
function EligibilityRead({identity,projectId,taskId}:{identity:QueueIdentity;projectId:string;taskId:string}) {
  const stamp=JSON.stringify(identity);
  const sequence=useRef(0),inFlight=useRef(false);
  const [busy,setBusy]=useState(false),[technical,setTechnical]=useState(false),[error,setError]=useState('');
  const [saved,setSaved]=useState<{stamp:string;result:Awaited<ReturnType<typeof readAssignedFastTrackEligibility>>}|null>(null);
  useEffect(()=>()=>{sequence.current++;},[]);
  const read=async()=>{
    if(!identity||inFlight.current)return;
    const request=++sequence.current;inFlight.current=true;setBusy(true);setSaved(null);setError('');setTechnical(false);
    try {
      const result=await readAssignedFastTrackEligibility(identity,projectId,taskId);
      if(sequence.current===request&&sameQueueIdentity(identity))setSaved({stamp,result});
    } catch {
      if(sequence.current===request&&sameQueueIdentity(identity))setError('Chưa đọc được điều kiện hiện tại. Tải lại để kiểm tra.');
    } finally {
      inFlight.current=false;
      if(sequence.current===request)setBusy(false);
    }
  };
  const view=saved?.stamp===stamp?saved.result.eligibility:null;
  const labels=view?[...new Set(view.missingReasons.map(reason=>reasonLabels[reason]??'Còn điều kiện máy chủ chưa xác nhận'))]:[];
  return <View style={styles.group}>
    <Button variant="secondary" title="Kiểm tra điều kiện sửa nhanh" loading={busy} disabled={busy} onPress={()=>void read()} />
    {error?<Text style={styles.hint} accessibilityLiveRegion="polite">{error}</Text>:null}
    {view?<View style={styles.result}>
      <Text style={typography.labelLg}>{view.eligible?'Máy chủ xác nhận đủ điều kiện':'Chưa đủ điều kiện sửa nhanh'}</Text>
      {labels.map(label=><Text key={label} style={styles.hint}>{label}</Text>)}
      <Button variant="text" title={technical?'Ẩn chi tiết nguồn':'Chi tiết nguồn kiểm tra'} onPress={()=>setTechnical(value=>!value)} />
      {technical?<View style={styles.group}><Text selectable style={styles.hint}>Phiên bản điều kiện: {view.version}</Text>{view.missingReasons.map((reason,index)=><Text key={index} selectable style={styles.hint}>{reason}</Text>)}</View>:null}
    </View>:null}
  </View>;
}
const styles=StyleSheet.create({
  group:{gap:spacing.sm},
  result:{gap:spacing.sm,padding:spacing.md,borderRadius:12,backgroundColor:colors.surfaceAlt},
  hint:{...typography.bodyMd,color:colors.secondary,flexShrink:1},
});

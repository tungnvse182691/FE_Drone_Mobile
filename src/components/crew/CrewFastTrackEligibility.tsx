import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Button } from '../Button';
import { colors, spacing, typography } from '../../design-tokens';
import { currentQueueIdentity, sameQueueIdentity, type QueueIdentity } from '../../offline/upload-queue';
import { readAssignedFastTrackEligibility } from '../../api/crewFastTrackEligibility';

import { useRouter } from 'expo-router';
import { currentFieldContext, openFieldRuntime, loadFieldDraft } from '../../api/crewFieldDraft';
import { fastTrackDraftIssues, fastTrackReason, type DraftIssue } from '../../api/crewFastTrackFeedback';

export function FastTrackDraftChecklist({issues,onOpen}:{issues:DraftIssue[];onOpen:(issue:DraftIssue)=>void}) {
  return <View style={styles.group} accessibilityLiveRegion="polite">
    <Text style={typography.labelLg}>Nháp còn thiếu gì</Text>
    <Text style={styles.hint}>Chỉ kiểm tra nháp trên máy; chưa phải đánh giá hoặc quyền thi công từ máy chủ.</Text>
    {issues.length?issues.map((issue,index)=><Pressable key={index} accessibilityRole="button" accessibilityLabel={`Bổ sung: ${issue.message}`} onPress={()=>onOpen(issue)} style={styles.disclosure}><Text style={[styles.hint,styles.flex]}>• {issue.message}</Text><MaterialIcons name="chevron-right" size={22} color={colors.secondary}/></Pressable>):<Text style={styles.hint}>Đã nhập các mục kiểm tra cục bộ. Máy chủ tiếp tục kiểm tra nguồn, vị trí, chính sách và quyền.</Text>}
  </View>;
}

export function CrewFastTrackEligibility({projectId,taskId}:{projectId:string;taskId:string}) {
  const identity=currentQueueIdentity();
  if(!identity||identity.role!=='REPAIR_CREW')return null;
  return <EligibilityRead key={JSON.stringify([identity,projectId,taskId])} identity={identity} projectId={projectId} taskId={taskId} />;
}
function EligibilityRead({identity,projectId,taskId}:{identity:QueueIdentity;projectId:string;taskId:string}) {
  const router=useRouter();
  const [localIssues,setLocalIssues]=useState<DraftIssue[]|null>(null);
  const [localError,setLocalError]=useState('');
  const openIssue=(issue:DraftIssue)=>{if(sameQueueIdentity(identity))router.push({pathname:'/(crew)/field-review',params:{id:taskId,projectId,section:issue.section,...(issue.sampleId?{sampleId:issue.sampleId}:{})}});};
  const stamp=JSON.stringify(identity);
  const sequence=useRef(0),inFlight=useRef(false);
  const [busy,setBusy]=useState(false),[technical,setTechnical]=useState(false),[error,setError]=useState('');
  const [saved,setSaved]=useState<{stamp:string;result:Awaited<ReturnType<typeof readAssignedFastTrackEligibility>>}|null>(null);
  useEffect(()=>()=>{sequence.current++;},[]);
  const read=async()=>{
    if(!identity||inFlight.current)return;
    const request=++sequence.current;inFlight.current=true;setBusy(true);setSaved(null);setError('');setTechnical(false);setLocalIssues(null);setLocalError('');
    try {
      const result=await readAssignedFastTrackEligibility(identity,projectId,taskId);
      if(sequence.current!==request||!sameQueueIdentity(identity))return;
      setSaved({stamp,result});
      try {
        const context=currentFieldContext(projectId,taskId);
        if(!context||context.actor!==identity.actor||context.scope!==identity.scope||context.environment!==identity.environment)throw Error('field_session_changed');
        const draft=await loadFieldDraft(context,await openFieldRuntime(context));
        if(sequence.current===request&&sameQueueIdentity(identity))setLocalIssues(fastTrackDraftIssues(draft,result.task,result.eligibility));
      } catch {if(sequence.current===request&&sameQueueIdentity(identity))setLocalError('Chưa đọc được đúng nháp của phiên này. Mở hồ sơ để khôi phục/đối soát; không dùng nháp của phiên khác.');}
    } catch {
      if(sequence.current===request&&sameQueueIdentity(identity))setError('Chưa đọc được điều kiện hiện tại. Tải lại để kiểm tra.');
    } finally {
      inFlight.current=false;
      if(sequence.current===request)setBusy(false);
    }
  };
  const view=saved?.stamp===stamp?saved.result.eligibility:null;
  const labels=view?view.missingReasons.map(fastTrackReason):[];
  return <View style={styles.group}>
    <Button variant="secondary" title="Kiểm tra điều kiện sửa nhanh" loading={busy} disabled={busy} onPress={()=>void read()} />
    {localIssues?<FastTrackDraftChecklist issues={localIssues} onOpen={openIssue}/>:null}
    {localError?<Text style={styles.hint}>{localError}</Text>:null}
    {error?<Text style={styles.hint} accessibilityLiveRegion="polite">{error}</Text>:null}
    {view?<View style={[styles.result,view.eligible?styles.success:styles.warning]} accessibilityLiveRegion="polite">
      <View style={styles.heading}><MaterialIcons name={view.eligible?'check-circle':'info-outline'} size={24} color={view.eligible?'#166534':'#92400E'}/><View style={styles.flex}>
        <Text style={typography.labelLg}>{view.eligible?'Kết quả kiểm tra máy chủ':'Điều kiện máy chủ chưa xác nhận'}</Text><Text style={typography.labelLg}>{view.eligible?'Đủ điều kiện sửa nhanh':'Chưa thể sửa nhanh'}</Text>
        <Text style={styles.hint}>{view.eligible?'Điều kiện sẽ được kiểm tra lại khi bắt đầu.':`${labels.length} điều kiện cần được xác nhận.`}</Text>
      </View></View>
      {!view.eligible?<>
        <Pressable accessibilityRole="button" accessibilityLabel="Điều kiện còn thiếu" accessibilityState={{expanded:technical}} style={styles.disclosure} onPress={()=>setTechnical(value=>!value)}><Text style={typography.labelLg}>{technical?'Ẩn mã chẩn đoán':'Xem mã chẩn đoán'}</Text><MaterialIcons name={technical?'expand-less':'expand-more'} size={22} color={colors.secondary}/></Pressable>
        <View style={styles.group}>{labels.map(label=><View key={label.code} style={styles.heading}><MaterialIcons name="remove" size={18} color="#92400E"/><Text style={[styles.hint,styles.flex]}>{label.owner==='crew'?'Hồ sơ Crew: ':'Quản lý/nguồn máy chủ: '}{label.message}</Text></View>)}</View>
        <Text style={styles.hint}>Hành động tiếp theo: bổ sung nháp qua từng mục phía trên; điều kiện thuộc quản lý phải được xác nhận từ hệ thống.</Text>
        {technical?<Text style={styles.hint}>{labels.map(label=>label.code).join(', ')}</Text>:null}
      </>:null}
    </View>:null}
  </View>;
}
const styles=StyleSheet.create({
  group:{gap:spacing.sm},
  result:{gap:spacing.sm,padding:spacing.md,borderRadius:12,backgroundColor:colors.surfaceAlt},
  heading:{flexDirection:'row',alignItems:'flex-start',gap:spacing.sm},
  flex:{flex:1,minWidth:0},
  warning:{backgroundColor:'#FFFBEB',borderLeftWidth:3,borderLeftColor:'#D97706'},
  success:{backgroundColor:'#F0FDF4',borderLeftWidth:3,borderLeftColor:'#16A34A'},
  disclosure:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:spacing.sm,minHeight:48,paddingVertical:spacing.sm},
  hint:{...typography.bodyMd,color:colors.secondary,flexShrink:1},
});

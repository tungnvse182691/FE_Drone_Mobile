import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { CrewPressable } from '../../src/components/crew/CrewMotion';
import type { CrewRepairAttempt, CrewTask } from '../../src/api/crewApi';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { CrewTaskBoundary,useCrewIdentity } from './tasks';

import { currentRepairIdentity, sameRepairIdentity, type RepairJournalRecord, type RepairIdentity } from '../../src/api/crewRepairDraft';
import { readRepairHistory, repairErrorMessage } from '../../src/api/crewRepairWorkflow';

/** API-080 verifies current assignment/session even for a direct link to C-08.
 * No GPS/WO gate: this screen reads only. Task status is not PM review proof.
 */
export default function CrewRepairCorrectionScreen() {
  return <CrewTaskBoundary operational={false}>{task => <CorrectionReadOnly task={task} />}</CrewTaskBoundary>;
}

export function CorrectionReadOnly({ task }: { task: CrewTask }) {
  const [technical, setTechnical] = useState(false);
  const review = repairReviewPresentation(task.detail?.repairContext?.attempt);
  const accepted=task.detail?.repairContext?.attempt?.review?.decision==='ACCEPT';
  const tone=accepted?'#166534':review.canSupplement?'#9A3412':colors.secondary;
  return <SafeAreaScreen scroll header={<AppHeader subtitle="Kết quả hồ sơ sửa chữa" showBack onBack={()=>router.back()} />}>
    <View style={{gap:spacing.md}}>
    <Card style={styles.summary}>
      <View style={[styles.badge,{backgroundColor:accepted?'#E8F5E9':review.canSupplement?'#FFF0E8':colors.surfaceAlt}]}>
        <MaterialIcons name={accepted?'check-circle':review.canSupplement?'edit-note':'schedule'} size={20} color={tone}/>
        <Text style={[styles.badgeLabel,{color:tone}]}>{review.statusLabel}</Text>
      </View>
      <Text accessibilityRole="header" style={styles.title}>{review.title}</Text>
      <Text style={styles.body}>{review.message}</Text>
      <View style={styles.taskInfo}>
        <Text style={styles.hint}>Nhiệm vụ liên quan</Text>
        <View style={styles.identity}><Text selectable style={styles.code}>{task.wo_code||`ID nhiệm vụ: ${task.id.slice(0,8)}`}</Text></View>
        <Text style={styles.body}>{task.title||'Nhiệm vụ hiện trường'}</Text>
      </View>
      {review.canSupplement?<Button variant="primary" title="Gửi bổ sung" onPress={() => router.push({
        pathname: '/(crew)/field-review', params: { id: task.id, projectId: task.projectId, supplement: '1' },
      })} />:null}
    </Card>
    <View style={styles.history}>
      <CrewPressable accessibilityRole="button" accessibilityLabel="Lịch sử và thông tin kỹ thuật" accessibilityState={{expanded:technical}} onPress={()=>setTechnical(value=>!value)} style={({pressed})=>[styles.disclosure,pressed&&styles.pressed]}>
        <MaterialIcons name="history" size={22} color={colors.secondary}/>
        <Text style={[styles.sectionTitle,styles.flex]}>Lịch sử và thông tin kỹ thuật</Text>
        <MaterialIcons name={technical?'expand-less':'expand-more'} size={22} color={colors.secondary}/>
      </CrewPressable>
      {technical?<View style={styles.historyContent}>
        {review.technical ? <View style={styles.technical}><Text selectable style={styles.hint}>Mã lượt: {review.technical.attemptId}</Text><Text selectable style={styles.hint}>Bản nộp hiệu lực: {review.technical.effectiveSubmissionId}</Text></View> : null}
        <CrewRepairReceiptHistory task={task}/>
      </View>:null}
    </View>
      <CrewRepairRecoveryEntry task={task}/>
    </View>
  </SafeAreaScreen>;
}

/** Entry point for an already durable API-159 command; it never creates or sends a new command. */
export function CrewRepairRecoveryEntry({task}:{task:CrewTask}) {
  const identity=useCrewIdentity(),live=currentRepairIdentity(task.projectId,task.id);
  const [recovery,setRecovery]=useState<RepairJournalRecord|null>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const active=useRef(false),generation=useRef(0);
  const load=useCallback(async()=>{
    const turn=++generation.current,i=currentRepairIdentity(task.projectId,task.id);setRecovery(null);setMessage('');
    if(!i){setBusy(false);return;}setBusy(true);
    const valid=()=>active.current&&turn===generation.current&&sameRepairIdentity(i,currentRepairIdentity(task.projectId,task.id));
    try {
      const rows=await readRepairHistory(i,undefined,true);
      const row=rows.filter(value=>value.operation==='supplement'&&['PREPARED','PENDING','ACKNOWLEDGED'].includes(value.phase)).at(-1)??null;
      if(valid())setRecovery(row);
    } catch(e) { if(valid())setMessage(repairErrorMessage(e)); }
    finally { if(valid())setBusy(false); }
  },[task.projectId,task.id,identity.scope,identity.user?.id,live?.environment]);
  useFocusEffect(useCallback(()=>{active.current=true;void load();return()=>{active.current=false;++generation.current;};},[load]));
  if(message)return <Text accessibilityRole="alert">{message}</Text>;
  if(!recovery)return busy?<Text>Đang kiểm tra lệnh bổ sung đã lưu…</Text>:null;
  return <View style={{gap:spacing.xs}}>
    <Text style={typography.titleMd}>Có lệnh bổ sung đã lưu cần đối soát</Text>
    <Text>Lệnh API-159 được giữ nguyên theo đúng phiên, liên kết và nội dung gốc. Mở FIELD để tiếp tục có xác nhận hoặc đọc lại biên nhận.</Text>
    <Button variant="secondary" title="Đối soát bổ sung đã lưu" disabled={busy||!live} onPress={()=>router.push({
      pathname:'/(crew)/field-review',params:{id:task.id,projectId:task.projectId,supplement:'1'},
    })}/>
  </View>;
}

export function repairReviewPresentation(attempt: CrewRepairAttempt | null | undefined) {
  if (!attempt) return {
    title: 'Chưa có hồ sơ sửa chữa',
    message: 'Hồ sơ sửa chữa chưa được gửi. Chỉ bổ sung khi quản lý có yêu cầu sau khi nhận hồ sơ.',
    technical: null,
    canSupplement: false,
    statusLabel: 'Chưa có lượt gửi',
    blockReason: 'Chưa có quyết định SUPPLEMENT hợp lệ từ máy chủ.',
  };
  const technical = { attemptId: attempt.attemptId, effectiveSubmissionId: attempt.effectiveSubmissionId };
  if (!attempt.review) return {
    title: 'Hồ sơ đang chờ quản lý đánh giá',
    message: 'Đã nhận hồ sơ. Bạn chưa cần gửi thêm nội dung.',
    technical,
    canSupplement: false,
    statusLabel: 'Đang chờ đánh giá',
    blockReason: 'Chưa có quyết định bổ sung từ máy chủ.',
  };
  if (attempt.review.decision === 'SUPPLEMENT') return {
    title: 'Quản lý yêu cầu bổ sung hồ sơ sửa chữa',
    message: 'Mở hồ sơ để bổ sung số đo và ảnh theo yêu cầu.',
    technical,
    canSupplement: true,
    statusLabel: 'Cần bổ sung hồ sơ',
    blockReason: '',
  };
  return {
    title: 'Hồ sơ sửa chữa đã được quản lý chấp nhận',
    message: 'Bạn không cần gửi thêm bản bổ sung cho hồ sơ này.',
    technical,
    canSupplement: false,
    statusLabel: 'Đã được chấp nhận',
    blockReason: 'Hồ sơ đã được chấp nhận; không tạo bản bổ sung mới.',
  };
}

/** Local receipts checked against current API-080 authority; never represents a PM decision feed. */
export function CrewRepairReceiptHistory({task}:{task:CrewTask}) {
  const identity=useCrewIdentity(),live=currentRepairIdentity(task.projectId,task.id);
  const [saved,setSaved]=useState<{identity:RepairIdentity;rows:RepairJournalRecord[]}|null>(null);
  const [message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const active=useRef(false),generation=useRef(0);
  const load=useCallback(async()=>{
    const turn=++generation.current,i=currentRepairIdentity(task.projectId,task.id);setSaved(null);setMessage('');
    if(!i){setBusy(false);return;}setBusy(true);
    const valid=()=>active.current&&turn===generation.current&&sameRepairIdentity(i,currentRepairIdentity(task.projectId,task.id));
    try{const rows=await readRepairHistory(i,undefined,true);if(valid())setSaved({identity:i,rows});}
    catch(e){if(valid())setMessage(repairErrorMessage(e));}
    finally{if(valid())setBusy(false);}
  },[task.projectId,task.id,identity.scope,identity.user?.id,live?.environment]);
  useFocusEffect(useCallback(()=>{active.current=true;void load();return()=>{active.current=false;++generation.current;};},[load]));
  const rows=saved&&sameRepairIdentity(saved.identity,live)?saved.rows:null;
  const operation={assessment:'Đánh giá trước sửa',start:'Bắt đầu thi công',finish:'Kết thúc thi công',attempt:'Tiếp nhận hồ sơ',supplement:'Bổ sung hồ sơ'};
  const phase={PREPARED:'Đã lưu, chưa xác nhận gửi',PENDING:'Chưa rõ kết quả',ACKNOWLEDGED:'Đã lưu biên nhận, chờ đối soát',CONFIRMED:'Đã đối soát biên nhận',REJECTED:'Bị từ chối'};
  return <View style={{gap:spacing.sm}}>
    <Text style={styles.sectionTitle}>Lịch sử biên nhận trên thiết bị</Text>
    <Text style={styles.hint}>Nhật ký thao tác trên máy này, tách biệt với kết quả quản lý ở trên.</Text>
    {busy?<Text>Đang kiểm tra lịch sử…</Text>:null}
    {rows?.length===0?<Text style={styles.hint}>Chưa có lịch sử trên thiết bị này.</Text>:null}
    {rows?.map(c=><View key={c.key} style={styles.receipt}><Text style={styles.receiptLabel}>{operation[c.operation]}</Text><Text style={styles.body}>{phase[c.phase]}</Text>{c.receipt?<Text style={styles.hint}>Biên nhận máy chủ đã lưu, đúng nguồn liên kết. {c.receipt.data.intakeReadiness==='READY'?'Hồ sơ đủ thông tin tiếp nhận; chưa phải được PM chấp thuận.':''}</Text>:null}</View>)}
    {message?<Text accessibilityRole="alert">{message}</Text>:null}
    <Button style={styles.compactAction} variant="secondary" title="Đọc lại lịch sử biên nhận" disabled={busy||!live} onPress={()=>void load()}/>
  </View>;
}

const styles=StyleSheet.create({
  summary:{padding:12,gap:spacing.sm,borderWidth:1,borderColor:colors.border,borderRadius:radius.lg,backgroundColor:'#FBF8EE'},
  badge:{flexDirection:'row',alignItems:'center',alignSelf:'flex-start',maxWidth:'100%',gap:spacing.xs,paddingHorizontal:spacing.sm,paddingVertical:spacing.xs,borderRadius:radius.md},
  badgeLabel:{...typography.bodyMd,color:colors.secondary,flexShrink:1},
  title:{...typography.bodyLg,lineHeight:22,color:colors.neutral},
  sectionTitle:{...typography.labelLg,lineHeight:20,color:colors.neutral},
  body:{...typography.bodyMd,lineHeight:21,color:colors.neutral},hint:{...typography.caption,color:colors.secondary},
  taskInfo:{gap:spacing.sm,paddingTop:12,borderTopWidth:1,borderTopColor:colors.border},
  identity:{alignSelf:'flex-start',maxWidth:'100%',paddingHorizontal:spacing.sm,paddingVertical:4,backgroundColor:colors.surface,borderRadius:radius.sm},
  code:{...typography.labelLg,lineHeight:20,color:colors.secondary,flexShrink:1},
  history:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:radius.lg},
  disclosure:{minHeight:48,flexDirection:'row',alignItems:'center',gap:spacing.sm,padding:12,backgroundColor:'#FBF8EE',borderRadius:radius.lg,overflow:'hidden'},
  pressed:{backgroundColor:'#F3ECD6'},
  historyContent:{padding:12,gap:12},
  compactAction:{alignSelf:'flex-start',maxWidth:'100%',backgroundColor:'#FBF8EE'},
  technical:{gap:spacing.sm,paddingBottom:12,borderBottomWidth:1,borderBottomColor:colors.border},
  receipt:{gap:spacing.xs,paddingVertical:spacing.sm,borderTopWidth:1,borderTopColor:colors.border},
  receiptLabel:{...typography.labelLg,color:colors.neutral},flex:{flex:1,minWidth:0},
});

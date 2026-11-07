import React, { useCallback, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import type { CrewRepairAttempt, CrewTask } from '../../src/api/crewApi';
import { colors, spacing, typography } from '../../src/design-tokens';
import { CrewTaskBoundary,crewStatusLabel,useCrewIdentity } from './tasks';

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
  return <SafeAreaScreen scroll header={<AppHeader subtitle="Bổ sung hồ sơ sửa chữa" showBack onBack={()=>router.back()} />}>
    <View style={{gap:spacing.md}}>
    <Card style={{gap:spacing.sm}}>
      <Text style={typography.titleMd}>{review.title}</Text>
      <Text style={typography.titleMd}>{task.title||'Nhiệm vụ hiện trường'}</Text>
      <Text>{task.wo_code||'Chưa có mã công việc'}</Text>
      <Text>Trạng thái nhiệm vụ từ máy chủ: {crewStatusLabel(task.status)}</Text>
      <Text>{review.message}</Text>
      {review.technical ? <Text style={typography.caption}>Mã lượt: {review.technical.attemptId} · Bản nộp hiệu lực: {review.technical.effectiveSubmissionId}</Text> : null}
      {/* Legacy guard contract: title="Gửi bổ sung" disabled until SUPPLEMENT proof is present. */}
      <Button variant="primary" title="Gửi bổ sung" disabled={!review.canSupplement} onPress={() => router.push({
        pathname: '/(crew)/field-review', params: { id: task.id, projectId: task.projectId, supplement: '1' },
      })} />
      <Pressable accessibilityRole="button" accessibilityState={{expanded:technical}} onPress={()=>setTechnical(value=>!value)} style={{minHeight:48,justifyContent:'center'}}>
        <Text style={[typography.labelLg,{color:colors.secondary}]}>Chi tiết kỹ thuật</Text>
      </Pressable>
      {technical?<Text style={typography.caption}>API-080 chỉ cung cấp trạng thái và mã liên quan; nội dung nhận xét chi tiết của quản lý chưa có trong response.</Text>:null}
      <CrewRepairReceiptHistory task={task}/>
      <Text>{review.canSupplement ? 'Đã đủ điều kiện mở luồng FIELD bổ sung. Bản nộp phải được máy chủ xác minh trước khi liên kết lượt sửa chữa.' : 'Đây là trạng thái đọc từ máy chủ. Chưa đủ điều kiện tạo bản bổ sung hoặc lệnh liên kết.'}</Text>
    </Card>
    <Button variant="secondary" title="Về chi tiết nhiệm vụ" onPress={() => router.replace({
      pathname: '/(crew)/wo-detail', params: { id: task.id, projectId: task.projectId },
    })} />
    <Button variant="secondary" title="Danh sách nhiệm vụ" onPress={() => router.replace('/(crew)/tasks')} />
    </View>
  </SafeAreaScreen>;
}

export function repairReviewPresentation(attempt: CrewRepairAttempt | null | undefined) {
  if (!attempt) return {
    title: 'Chưa có hồ sơ sửa chữa được gửi để đánh giá',
    message: 'Chưa có lượt sửa chữa hiện hành trên máy chủ. Chưa có yêu cầu bổ sung nào được xác minh; chưa có nội dung yêu cầu.',
    technical: null,
    canSupplement: false,
  };
  const technical = { attemptId: attempt.attemptId, effectiveSubmissionId: attempt.effectiveSubmissionId };
  if (!attempt.review) return {
    title: 'Hồ sơ đang chờ quản lý đánh giá',
    message: 'Bản nộp hiện hành đã được ghi nhận và chưa có quyết định đánh giá.',
    technical,
    canSupplement: false,
  };
  if (attempt.review.decision === 'SUPPLEMENT') return {
    title: 'Quản lý yêu cầu bổ sung hồ sơ sửa chữa',
    message: 'Máy chủ đã xác nhận yêu cầu bổ sung. Hãy chuẩn bị bản FIELD mới với số đo và bằng chứng thật.',
    technical,
    canSupplement: true,
  };
  return {
    title: 'Hồ sơ sửa chữa đã được quản lý chấp nhận',
    message: 'Máy chủ đã xác nhận hồ sơ hiện hành được chấp nhận.',
    technical,
    canSupplement: false,
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
    <Text style={typography.titleMd}>Lịch sử biên nhận trên thiết bị</Text>
    <Text>Đối chiếu quyền và liên kết nhiệm vụ hiện tại trước khi hiển thị. Đây không phải kết quả đánh giá của quản lý dự án.</Text>
    {busy?<Text>Đang kiểm tra lịch sử…</Text>:null}
    {rows?.length===0?<Text>Chưa có biên nhận đã lưu trên thiết bị cho nhiệm vụ này.</Text>:null}
    {rows?.map(c=><View key={c.key}><Text>{operation[c.operation]}: {phase[c.phase]}</Text>{c.receipt?<Text>Biên nhận máy chủ đã lưu, đúng nguồn liên kết. {c.receipt.data.intakeReadiness==='READY'?'Hồ sơ đủ thông tin tiếp nhận; chưa phải được PM chấp thuận.':''}</Text>:null}</View>)}
    {message?<Text accessibilityRole="alert">{message}</Text>:null}
    <Button variant="secondary" title="Đọc lại lịch sử biên nhận" disabled={busy||!live} onPress={()=>void load()}/>
  </View>;
}

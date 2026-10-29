import React, { useCallback, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import type { CrewTask } from '../../src/api/crewApi';
import { typography } from '../../src/design-tokens';
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
  return <SafeAreaScreen scroll header={<AppHeader subtitle="Bổ sung hồ sơ sửa chữa" />}>
    <Card>
      <Text style={typography.titleMd}>Chưa thể xác minh yêu cầu bổ sung sửa chữa</Text>
      <Text style={typography.titleMd}>{task.title||'Nhiệm vụ hiện trường'}</Text>
      <Text>{task.wo_code||'Chưa có mã WO'}</Text>
      <Text>Trạng thái nhiệm vụ từ máy chủ: {crewStatusLabel(task.status)}</Text>
      <Text>Chưa có yêu cầu bổ sung từ người quản lý được xác minh cho hồ sơ sửa chữa này.</Text>
      <Text>Trạng thái đã gửi hoặc chờ đánh giá không có nghĩa là người quản lý yêu cầu bổ sung. Chưa có nội dung yêu cầu và lượt hồ sơ cần sửa.</Text>
      <Text>Gửi bổ sung đang khóa đến khi xác minh được yêu cầu quản lý, hồ sơ liên quan và phiên bản hạng mục.</Text>
      <Text>Phụ thuộc nguồn Backend: API đọc lịch sử RepairItem hiện chỉ cho quản lý; chưa có nguồn Crew xác minh yêu cầu bổ sung và lượt tiếp nhận liên quan.</Text>
      <CrewRepairReceiptHistory task={task}/>
      <Text>Nháp, bằng chứng và nhật ký lệnh đã lưu được giữ nguyên. Màn này không tạo hoặc gửi lệnh bổ sung, không xác nhận PM đã nghiệm thu.</Text>
    </Card>
    <Button variant="secondary" title="Về chi tiết nhiệm vụ" onPress={() => router.replace({
      pathname: '/(crew)/wo-detail', params: { id: task.id, projectId: task.projectId },
    })} />
    <Button variant="secondary" title="Danh sách nhiệm vụ" onPress={() => router.replace('/(crew)/tasks')} />
  </SafeAreaScreen>;
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
  return <View>
    <Text style={typography.titleMd}>Lịch sử biên nhận trên thiết bị</Text>
    <Text>Đối chiếu quyền và liên kết nhiệm vụ hiện tại trước khi hiển thị. Đây không phải kết quả đánh giá của PM.</Text>
    {busy?<Text>Đang kiểm tra lịch sử…</Text>:null}
    {rows?.length===0?<Text>Chưa có biên nhận đã lưu trên thiết bị cho nhiệm vụ này.</Text>:null}
    {rows?.map(c=><View key={c.key}><Text>{operation[c.operation]}: {phase[c.phase]}</Text>{c.receipt?<Text>Biên nhận máy chủ đã lưu, đúng nguồn liên kết. {c.receipt.data.intakeReadiness==='READY'?'Hồ sơ đủ thông tin tiếp nhận; chưa phải được PM chấp thuận.':''}</Text>:null}</View>)}
    {message?<Text accessibilityRole="alert">{message}</Text>:null}
    <Button variant="secondary" title="Đọc lại lịch sử biên nhận" disabled={busy||!live} onPress={()=>void load()}/>
  </View>;
}

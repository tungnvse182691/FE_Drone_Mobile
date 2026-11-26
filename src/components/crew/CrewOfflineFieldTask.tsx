import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { AppHeader } from '../AppHeader';
import { SafeAreaScreen } from '../SafeAreaScreen';
import { Card } from '../Card';
import { Button } from '../Button';
import { colors, spacing, typography } from '../../design-tokens';
import { currentQueueIdentity, sameQueueIdentity } from '../../offline/upload-queue';
import { readOfflineCrewTask, recordOfflineFieldStart, prepareOfflineFieldSubmission } from '../../api/crewOfflineField';
import { prepareOfflineRepairAssessment, prepareOfflineRepairStart, prepareOfflineRepairFinish } from '../../api/crewOfflineRepair';
import { currentFieldContext, openFieldRuntime, loadFieldDraft } from '../../api/crewFieldDraft';
import { downloadCrewOfflineTask } from '../../api/crewOfflinePreparation';
import { openOfflineJournal, type OfflineJournalRecord } from '../../api/crewOfflineJournal';

/** Explicit snapshot screen, separate from online permission/error handling. */
export function CrewOfflineFieldTask({projectId,taskId}:{projectId:string;taskId:string}) {
  const router=useRouter(),[identity]=useState(currentQueueIdentity);
  const [source,setSource]=useState<Awaited<ReturnType<typeof readOfflineCrewTask>>|null>(null);
  const [localStarted,setLocalStarted]=useState(false);
  const [record,setRecord]=useState<OfflineJournalRecord|null>(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  const live=useRef(true),running=useRef(false);
  useFocusEffect(useCallback(()=>{
    let active=true;
    live.current=true;
    if(identity)void (async()=>{
      try {
        const loaded=await readOfflineCrewTask(identity,projectId,taskId);
        const rows=await (await openOfflineJournal(identity)).list();
        const context=currentFieldContext(projectId,taskId);
        const draft=context&&loaded.facts.repair==null?await loadFieldDraft(context,await openFieldRuntime(context)):null;
        if(active&&live.current&&sameQueueIdentity(identity)){
          setSource(loaded);setLocalStarted(!!draft?.offlineStart);setRecord(rows.filter(r=>r.projectId===projectId&&r.proof.kind==='signed-field-batch'&&
            (JSON.parse(r.body).operations??[]).some((o:{taskId?:string})=>o.taskId===taskId)).at(-1)??null);
        }
      }catch {if(active&&live.current&&identity&&sameQueueIdentity(identity))setNotice('Chưa đọc được dữ liệu offline hợp lệ. Dữ liệu hiện có được giữ nguyên.');}
    })();
    return()=>{active=false;live.current=false;};
  },[identity,projectId,taskId]));
  const prepare=async()=>{
    if(!identity||running.current||!sameQueueIdentity(identity))return;
    running.current=true;setBusy(true);setNotice('');
    try {
      await recordOfflineFieldStart(identity,projectId,taskId);
      if(live.current&&sameQueueIdentity(identity)){setLocalStarted(true);setNotice('Đã lưu mốc bắt đầu trên thiết bị. Hoàn thiện số đo và ảnh rồi ký chung hồ sơ; chưa gửi tới máy chủ.');}
    }catch {if(live.current&&sameQueueIdentity(identity))setNotice('Chưa lưu được thao tác mới. Kiểm tra Đồng bộ; không tạo lại lệnh đang chờ hoặc chưa rõ kết quả.');}
    finally{running.current=false;if(live.current&&sameQueueIdentity(identity))setBusy(false);}
  };
  const refreshSnapshot=async()=>{
    if(!identity||running.current||!sameQueueIdentity(identity))return;
    running.current=true;setBusy(true);setNotice('');
    try{
      await downloadCrewOfflineTask(identity,projectId,taskId,true);
      const loaded=await readOfflineCrewTask(identity,projectId,taskId);
      const rows=await (await openOfflineJournal(identity)).list();
      if(live.current&&sameQueueIdentity(identity)){
        setSource(loaded);setRecord(rows.filter(r=>r.projectId===projectId&&r.proof.kind==='signed-field-batch'&&
          (JSON.parse(r.body).operations??[]).some((o:{taskId?:string})=>o.taskId===taskId)).at(-1)??null);
        setNotice('Đã tải và đối soát bản dữ liệu mới. Lịch sử và gói ký cũ vẫn được giữ nguyên.');
      }
    }catch{if(live.current&&sameQueueIdentity(identity))setNotice('Chưa tải được phiên bản mới. Kiểm tra kết nối và Đồng bộ; bản đã lưu được giữ nguyên.');}
    finally{running.current=false;if(live.current&&sameQueueIdentity(identity))setBusy(false);}
  };
  const prepareSubmission=async()=>{
    if(!identity||running.current||!sameQueueIdentity(identity))return;
    running.current=true;setBusy(true);setNotice('');
    try {
      const context=currentFieldContext(projectId,taskId);
      if(!context)throw Error('field_session_changed');
      const runtime=await openFieldRuntime(context),draft=await loadFieldDraft(context,runtime);
      if(!sameQueueIdentity(identity))return;
      const saved=await prepareOfflineFieldSubmission(identity,projectId,taskId,draft);
      if(live.current&&sameQueueIdentity(identity)){setRecord(saved);setNotice('Đã ký hồ sơ từ nháp đã lưu. Chưa gửi tới máy chủ; mở Đồng bộ để gửi và đối soát.');}
    }catch(error){
      if(live.current&&sameQueueIdentity(identity))setNotice((error as Error)?.message==='field_evidence_not_verified'
        ?'Ảnh chưa đủ dữ liệu gốc để ký hoặc đang có lượt tải chưa xác định. Giữ nguyên nháp và kiểm tra trạng thái ảnh.'
        :(error as Error)?.message==='field_measurements_required'?'Nháp chưa có đủ số đo và thông tin đo đạc. Hoàn thiện hồ sơ đo kiểm trước khi ký.'
        :'Chưa ký được hồ sơ. Kiểm tra nháp, dữ liệu nhiệm vụ và biên nhận bắt đầu tại Đồng bộ; dữ liệu hiện có được giữ nguyên.');
    }finally{running.current=false;if(live.current&&sameQueueIdentity(identity))setBusy(false);}
  };
  const prepareRepair=async(kind:'assessment'|'start'|'finish')=>{
    if(!identity||running.current||!sameQueueIdentity(identity))return;
    running.current=true;setBusy(true);setNotice('');
    try{
      let saved:OfflineJournalRecord;
      if(kind==='finish')saved=await prepareOfflineRepairFinish(identity,projectId,taskId);
      else if(kind==='start')saved=await prepareOfflineRepairStart(identity,projectId,taskId);
      else {
        const context=currentFieldContext(projectId,taskId);
        if(!context)throw Error('field_session_changed');
        const runtime=await openFieldRuntime(context),draft=await loadFieldDraft(context,runtime);
        if(!sameQueueIdentity(identity))return;
        saved=await prepareOfflineRepairAssessment(identity,projectId,taskId,draft);
      }
      if(live.current&&sameQueueIdentity(identity)){setRecord(saved);setNotice('Đã lưu gói ký trên thiết bị. Mở Đồng bộ để gửi và kiểm tra biên nhận máy chủ.');}
    }catch(error){
      const msg=(error as Error)?.message;
      console.warn('[CrewOfflineRepairSign] failed');
      if(live.current&&sameQueueIdentity(identity))setNotice(
        msg==='offline_repair_first_start_required'
          ?'Chưa có mốc bắt đầu sửa chữa hợp lệ từ máy chủ nên chưa thể ký đánh giá; dữ liệu cũ được giữ nguyên.'
          :msg==='repair_verified_evidence_required'||msg==='repair_measurements_required'
            ?'Nháp chưa đủ số đo hoặc ảnh gốc hợp lệ để ký đánh giá sửa chữa; dữ liệu cũ được giữ nguyên.'
            :'Chưa tạo được lệnh sửa chữa. Kiểm tra nháp, ảnh gốc đã lưu, bản dữ liệu mới và biên nhận ở Đồng bộ; dữ liệu cũ được giữ nguyên.');
    }finally{running.current=false;if(live.current&&sameQueueIdentity(identity))setBusy(false);}
  };
  if(!identity||!sameQueueIdentity(identity))return null;
  const state=String(source?.facts.status??'');
  const repair=source?.facts.repair as Record<string,unknown>|null|undefined;
  const submission=!!record&&(JSON.parse(record.body).operations??[]).some((o:{kind?:string})=>o.kind==='FIELD_SUBMISSION');
  return <SafeAreaScreen scroll header={<AppHeader subtitle="Nhiệm vụ offline" showBack fallbackRoute="/(crew)/sync"/>}>
    <Card style={styles.card}>
      <Text style={typography.titleLg}>Dữ liệu đã tải</Text>
      <Text style={styles.body}>{typeof source?.facts.instructions==='string'?source.facts.instructions:'Đang đọc dữ liệu nhiệm vụ…'}</Text>
      {source?<Text style={styles.caption}>Đã tải: {new Date(source.snapshot.downloadedAt).toLocaleString('vi-VN')}</Text>:null}
      <Text style={styles.caption}>Đây là bản đã lưu trên thiết bị. Máy chủ sẽ kiểm tra lại quyền, phân công và phiên bản khi đồng bộ.</Text>
      {!source||(!record||record.phase==='RECONCILED')&&(['NewAssigned','Accepted'].includes(state)||!!repair)?<Button title={source?'Tải phiên bản mới':'Tải và đối soát dữ liệu nhiệm vụ'} variant="secondary" loading={busy} disabled={busy} onPress={()=>void refreshSnapshot()}/>:null}
    </Card>
    <Card style={styles.card}>
      <Text style={typography.titleMd}>Thao tác hiện trường</Text>
      {repair?<>
        <Text style={styles.body}>{typeof repair.repairPlan==='string'&&repair.repairPlan.trim()?repair.repairPlan:'Phương án xử lý chưa có trong bản đã tải.'}</Text>
        <Text style={styles.caption}>Trạng thái hạng mục: {repair.state==='Assigned'?'Đã phân công':repair.state==='InProgress'?'Đang thi công':'Chưa xác định'}. Quyền và phiên bản sẽ được máy chủ kiểm tra lại khi đồng bộ.</Text>
        {state==='InProgress'&&repair.state==='Assigned'?<Button title="Mở số đo và ảnh" variant="secondary" disabled={busy} onPress={()=>router.push({pathname:'/(crew)/field-review',params:{id:taskId,projectId,signed:'1'}})}/>:null}
        {record&&record.phase!=='RECONCILED'?<Text style={styles.body}>Gói ký đang chờ gửi hoặc đối soát tại Đồng bộ.</Text>:null}
        {source&&(!record||record.phase==='RECONCILED')&&state==='InProgress'&&repair.state==='Assigned'&&repair.currentAssessmentId==null?<Button title="Ký đánh giá hiện trường" variant="secondary" loading={busy} disabled={busy} onPress={()=>void prepareRepair('assessment')}/>:null}
        {source&&(!record||record.phase==='RECONCILED')&&state==='InProgress'&&repair.state==='Assigned'&&repair.currentAssessmentId!=null&&repair.currentExecutionStartId==null&&repair.mode==='Normal'?<Button title="Ký bắt đầu sửa chữa" variant="secondary" loading={busy} disabled={busy} onPress={()=>void prepareRepair('start')}/>:null}
        {source&&(!record||record.phase==='RECONCILED')&&state==='InProgress'&&repair.state==='InProgress'&&repair.currentExecutionStartId!=null&&repair.currentExecutionFinishId==null?<Button title="Ký kết thúc sửa chữa" variant="secondary" loading={busy} disabled={busy} onPress={()=>void prepareRepair('finish')}/>:null}
      </>:record?<>
        <Text accessibilityLiveRegion="polite" style={styles.body}>{submission
          ?record.phase==='RECONCILED'?'Máy chủ đã xác nhận hồ sơ đo kiểm. Chưa phải kết quả nghiệm thu.':'Hồ sơ đã ký được giữ trên thiết bị. Gửi và kiểm tra biên nhận tại Đồng bộ.'
          :record.phase==='RECONCILED'?'Máy chủ đã xác nhận thao tác nhận / bắt đầu.':'Đã có thao tác nhận / bắt đầu lưu trên thiết bị. Kiểm tra kết quả tại Đồng bộ.'}</Text>
      </>:source&&!localStarted&&['NewAssigned','Accepted'].includes(state)?<>
        <Text style={styles.body}>{state==='NewAssigned'?'Lưu thao tác nhận và bắt đầu nhiệm vụ. Thứ tự hai thao tác được giữ trong gói ký.':'Lưu thao tác bắt đầu cho nhiệm vụ đã nhận.'}</Text>
        <Button title={state==='NewAssigned'?'Nhận và bắt đầu offline':'Bắt đầu offline'} variant="secondary" loading={busy} disabled={busy} onPress={()=>void prepare()}/>
      </>:<Text style={styles.body}>Bản dữ liệu này không cho phép tạo thao tác nhận / bắt đầu mới.</Text>}
      {!repair&&source&&(state==='InProgress'||localStarted)&&!submission&&(!record||record.phase==='RECONCILED')?<>
        <Text style={styles.body}>Ký hồ sơ từ số đo và ảnh đã lưu của nhiệm vụ. Có thể ký với ảnh gốc chưa tải lên; khi có mạng, ứng dụng tải và xác minh ảnh trước khi đối soát hồ sơ.</Text>
        <Button title="Mở hồ sơ đo kiểm" variant="secondary" disabled={busy} onPress={()=>router.push({pathname:'/(crew)/field-review',params:{id:taskId,projectId,signed:'1'}})}/>
        <Button title="Ký hồ sơ từ nháp đã lưu" variant="secondary" loading={busy} disabled={busy} onPress={()=>void prepareSubmission()}/>
      </>:null}
      {notice?<Text accessibilityLiveRegion="polite" style={styles.body}>{notice}</Text>:null}
    </Card>
  </SafeAreaScreen>;
}
const styles=StyleSheet.create({card:{gap:spacing.sm,marginBottom:spacing.md},body:{...typography.bodyMd,color:colors.secondary},caption:{...typography.caption,color:colors.secondary}});

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CrewPressable as Pressable } from './CrewMotion';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../design-tokens';
import { Card } from '../Card';
import { Button } from '../Button';
import { isCrewResourceId } from '../../api/crewApi';
import { recoverAndDownloadCrewOfflineTask } from '../../api/crewOfflinePreparation';
import { inspectOfflineDevice, reconcileDeviceIntent } from '../../api/crewOfflineDevice';
import { dispatchOfflineIntent } from '../../api/crewOfflineWorkflow';
import { reconcileSignedBatch, recoverSignedOrigins, reconcileStartIntent } from '../../offline/crewSignedSync';
import { openOfflineJournal, sameOfflinePartition, type OfflineJournalRecord } from '../../api/crewOfflineJournal';
import { NATIVE_ACCEPTANCE_VERIFIED } from '../../../modules/roadguard-offline-crypto';
import { sameQueueIdentity, type QueueIdentity } from '../../offline/upload-queue';
import { sendSignedFieldIntent } from '../../offline/crewSignedSync';

function pendingEvidence(r:OfflineJournalRecord):boolean {
  return ((r.receipt as {items?:{originId?:string;durableAcknowledgment?:boolean;state?:string;code?:string}[]})?.items??[])
    .some(i=>!r.terminalItems?.some(t=>t.originId===i.originId)&&!r.verifiedItems?.some(v=>v.originId===i.originId)&&
      !i.durableAcknowledgment&&i.state==='PENDING_DEPENDENCY'&&['evidence_upload_required','evidence_verification_pending'].includes(i.code??''));
}
function evidenceLabel(r:OfflineJournalRecord):string {
  const items=(r.receipt as {items?:{code?:string}[]})?.items??[];
  return items.some(i=>i.code==='evidence_upload_required')?'Chờ tải ảnh':'Chờ xác minh ảnh';
}
function phaseLabel(r:OfflineJournalRecord):string {
  if(r.terminalItems?.length)return 'Cần xử lý';
  if(r.phase==='RECEIVED'&&pendingEvidence(r))return evidenceLabel(r);
  return ({RECONCILED:'Đã xác nhận',RECEIVED:'Cần đối soát',UNKNOWN_OUTCOME:'Chưa rõ kết quả',IN_FLIGHT:'Đang xử lý',PREPARED:'Chờ gửi',CONFLICT:'Dữ liệu đã thay đổi',REJECTED:'Chưa được chấp nhận'} as Record<string,string>)[r.phase]??'Chưa xác nhận';
}
/** Real Crew sync route, actor/session keyed by parent. Read never changes pending/legacy state. */
export function CrewOfflinePanel({identity, refreshSignal=0}:{identity:QueueIdentity; refreshSignal?: number}) {
  const router=useRouter();
  const [probe,setProbe]=useState<Awaited<ReturnType<typeof inspectOfflineDevice>>|null>(null);
  const [records,setRecords]=useState<OfflineJournalRecord[]>([]),[confirmedSnapshots,setConfirmedSnapshots]=useState<Set<string>>(new Set()),[confirmedRegistrations,setConfirmedRegistrations]=useState<Set<string>>(new Set()),[revokedRegistrations,setRevokedRegistrations]=useState<Set<string>>(new Set()),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [showDiagnostics,setShowDiagnostics]=useState(false);
  const [showHistory,setShowHistory]=useState(false);
  const sequence=useRef(0),running=useRef(false);
  useEffect(()=>()=>{sequence.current++;},[]);
  const refresh=useCallback(async()=>{
    if(running.current||!sameQueueIdentity(identity))return;running.current=true;setBusy(true);setError('');const n=++sequence.current;
    try {
      const j=await openOfflineJournal(identity),rows=await j.list();
      if(n!==sequence.current||!sameQueueIdentity(identity))return;
      setConfirmedSnapshots(new Set(rows.filter(r=>r.proof.kind==='session-confirm'&&r.phase==='RECONCILED'&&sameQueueIdentity(r.identity,identity))
        .flatMap(r=>Array.isArray(r.proof.snapshotIds)?r.proof.snapshotIds.map(String):[])));
      setConfirmedRegistrations(new Set(rows.filter(r=>r.proof.kind==='session-confirm'&&r.phase==='RECONCILED'&&sameQueueIdentity(r.identity,identity))
        .map(r=>String(r.proof.registrationId??'')).filter(Boolean)));
      setRevokedRegistrations(new Set(rows.filter(r=>r.proof.kind==='revocation').map(r=>String(r.proof.registrationId??'')).filter(Boolean)));
      setRecords(rows.filter(r=>r.proof.kind!=='admission-upload'&&r.proof.kind!=='session-confirm'));
      // Native capability is diagnostic; it must not hide durable online commands.
      try {
        const p=await inspectOfflineDevice(identity);
        if(n===sequence.current&&sameQueueIdentity(identity))setProbe(p);
      }catch {if(n===sequence.current&&sameQueueIdentity(identity))setProbe(null);}
    }catch {if(n===sequence.current&&sameQueueIdentity(identity))setError('Không đọc được thông tin thiết bị hoặc nhật ký; dữ liệu được giữ nguyên.');}
    finally {running.current=false;if(n===sequence.current&&sameQueueIdentity(identity))setBusy(false);}
  },[identity]);
  // Focus is the authoritative initial load. A positive signal is emitted by
  // the parent screen's refresh action and should refresh this panel once.
  useEffect(()=>{if(refreshSignal>0)void refresh();},[refresh,refreshSignal]);
  useFocusEffect(useCallback(()=>{
    void refresh();
  },[refresh]));
  const canRecoverSignedBatch=(record:OfflineJournalRecord)=>record.proof.kind==='signed-field-batch'&&(
    sameQueueIdentity(record.identity,identity)||(
      sameOfflinePartition(record.identity,identity)&&
      confirmedRegistrations.has(String(record.proof.registrationId??''))&&
      !revokedRegistrations.has(String(record.proof.registrationId??''))
    )
  );
  const recoveryTask=(r:OfflineJournalRecord):string|null=>{
    if(sameQueueIdentity(r.identity,identity)||!sameOfflinePartition(r.identity,identity)||
      !['enrollment','snapshot'].includes(String(r.proof.kind))||!['PREPARED','UNKNOWN_OUTCOME','IN_FLIGHT','RECEIVED'].includes(r.phase))return null;
    const taskId=r.proof.kind==='snapshot'?JSON.parse(r.body).taskId:r.proof.taskId;
    return isCrewResourceId(taskId)?taskId:null;
  };
  const recoverDevice=async(record:OfflineJournalRecord)=>{
    const taskId=recoveryTask(record);
    if(!taskId||running.current||!sameQueueIdentity(identity))return;
    running.current=true;setBusy(true);setError('');const n=++sequence.current;
    try{await recoverAndDownloadCrewOfflineTask(identity,record.projectId,taskId);}
    catch{if(n===sequence.current&&sameQueueIdentity(identity))setError('Chưa khôi phục được dữ liệu nhiệm vụ. Cần kết nối mạng, đúng tài khoản và khóa thiết bị đã đăng ký; nhật ký gốc vẫn được giữ nguyên.');}
    finally{
      if(n===sequence.current&&sameQueueIdentity(identity)){
        // Reload confirmations as well as rows after explicit session recovery.
        try{
          const rows=await (await openOfflineJournal(identity)).list();
          if(n===sequence.current&&sameQueueIdentity(identity)){
            setRecords(rows.filter(r=>r.proof.kind!=='admission-upload'&&r.proof.kind!=='session-confirm'));
            const confirmed=rows.filter(r=>r.proof.kind==='session-confirm'&&r.phase==='RECONCILED'&&sameQueueIdentity(r.identity,identity));
            setConfirmedSnapshots(new Set(confirmed.flatMap(r=>Array.isArray(r.proof.snapshotIds)?r.proof.snapshotIds.map(String):[])));
            setConfirmedRegistrations(new Set(confirmed.map(r=>String(r.proof.registrationId??'')).filter(Boolean)));
          }
        }catch{/* Keep durable data and the last view. */}
      }
      running.current=false;if(n===sequence.current&&sameQueueIdentity(identity))setBusy(false);
    }
  };
  const reconcile=async(record:OfflineJournalRecord)=>{
    if(running.current||!sameQueueIdentity(identity)||(!sameQueueIdentity(record.identity,identity)&&!canRecoverSignedBatch(record)))return;
    running.current=true;setBusy(true);setError('');const n=++sequence.current;
    try {
      if(record.proof.kind==='signed-field-batch'){
        if(record.phase==='RECEIVED')await reconcileSignedBatch(record,identity);else await recoverSignedOrigins(record,identity);
      }else if(record.proof.kind==='start-reconciliation')await reconcileStartIntent(record);
      else if(record.phase==='IN_FLIGHT'){
        const j0=await openOfflineJournal(identity);
        const next=record.receipt&&typeof (record.receipt as {id?:string}).id==='string'
          ?await j0.transition(record,'RECEIVED',record.receipt)
          :await dispatchOfflineIntent(await j0.transition(record,'UNKNOWN_OUTCOME'));
        await reconcileDeviceIntent(next);
      }else if(record.phase==='UNKNOWN_OUTCOME'){
        const received=await dispatchOfflineIntent(record);
        await reconcileDeviceIntent(received);
      }else await reconcileDeviceIntent(record);
      const j=await openOfflineJournal(identity),rows=await j.list();
      if(n===sequence.current&&sameQueueIdentity(identity))setRecords(rows.filter(r=>r.proof.kind!=='admission-upload'&&r.proof.kind!=='session-confirm'));
    }catch(error){console.warn('[CrewOfflinePanel:reconcile] failed');if(n===sequence.current&&sameQueueIdentity(identity))setError('Chưa xác nhận đầy đủ kết quả. Lệnh, khóa và dữ liệu chờ vẫn được giữ nguyên.');}
    finally {running.current=false;if(n===sequence.current&&sameQueueIdentity(identity))setBusy(false);}
  };
  if(!sameQueueIdentity(identity))return null;
  const send=async(record:OfflineJournalRecord)=>{
    if(running.current||!sameQueueIdentity(identity)||(!sameQueueIdentity(record.identity,identity)&&!canRecoverSignedBatch(record)))return;
    running.current=true;setBusy(true);setError('');const n=++sequence.current;
    try{
      await sendSignedFieldIntent(record,identity);
      const rows=await (await openOfflineJournal(identity)).list();
      if(n===sequence.current&&sameQueueIdentity(identity))setRecords(rows.filter(r=>r.proof.kind!=='admission-upload'&&r.proof.kind!=='session-confirm'));
    }catch(error){console.warn('[CrewOfflinePanel:send] failed');if(n===sequence.current&&sameQueueIdentity(identity))setError('Chưa xác nhận đầy đủ kết quả gửi. Gói ký và khóa gửi lại được giữ nguyên; đối soát trước khi thử lại.');}
    finally{
      try{const rows=await (await openOfflineJournal(identity)).list();if(n===sequence.current&&sameQueueIdentity(identity))setRecords(rows.filter(r=>r.proof.kind!=='admission-upload'&&r.proof.kind!=='session-confirm'));}catch{/* Keep last view; durable journal remains authoritative. */}
      running.current=false;if(n===sequence.current&&sameQueueIdentity(identity))setBusy(false);
    }
  };
  const waiting=records.filter(r=>r.phase==='PREPARED').length;
  const reconciling=records.filter(r=>!r.terminalItems?.length&&['UNKNOWN_OUTCOME','IN_FLIGHT','RECEIVED'].includes(r.phase)).length;
  const confirmed=records.filter(r=>r.phase==='RECONCILED').length;
  const attention=records.filter(r=>r.terminalItems?.length||['CONFLICT','REJECTED'].includes(r.phase)).length;
  const activeRecords=records.filter(r=>r.phase!=='RECONCILED');
  const historyRecords=records.filter(r=>r.phase==='RECONCILED');
  return <Card style={styles.panel}>
    <View style={styles.heading}><Text style={[typography.titleMd,{color:'#192D40',fontSize:16,lineHeight:24}]}>Hàng đợi trên thiết bị</Text></View>
    <Text style={styles.description}>{records.length} bản ghi được lưu trong nhật ký thiết bị.</Text>
    <View style={styles.stateRow}><View style={styles.stateCell}><Text style={styles.value}>{waiting}</Text><Text style={styles.label}>Chờ gửi</Text></View><View style={styles.stateCell}><Text style={styles.value}>{reconciling}</Text><Text style={styles.label}>Cần đối soát</Text></View><View style={styles.stateCell}><Text style={styles.value}>{confirmed}</Text><Text style={styles.label}>Đã xác nhận</Text></View><View style={styles.stateCell}><Text style={styles.value}>{attention}</Text><Text style={styles.label}>Cần xử lý</Text></View></View>
    <Text style={styles.description}>Chỉ biên nhận hợp lệ từ máy chủ mới được tính là đã đồng bộ.</Text>
    {error?<Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>:null}
    {activeRecords.length===0?<Text style={styles.description}>Không có lệnh đang chờ gửi hoặc đối soát.</Text>:null}
    {historyRecords.length>0?<Pressable accessibilityRole="button" accessibilityLabel="Lịch sử đã xác nhận" accessibilityState={{expanded:showHistory}} onPress={()=>setShowHistory(v=>!v)} style={styles.diagnosticToggle}><Text style={typography.labelLg}>Lịch sử đã xác nhận ({historyRecords.length})</Text><MaterialIcons name={showHistory?'expand-less':'expand-more'} size={20} color={colors.secondary}/></Pressable>:null}
    {(showHistory?records:activeRecords).map(r=><View key={r.id} style={styles.record}><View style={styles.recordTitle}><Text style={typography.labelLg}>{({'signed-field-batch':'Hồ sơ hiện trường','start-reconciliation':'Bắt đầu nhiệm vụ',enrollment:'Đăng ký thiết bị',snapshot:'Dữ liệu nhiệm vụ',revocation:'Thu hồi thiết bị',safety:'An toàn hiện trường','review-request':'Yêu cầu xem xét lại'} as Record<string,string>)[String(r.proof.kind)] ?? 'Thao tác đã lưu'}</Text><Text style={styles.phase}>{phaseLabel(r)}</Text></View>
      {(sameQueueIdentity(r.identity,identity)||(sameOfflinePartition(r.identity,identity)&&confirmedSnapshots.has(r.id)))&&r.proof.kind==='snapshot'&&r.phase==='RECONCILED'?<Button title="Mở dữ liệu nhiệm vụ" variant="secondary" disabled={busy} onPress={()=>router.push({pathname:'/(crew)/wo-detail',params:{id:JSON.parse(r.body).taskId,projectId:r.projectId,offline:'1'}})}/>:null}
      {recoveryTask(r)?<Button title="Khôi phục dữ liệu từ lần đăng nhập trước" variant="secondary" disabled={busy} onPress={()=>void recoverDevice(r)}/>:null}
      {!sameQueueIdentity(r.identity,identity)&&sameOfflinePartition(r.identity,identity)&&['enrollment','snapshot'].includes(String(r.proof.kind))&&r.phase!=='RECONCILED'&&!recoveryTask(r)?<Text style={styles.description}>Mở nhiệm vụ gốc để xác nhận lại dữ liệu khi có mạng. Giữ nguyên nhật ký và khóa thiết bị; không đăng ký thay thế.</Text>:null}
      {r.terminalItems?.length?<Text style={styles.description}>{r.terminalItems.some(i=>i.state==='STALE_SNAPSHOT'||i.code==='concurrency_conflict')?'Dữ liệu nguồn đã thay đổi. Giữ hồ sơ để kiểm tra với người phụ trách; không gửi lại thao tác bị từ chối.':'Có thao tác bị máy chủ từ chối. Kết quả đã xác nhận và dữ liệu chờ độc lập được giữ nguyên để xử lý.'}</Text>:null}
      {canRecoverSignedBatch(r)&&(['PREPARED','UNKNOWN_OUTCOME','IN_FLIGHT'].includes(r.phase)||(r.phase==='RECEIVED'&&pendingEvidence(r)))?<Button title={r.phase==='PREPARED'?'Gửi gói đã ký':r.phase==='RECEIVED'?(r.terminalItems?.length?'Tiếp tục tải ảnh còn chờ':'Tiếp tục tải ảnh và đồng bộ'):'Đối soát và gửi lại đúng gói'} variant="secondary" disabled={busy} onPress={()=>void send(r)}/>:null}
      {(sameQueueIdentity(r.identity,identity)||canRecoverSignedBatch(r))&&((r.phase==='RECEIVED'&&['signed-field-batch','start-reconciliation','enrollment','snapshot','revocation'].includes(String(r.proof.kind)))||(['UNKNOWN_OUTCOME','IN_FLIGHT'].includes(r.phase)&&['signed-field-batch','start-reconciliation','enrollment','snapshot'].includes(String(r.proof.kind))))?<Button title="Đối soát kết quả" variant="secondary" disabled={busy} onPress={()=>void reconcile(r)}/>:null}
    </View>)}
    <Pressable accessibilityRole="button" accessibilityLabel="Chi tiết kỹ thuật" accessibilityState={{expanded:showDiagnostics}} onPress={()=>setShowDiagnostics(v=>!v)} style={styles.diagnosticToggle}><Text style={typography.labelLg}>Chi tiết kỹ thuật</Text><MaterialIcons name={showDiagnostics?'expand-less':'expand-more'} size={20} color={colors.secondary}/></Pressable>
    {showDiagnostics?<View style={styles.diagnostics}><Text style={styles.description}>Thiết bị: {probe?.capability.apiLevel || 'Chưa đọc'}</Text><Text style={styles.description}>{NATIVE_ACCEPTANCE_VERIFIED?'Đã có bằng chứng native trong phạm vi đã kiểm.':'Chưa có bằng chứng native đủ để mở gửi offline.'}</Text><Pressable accessibilityRole="button" style={styles.readButton} onPress={()=>void refresh()} disabled={busy}><Text style={styles.readLabel}>{busy?'Đang đọc…':'Đọc lại nhật ký'}</Text></Pressable></View>:null}
  </Card>;
}

const styles = StyleSheet.create({
  panel: { borderWidth: 1, borderColor: '#DCE2E7', borderRadius: radius.lg, gap: spacing.sm, marginBottom: spacing.md },
  description: { ...typography.caption, color: colors.secondary },
  heading: { flexDirection:'row', alignItems:'center', gap: spacing.sm },
  stateRow: { flexDirection:'row', flexWrap:'wrap', gap:spacing.sm },
  stateCell: { flexBasis:'47%', flexGrow:1, backgroundColor:colors.surfaceAlt, borderRadius:radius.lg, padding:spacing.sm },
  value: { ...typography.titleMd, fontSize:28, lineHeight:36, fontVariant:['tabular-nums'], color: '#192D40', textAlign:'center' },
  label: { ...typography.caption, color: colors.secondary, textAlign:'center' },
  record: { gap: spacing.xs, borderBottomWidth:1, borderColor:colors.border, paddingVertical:spacing.sm },
  recordTitle: { flexDirection:'row', flexWrap:'wrap', justifyContent:'space-between', gap: spacing.sm },
  phase: { ...typography.caption, color: colors.secondary },
  error: { color: colors.error },
  diagnosticToggle: { borderRadius:radius.md, paddingHorizontal:spacing.sm, backgroundColor:colors.surfaceAlt, flexDirection:'row', alignItems:'center', justifyContent:'space-between', minHeight:48 },
  diagnostics: { gap: spacing.xs, borderTopWidth:1, borderColor:colors.border, paddingTop:spacing.sm },
  readButton: { alignSelf:'flex-start', minHeight:48, paddingHorizontal:spacing.md, borderWidth:1, borderColor:'#89939F', borderRadius:radius.lg, justifyContent:'center' },
  readLabel: { ...typography.labelLg, color: colors.secondary },
});

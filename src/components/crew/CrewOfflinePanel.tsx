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
import { fieldErrorMessage } from '../../api/crewFieldDraft';

function pendingEvidence(r:OfflineJournalRecord):boolean {
  return ((r.receipt as {items?:{originId?:string;durableAcknowledgment?:boolean;state?:string;code?:string}[]})?.items??[])
    .some(i=>!r.terminalItems?.some(t=>t.originId===i.originId)&&!r.verifiedItems?.some(v=>v.originId===i.originId)&&
      !i.durableAcknowledgment&&i.state==='PENDING_DEPENDENCY'&&['evidence_upload_required','evidence_verification_pending'].includes(i.code??''));
}
function evidenceLabel(r: OfflineJournalRecord): string {
  const items = (r.receipt as { items?: { originId?: string; code?: string; state?: string; durableAcknowledgment?: boolean }[] })?.items ?? [];
  return items.some(item => item.code === 'evidence_upload_required' && item.state === 'PENDING_DEPENDENCY' && !item.durableAcknowledgment &&
    !r.terminalItems?.some(value => value.originId === item.originId) && !r.verifiedItems?.some(value => value.originId === item.originId)) ? 'Chờ tải ảnh' : 'Chờ xác minh ảnh';
}
function phaseLabel(r:OfflineJournalRecord):string {
  if(r.terminalItems?.length)return 'Cần xử lý';
  if(r.phase==='RECEIVED'&&pendingEvidence(r))return evidenceLabel(r);
  return ({RECONCILED:'Đã xác nhận',RECEIVED:'Cần đối soát',UNKNOWN_OUTCOME:'Chưa rõ kết quả',IN_FLIGHT:'Đang xử lý',PREPARED:'Chờ gửi',CONFLICT:'Dữ liệu đã thay đổi',REJECTED:'Chưa được chấp nhận'} as Record<string,string>)[r.phase]??'Chưa xác nhận';
}
function snapshotCode(record: OfflineJournalRecord) {
  const snapshot = (record.receipt as { snapshot?: { taskCode?: string; instructions?: string } })?.snapshot;
  return snapshot?.taskCode?.trim() || snapshot?.instructions?.trim().match(/^([A-Z0-9][A-Z0-9_-]{2,24}):/)?.[1];
}
function recordHeading(record: OfflineJournalRecord, sources: OfflineJournalRecord[]): string {
  const kind = String(record.proof.kind);
  const base = ({
    'signed-field-batch': 'Hồ sơ hiện trường', 'start-reconciliation': 'Bắt đầu nhiệm vụ', enrollment: 'Đăng ký thiết bị',
    snapshot: 'Dữ liệu nhiệm vụ', revocation: 'Thu hồi thiết bị', safety: 'An toàn hiện trường',
    'review-request': 'Yêu cầu xem xét lại', 'handover-export': 'Gói bàn giao đã tạo', 'handover-import': 'Hồ sơ nhận bàn giao',
  } as Record<string, string>)[kind] ?? 'Thao tác đã lưu';
  if (kind === 'snapshot') return snapshotCode(record) || base;
  try {
    type SourceReference = { snapshotId?: string; taskId?: string };
    const body = JSON.parse(record.body) as SourceReference & { operations?: SourceReference[] };
    const codes = new Set<string>();
    for (const operation of body.operations ?? [body]) {
      const source = sources.find(row => {
        if (row.projectId !== record.projectId || row.proof.kind !== 'snapshot') return false;
        const receipt = row.receipt as { id?: string; taskId?: string } | undefined;
        return operation.snapshotId ? receipt?.id === operation.snapshotId : !!operation.taskId && receipt?.taskId === operation.taskId;
      });
      const code = source && snapshotCode(source);
      if (code) codes.add(code);
    }
    return codes.size ? `${base} · ${[...codes].join(', ')}` : base;
  } catch { return base; }
}
const preparationKinds = new Set(['snapshot', 'enrollment', 'revocation']);
/** Real Crew sync route, actor/session keyed by parent. Read never changes pending/legacy state. */
export function CrewOfflinePanel({identity, refreshSignal=0}:{identity:QueueIdentity; refreshSignal?: number}) {
  const router=useRouter();
  const [probe,setProbe]=useState<Awaited<ReturnType<typeof inspectOfflineDevice>>|null>(null);
  const [records,setRecords]=useState<OfflineJournalRecord[]>([]),[confirmedSnapshots,setConfirmedSnapshots]=useState<Set<string>>(new Set()),[confirmedRegistrations,setConfirmedRegistrations]=useState<Set<string>>(new Set()),[revokedRegistrations,setRevokedRegistrations]=useState<Set<string>>(new Set()),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [showDiagnostics,setShowDiagnostics]=useState(false);
  const [showHistory,setShowHistory]=useState(false);
  const [showPreparation, setShowPreparation] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [progress,setProgress]=useState('');
  const sequence=useRef(0),running=useRef(false),refreshQueued=useRef(false);
  useEffect(()=>()=>{sequence.current++;},[]);
  const refresh=useCallback(async function readJournal(){
    if(!sameQueueIdentity(identity))return;
    if(running.current){refreshQueued.current=true;return;}
    running.current=true;setBusy(true);setError('');const n=++sequence.current;
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
    finally {
      running.current=false;
      if(n===sequence.current&&sameQueueIdentity(identity)){
        setBusy(false);setLoaded(true);
        if(refreshQueued.current){refreshQueued.current=false;void readJournal();}
      }
    }
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
      running.current=false;if(n===sequence.current&&sameQueueIdentity(identity)){setBusy(false);if(refreshQueued.current){refreshQueued.current=false;void refresh();}}
    }
  };
  const reconcile=async(record:OfflineJournalRecord)=>{
    if(running.current||!sameQueueIdentity(identity)||(!sameQueueIdentity(record.identity,identity)&&!canRecoverSignedBatch(record)))return;
    running.current=true;setBusy(true);setError('');const n=++sequence.current;
    try {
      setProgress('Đang đối soát kết quả…');
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
      if(n===sequence.current&&sameQueueIdentity(identity)){
        setRecords(rows.filter(r=>r.proof.kind!=='admission-upload'&&r.proof.kind!=='session-confirm'));
        const latest=rows.find(r=>r.id===record.id);
        setProgress(JSON.stringify(latest)===JSON.stringify(record)?'Chưa có kết quả mới. Dữ liệu và lệnh cũ được giữ để đối soát.':latest?.phase==='RECONCILED'?'Máy chủ đã xác nhận đầy đủ gói đã gửi.':'Đã cập nhật kết quả từng thao tác; phần chưa xác nhận vẫn được giữ.');
      }
    }catch(error){console.warn('[CrewOfflinePanel:reconcile] failed');if(n===sequence.current&&sameQueueIdentity(identity))setError('Chưa xác nhận đầy đủ kết quả. Lệnh, khóa và dữ liệu chờ vẫn được giữ nguyên.');}
    finally {
      try{const rows=await (await openOfflineJournal(identity)).list();if(n===sequence.current&&sameQueueIdentity(identity))setRecords(rows.filter(r=>r.proof.kind!=='admission-upload'&&r.proof.kind!=='session-confirm'));}catch{/* Keep last view; partial checkpoints remain durable. */}
      running.current=false;if(n===sequence.current&&sameQueueIdentity(identity)){setBusy(false);if(refreshQueued.current){refreshQueued.current=false;void refresh();}}
    }
  };
  if(!sameQueueIdentity(identity))return null;
  const send=async(record:OfflineJournalRecord)=>{
    if(running.current||!sameQueueIdentity(identity)||(!sameQueueIdentity(record.identity,identity)&&!canRecoverSignedBatch(record)))return;
    running.current=true;setBusy(true);setError('');const n=++sequence.current;
    try{
      const result=await sendSignedFieldIntent(record,identity,stage=>{
        if(n===sequence.current&&sameQueueIdentity(identity))setProgress(({upload_urls:'Đang cấp đường tải ảnh…',upload_put:'Đang tải ảnh…',upload_complete:'Đang xác nhận hoàn tất tải ảnh…',upload_verify:'Đang chờ máy chủ xác minh ảnh…',batch_receipt:'Đang gửi đúng gói đã ký…',reconcile:'Đang đối soát kết quả…'})[stage]);
      });
      if(n===sequence.current&&sameQueueIdentity(identity))setProgress(result.phase==='RECONCILED'?'Máy chủ đã xác nhận đầy đủ gói đã gửi.':JSON.stringify(result)===JSON.stringify(record)?'Chưa có kết quả mới. Dữ liệu và lệnh cũ được giữ để đối soát.':'Đã cập nhật tiến độ; còn thao tác chờ xác nhận hoặc cần xử lý.');
      const rows=await (await openOfflineJournal(identity)).list();
      if(n===sequence.current&&sameQueueIdentity(identity))setRecords(rows.filter(r=>r.proof.kind!=='admission-upload'&&r.proof.kind!=='session-confirm'));
    }catch(error){console.warn('[CrewOfflinePanel:send] failed');if(n===sequence.current&&sameQueueIdentity(identity)){setProgress('');const e=error as {response?:{status?:number;data?:{code?:unknown}};code?:string;uploadStage?:string;message?:string};setError(fieldErrorMessage({response:{status:e?.response?.status,data:{code:e?.response?.data?.code}},code:e?.code,uploadStage:e?.uploadStage,message:['field_verification_pending','field_upload_failed'].includes(e?.message??'')?e.message:undefined}));}}
    finally{
      try{const rows=await (await openOfflineJournal(identity)).list();if(n===sequence.current&&sameQueueIdentity(identity))setRecords(rows.filter(r=>r.proof.kind!=='admission-upload'&&r.proof.kind!=='session-confirm'));}catch{/* Keep last view; durable journal remains authoritative. */}
      running.current=false;if(n===sequence.current&&sameQueueIdentity(identity)){setBusy(false);if(refreshQueued.current){refreshQueued.current=false;void refresh();}}
    }
  };
  const preparation = records.filter(record => preparationKinds.has(String(record.proof.kind))).reverse();
  const operational = records.filter(record => !preparationKinds.has(String(record.proof.kind)));
  const needsAttention = (record: OfflineJournalRecord) => record.terminalItems?.length || ['CONFLICT', 'REJECTED'].includes(record.phase);
  const historyRecords = operational.filter(record => record.phase === 'RECONCILED' && !needsAttention(record)).reverse();
  const activeRecords = operational.filter(record => record.phase !== 'RECONCILED' || needsAttention(record)).reverse();
  const confirmedCount = historyRecords.filter(record => record.proof.kind !== 'handover-export').length;
  const attention = activeRecords.filter(needsAttention).length;
  const waiting = activeRecords.length - attention;
  const canOpenSnapshot = (record: OfflineJournalRecord) => record.proof.kind === 'snapshot' && record.phase === 'RECONCILED' &&
    !revokedRegistrations.has(String(record.proof.registrationId ?? (record.receipt as { deviceRegistrationId?: string })?.deviceRegistrationId ?? '')) &&
    (sameQueueIdentity(record.identity, identity) || (sameOfflinePartition(record.identity, identity) && confirmedSnapshots.has(record.id)));
  const downloaded = preparation.filter(record => record.proof.kind === 'snapshot' && record.phase === 'RECONCILED');
  const taskCount = (snapshots: OfflineJournalRecord[]) => new Set(snapshots.map(record => JSON.stringify([record.projectId, (record.receipt as {taskId?: string})?.taskId ?? record.id]))).size;
  const renderRecord = (r: OfflineJournalRecord) => <View key={r.id} style={styles.record}>
    <View style={styles.recordTitle}>
      <Text style={styles.recordName}>{recordHeading(r, preparation)}</Text>
      <Text style={styles.phase}>{r.proof.kind === 'snapshot' && r.phase === 'RECONCILED'
        ? canOpenSnapshot(r) ? 'Đã tải' : 'Cần xác nhận lại'
        : r.proof.kind === 'handover-export' && r.phase === 'RECONCILED' ? 'Đã lưu gói' : phaseLabel(r)}</Text>
    </View>
    {r.proof.kind === 'snapshot' && r.phase === 'RECONCILED' ? <>
      {typeof (r.receipt as { downloadedAt?: string })?.downloadedAt === 'string' ? <Text style={styles.description}>Tải lúc {new Date((r.receipt as { downloadedAt: string }).downloadedAt).toLocaleString('vi-VN')}</Text> : null}
      {canOpenSnapshot(r) ? <Button title="Mở dữ liệu nhiệm vụ" variant="secondary" disabled={busy} onPress={() => {
        if (sameQueueIdentity(identity)) router.push({pathname:'/(crew)/wo-detail',params:{id:JSON.parse(r.body).taskId,projectId:r.projectId,offline:'1'}});
      }} /> : <Text style={styles.description}>Mở nhiệm vụ gốc khi có mạng để xác nhận lại phiên hoặc cập nhật dữ liệu.</Text>}
    </> : null}
    {recoveryTask(r)?<Button title="Khôi phục dữ liệu từ lần đăng nhập trước" variant="secondary" disabled={busy} onPress={()=>void recoverDevice(r)}/>:null}
    {!sameQueueIdentity(r.identity,identity)&&sameOfflinePartition(r.identity,identity)&&['enrollment','snapshot'].includes(String(r.proof.kind))&&r.phase!=='RECONCILED'&&!recoveryTask(r)?<Text style={styles.description}>Mở nhiệm vụ gốc khi có mạng để xác nhận lại dữ liệu.</Text>:null}
    {r.terminalItems?.length?<Text style={styles.description}>{r.terminalItems.some(i=>i.state==='STALE_SNAPSHOT'||i.code==='concurrency_conflict')?'Dữ liệu nguồn đã thay đổi. Kiểm tra hồ sơ với người phụ trách.':'Có thao tác bị máy chủ từ chối. Kết quả đã xác nhận và dữ liệu đang chờ vẫn được giữ.'}</Text>:null}
    {r.phase === 'RECEIVED' && pendingEvidence(r) ? <Text style={styles.description}>{evidenceLabel(r) === 'Chờ tải ảnh'
      ? 'Máy chủ còn chờ ảnh của hồ sơ.' : 'Máy chủ đang kiểm tra ảnh đã tải.'}</Text> : null}
    {r.proof.kind === 'handover-import' && r.phase !== 'RECONCILED' && !needsAttention(r) ? <Text style={styles.description}>Để tiếp tục, kiểm tra ủy quyền nhận trong mục Bàn giao hồ sơ.</Text> : null}
    {canRecoverSignedBatch(r)&&(['PREPARED','UNKNOWN_OUTCOME','IN_FLIGHT'].includes(r.phase)||(r.phase==='RECEIVED'&&pendingEvidence(r)))?<Button title={r.phase==='PREPARED'?'Gửi gói đã ký':r.phase==='RECEIVED'?(r.terminalItems?.length?'Tiếp tục tải ảnh còn chờ':'Tiếp tục tải ảnh và đồng bộ'):'Đối soát và gửi lại đúng gói'} variant="secondary" disabled={busy} onPress={()=>void send(r)}/>:null}
    {(sameQueueIdentity(r.identity,identity)||canRecoverSignedBatch(r))&&((r.phase==='RECEIVED'&&['signed-field-batch','start-reconciliation','enrollment','snapshot','revocation'].includes(String(r.proof.kind)))||(['UNKNOWN_OUTCOME','IN_FLIGHT'].includes(r.phase)&&['signed-field-batch','start-reconciliation','enrollment','snapshot'].includes(String(r.proof.kind))))?<Button title="Đối soát kết quả" variant="secondary" disabled={busy} onPress={()=>void reconcile(r)}/>:null}
  </View>;
  return <>
    <Card style={styles.panel}>
      <Text style={styles.title}>Hàng đợi hồ sơ</Text>
      <View style={styles.stateRow}>
        <View style={styles.stateCell}><Text style={styles.value}>{loaded ? waiting : '–'}</Text><Text style={styles.label}>Đang chờ</Text></View>
        <View style={styles.stateCell}><Text style={styles.value}>{loaded ? confirmedCount : '–'}</Text><Text style={styles.label}>Đã xác nhận</Text></View>
        <View style={styles.stateCell}><Text style={styles.value}>{loaded ? attention : '–'}</Text><Text style={styles.label}>Cần xử lý</Text></View>
      </View>
      {error?<Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>:null}
      {progress&&!error?<Text accessibilityLiveRegion="polite" style={styles.description}>{progress}</Text>:null}
      {!loaded && busy ? <Text accessibilityLiveRegion="polite" style={styles.description}>Đang đọc hàng đợi…</Text> : null}
      {loaded && !error && activeRecords.length === 0 ? <Text style={styles.description}>Không có hồ sơ đang chờ hoặc cần xử lý.</Text> : null}
      {activeRecords.map(renderRecord)}
      {historyRecords.length > 0 ? <Pressable accessibilityRole="button" accessibilityLabel="Lịch sử đã xác nhận" accessibilityState={{expanded:showHistory}} onPress={()=>setShowHistory(v=>!v)} style={styles.diagnosticToggle}><Text style={styles.toggleLabel}>Lịch sử đã xác nhận</Text><MaterialIcons name={showHistory?'expand-less':'expand-more'} size={20} color={colors.secondary}/></Pressable> : null}
      {showHistory ? historyRecords.map(renderRecord) : null}
    </Card>
    <Card style={styles.panel}>
      <Text style={styles.title}>Chuẩn bị làm việc ngoại tuyến</Text>
      {error && !downloaded.length ? <Text style={styles.description}>Chưa đọc được bản tải trên thiết bị.</Text> : !loaded ? <Text style={styles.description}>Đang đọc bản tải trên thiết bị…</Text> : downloaded.length ?
        <Text style={styles.description}>{taskCount(downloaded)} nhiệm vụ đã tải · {taskCount(downloaded.filter(canOpenSnapshot))} có bản tải cho phiên này</Text> :
        <Text style={styles.description}>Chưa có bản tải. Mở nhiệm vụ khi có mạng để tải dữ liệu.</Text>}
      {preparation.length ? <Pressable accessibilityRole="button" accessibilityLabel="Dữ liệu nhiệm vụ đã tải" accessibilityState={{ expanded: showPreparation }} onPress={() => setShowPreparation(value => !value)} style={styles.diagnosticToggle}>
        <Text style={styles.toggleLabel}>Xem bản tải và khôi phục</Text><MaterialIcons name={showPreparation ? 'expand-less' : 'expand-more'} size={20} color={colors.secondary} />
      </Pressable> : null}
      {showPreparation || preparation.some(record => record.phase !== 'RECONCILED')
        ? preparation.filter(record => showPreparation || record.phase !== 'RECONCILED').map(renderRecord) : null}
      <Pressable accessibilityRole="button" accessibilityLabel="Chi tiết kỹ thuật" accessibilityState={{expanded:showDiagnostics}} onPress={()=>setShowDiagnostics(v=>!v)} style={styles.diagnosticToggle}><Text style={styles.toggleLabel}>Chi tiết kỹ thuật</Text><MaterialIcons name={showDiagnostics?'expand-less':'expand-more'} size={20} color={colors.secondary}/></Pressable>
      {showDiagnostics?<View style={styles.diagnostics}><Text style={styles.description}>Thiết bị: {probe?.capability.apiLevel || 'Chưa đọc'}</Text><Text style={styles.description}>{NATIVE_ACCEPTANCE_VERIFIED?'Đã có bằng chứng native trong phạm vi đã kiểm.':'Chưa có bằng chứng native đủ để mở gửi offline.'}</Text><Pressable accessibilityRole="button" style={styles.readButton} onPress={()=>void refresh()} disabled={busy}><Text style={styles.readLabel}>{busy?'Đang đọc…':'Đọc lại nhật ký'}</Text></Pressable></View>:null}
    </Card>
  </>;
}

const styles = StyleSheet.create({
  panel: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, gap: spacing.sm, marginBottom: spacing.md },
  description: { ...typography.caption, color: colors.secondary },
  title: { ...typography.titleMd, color: colors.neutral },
  recordName: { ...typography.labelLg, color: colors.neutral, flexGrow: 1, flexShrink: 1 },
  toggleLabel: { ...typography.labelLg, color: colors.neutral, flexShrink: 1 },
  stateRow: { flexDirection:'row', flexWrap:'wrap', gap:spacing.sm },
  stateCell: { flexBasis:'28%', flexGrow:1, backgroundColor:colors.surfaceAlt, borderRadius:radius.lg, padding:spacing.sm },
  value: { ...typography.titleMd, fontSize:28, lineHeight:36, fontVariant:['tabular-nums'], color: colors.neutral, textAlign:'center' },
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

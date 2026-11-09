import React, { useCallback, useRef, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Chip } from '../../src/components/Chip';
import { InputField } from '../../src/components/InputField';
import { Toast } from '../../src/components/Toast';
import { CrewTaskBoundary, useCrewIdentity, TASK_MODE_CHIP } from './tasks';
import { fieldCapabilityBlock, validateCrewTaskDetail, getFieldInspectionTaskDetailReal, getFieldSubmissionDetailReal,
  type CrewTask, type FieldMeasurementInput, type FieldPositionProofInput, type FieldSubmissionViewFact } from '../../src/api/crewApi';
import { reconcileFieldDraft, currentFieldContext, openFieldRuntime, loadFieldDraft, startNewFieldSessionDraft, measurementTemplate, saveFieldMeasurements,
  uploadFieldCapture, submitFieldDraft, acknowledgeFieldResult, fieldDraftPending, fieldErrorMessage, downloadFieldPhoto, removeLocalFieldCapture,
  type FieldDraft } from '../../src/api/crewFieldDraft';
import { prepareRepairSupplement, dispatchRepair, readRepairHistory, repairRuntime, repairErrorMessage } from '../../src/api/crewRepairWorkflow';
import { currentRepairIdentity, type RepairJournalRecord } from '../../src/api/crewRepairDraft';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

function safeFieldErrorDetail(error: unknown): string {
  const status=(error as {response?:{status?:number}})?.response?.status;
  const stage=(error as {uploadStage?:unknown})?.uploadStage;
  if (stage === 'upload_put') return status ? `Bước tải bytes trả về HTTP ${status}. URL có chữ ký và lệnh tải vẫn được giữ để đối soát.` : 'Bước tải bytes chưa có kết quả chắc chắn; phiên và lệnh cũ vẫn được giữ.';
  if (status) return `Máy chủ trả về HTTP ${status}. Không tự tạo phiên hoặc gửi lại khi chưa đối soát.`;
  return 'Không có thêm chi tiết an toàn để hiển thị. Không đưa URL có chữ ký, token hoặc bytes vào giao diện.';
}

function FieldErrorPanel({title,message,detail,expanded,onToggle,tone='error'}:{title:string;message:string;detail:string;expanded:boolean;onToggle:()=>void;tone?:'error'|'success'|'pending'}) {
  const palette=tone==='success'?{icon:'check-circle' as const,color:colors.success,style:styles.successPanel}:tone==='pending'?{icon:'hourglass-top' as const,color:colors.warning,style:styles.pendingPanel}:{icon:'error-outline' as const,color:colors.error,style:styles.errorPanel};
  return <Card style={palette.style}>
    <View style={styles.errorHeading}><MaterialIcons name={palette.icon} size={20} color={palette.color}/><Text style={[styles.errorTitle,{color:palette.color}]}>{title}</Text></View>
    <Text accessibilityLiveRegion="polite" style={[styles.errorMessage,tone==='error'?null:styles.noticeMessage]}>{message}</Text>
    <Pressable accessibilityRole="button" accessibilityState={{expanded}} onPress={onToggle} style={styles.detailToggle}><Text style={styles.detailLabel}>{expanded?'Ẩn chi tiết':'Chi tiết'}</Text><MaterialIcons name={expanded?'expand-less':'expand-more'} size={18} color={colors.secondary}/></Pressable>
    {expanded?<Text style={styles.errorDetail}>{detail}</Text>:null}
  </Card>;
}

/** Display only: stored instrument and backend free text are never rewritten. */
export function crewInstrumentLabel(value: string): string {
  if (value === 'RULER') return 'Thước đo';
  if (value === 'MANUAL') return 'Thủ công';
  return value || 'Chưa có thông tin';
}

export function fieldTaskStatusLabel(status: string | null | undefined): string {
  const labels: Record<string, string> = {
    NewAssigned: 'Mới phân công', Accepted: 'Đã nhận', InProgress: 'Đang thực hiện',
    Submitted: 'Đã nộp', SupplementRequired: 'Cần bổ sung', Completed: 'Đã hoàn tất',
    Rejected: 'Đã từ chối', Cancelled: 'Đã hủy',
  };
  return labels[status ?? ''] ?? 'Chưa xác định trạng thái';
}

export function fieldMissingReasonLabel(reason: string): string {
  const labels: Record<string, string> = {
    MEASUREMENT_MISSING: 'Chưa có số đo hiện trường',
    REQUIRED_MEASUREMENT_MISSING: 'Thiếu loại số đo bắt buộc',
    MEASUREMENT_VALUE_UNKNOWN: 'Giá trị số đo chưa xác định',
    LOCATION_UNKNOWN: 'Chưa có bằng chứng vị trí',
    GPS_SOURCE_BINDING_UNAVAILABLE: 'Nguồn GPS chưa liên kết được với nhiệm vụ',
    LOCATION_PROOF_CONTRADICTORY: 'Bằng chứng vị trí không nhất quán',
    POSITION_CHECKLIST_INSUFFICIENT: 'Đối chiếu vị trí chưa đủ',
    EVIDENCE_MISSING: 'Chưa có ảnh bằng chứng',
    EVIDENCE_UPLOAD_NOT_CREATED: 'Ảnh chưa có lượt tải lên',
    EVIDENCE_PENDING: 'Ảnh đang chờ máy chủ xác minh',
    AFTER_CAPTURE_PROVENANCE_INSUFFICIENT: 'Ảnh sau sửa chưa đủ nguồn gốc chụp',
    AFTER_EVIDENCE_MISSING: 'Chưa có ảnh sau sửa',
    AFTER_ATTEMPT_BINDING_UNAVAILABLE: 'Ảnh sau sửa chưa liên kết được lượt sửa chữa',
  };
  return labels[reason] ?? `Máy chủ trả mã chưa có diễn giải: ${reason}`;
}
export function fieldMissingReasonLabels(reasons: string[] | null | undefined): string[] { return (reasons ?? []).filter(Boolean).map(fieldMissingReasonLabel); }
export function fieldTaskReadOnly(status: string | null | undefined): boolean { return status === 'Submitted' || status === 'Completed'; }
export function fieldRequestIsCurrent(requestSequence: number, latestSequence: number): boolean { return requestSequence === latestSequence; }
export function fieldSubmissionSummary(status: string | null | undefined, readiness: string | null | undefined): string {
  if (fieldTaskReadOnly(status)) return readiness === 'INCOMPLETE' ? 'Đã nộp; máy chủ ghi nhận còn thiếu thông tin.' : 'Đã nộp; chỉ đọc kết quả máy chủ.';
  return readiness === 'INCOMPLETE' ? 'Hồ sơ chưa đủ theo kiểm tra máy chủ.' : 'Chưa có kết quả đầy đủ từ máy chủ.';
}
export function fieldEvidenceActionModel(status: string | null | undefined, captureBlock: string | null, captureCount: number) {
  const readOnly = status === 'Submitted' || status === 'Completed';
  const canCapture = !readOnly && !captureBlock;
  return { readOnly, canCapture, canUpload: canCapture && captureCount > 0, statusLabel: fieldTaskStatusLabel(status), blockReason: captureBlock ?? null };
}

export function measurementValidationMessage(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  const number = Number(raw.replace(',', '.'));
  return Number.isFinite(number) && number >= 0 ? null : 'Nhập một số từ 0 trở lên.';
}

export function fieldEvidenceStatus(capture: { verified?: boolean; completed?: boolean; upload?: { status?: string } }) {
  const status = capture.upload?.status;
  if (!status) return { label: 'Đã lưu trên thiết bị', variant: 'status-pending' as const };
  if (status === 'PENDING') return { label: 'Đang chờ tải lên', variant: 'status-pending' as const };
  if (status === 'UPLOADING') return { label: 'Đang tải lên', variant: 'status-pending' as const };
  if (status === 'VERIFYING') return { label: 'Đang xác minh', variant: 'status-pending' as const };
  if (status === 'VERIFIED') return { label: 'Máy chủ đã xác minh', variant: 'approved' as const };
  if (status === 'FAILED') return { label: 'Máy chủ không xác minh được ảnh', variant: 'rejected' as const };
  const safeStatus = status.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40) || 'UNKNOWN';
  return { label: `Máy chủ trả mã chưa có diễn giải: ${safeStatus}`, variant: 'status-pending' as const };
}

export function fieldSubmissionReadinessLabel(readiness: string | null | undefined) {
  return readiness === 'READY' ? 'Đủ thông tin theo máy chủ' : readiness === 'INCOMPLETE' ? 'Cần bổ sung thông tin' : 'Chưa xác nhận độ đầy đủ';
}

export default function CrewFieldReviewScreen() {
  return <CrewTaskBoundary operational={false}>{task => <CrewFieldReviewScreenContent task={task} />}</CrewTaskBoundary>;
}
function CrewFieldReviewScreenContent({ task }: { task: CrewTask }) {
  const params=typeof useLocalSearchParams==='function'?useLocalSearchParams<{supplement?:string}>():{};
  const supplementMode=params.supplement==='1';
  const identity=useCrewIdentity();
  const [draft,setDraft]=useState<FieldDraft|null>(null);
  const [measurements,setMeasurements]=useState<FieldMeasurementInput[]>([]);
  const [rawValues,setRawValues]=useState<Record<string,string>>({});
  const [locationProof,setLocationProof]=useState<FieldPositionProofInput|null>(null);
  const [chainage,setChainage]=useState('');
  const [latest,setLatest]=useState<FieldSubmissionViewFact|null>(null);
  const [verifiedTask,setVerifiedTask]=useState<CrewTask['detail']|null>(null);
  const [verifiedEtag,setVerifiedEtag]=useState('');
  const [previousMeasurements,setPreviousMeasurements]=useState<FieldMeasurementInput[]>([]);
  const [busy,setBusy]=useState(false), busyRef=useRef(false);
  const [loading,setLoading]=useState(true), [error,setError]=useState('');
  const [replayConfirmed,setReplayConfirmed]=useState<{key:string;context:string}|null>(null);
  const [repairRecovery,setRepairRecovery]=useState<RepairJournalRecord|null>(null);
  const [repairRecoveryConfirmed,setRepairRecoveryConfirmed]=useState<{key:string;context:string}|null>(null);
  const [notice,setNotice]=useState(''),[noticeDetail,setNoticeDetail]=useState(''),[preview,setPreview]=useState<string|null>(null);
  const [localRecoveryBlocked,setLocalRecoveryBlocked]=useState(false);
  const [historicalDraft,setHistoricalDraft]=useState<FieldDraft|null>(null);
  const [localRecoveryError,setLocalRecoveryError]=useState('');
  const [recoveryDecision,setRecoveryDecision]=useState<'new'|'replay'|null>(null);
  const [serverLoaded,setServerLoaded]=useState(false);
  const [deleteTarget,setDeleteTarget]=useState<string|null>(null),[showErrorDetail,setShowErrorDetail]=useState(false);
  const active=useRef(true);
  const loadSequence=useRef(0);
  const context=()=>currentFieldContext(task.projectId,task.id);
  const current=(c: NonNullable<ReturnType<typeof context>>)=>active.current&&JSON.stringify(context())===JSON.stringify(c);
  const loadRepairRecovery=useCallback(async(c:NonNullable<ReturnType<typeof context>>,fieldSubmissionId?:string)=>{
    const sequence=loadSequence.current;
    if(!supplementMode){setRepairRecovery(null);return;}
    const i=currentRepairIdentity(task.projectId,task.id);if(!i){setRepairRecovery(null);return;}
    try {
      const rows=await readRepairHistory(i,repairRuntime(i),true);
      const row=rows.filter(value=>value.operation==='supplement'&&(!fieldSubmissionId||value.payload.fieldSubmissionId===fieldSubmissionId)).at(-1)??null;
      if(current(c)&&loadSequence.current===sequence)setRepairRecovery(row);
    } catch(e) { if(current(c)&&loadSequence.current===sequence) { setNotice(repairErrorMessage(e)); setNoticeDetail('Không đọc được trạng thái đọc lại từ máy chủ.'); } }
  },[supplementMode,task.id,task.projectId]);
  const load=useCallback(async(refresh=false)=>{
    const c=currentFieldContext(task.projectId,task.id);if(!c)return;
    const sequence=++loadSequence.current;
    const isLatest=()=>current(c)&&fieldRequestIsCurrent(sequence,loadSequence.current);
    setLoading(true);setError('');setReplayConfirmed(null);setRepairRecoveryConfirmed(null);setRecoveryDecision(null);
    if(!refresh){setDraft(null);setLatest(null);setPreview(null);setVerifiedTask(null);setVerifiedEtag('');setPreviousMeasurements([]);setServerLoaded(false);}
    let saved:FieldDraft|null=null, localError='', historical:FieldDraft|null=null;
    try {
      const runtime=await openFieldRuntime(c);
      try{saved=await loadFieldDraft(c,runtime);}catch(e){
        localError=fieldErrorMessage(e);
        if((e as Error)?.message==='field_previous_session_requires_reconciliation'){
          try{historical=await runtime.recoveryRead?.()??null;}catch(recoveryError){localError=fieldErrorMessage(recoveryError);}
        }
      }
    }catch(e){localError=fieldErrorMessage(e);}
    if(!isLatest())return;
    setLocalRecoveryBlocked(!!localError);setLocalRecoveryError(localError);setHistoricalDraft(historical);
    if(localError){setDraft(null);setNotice(`Không thể dùng nháp của phiên này: ${localError} Dữ liệu cũ vẫn được giữ nguyên.`);}
    try {
      const fresh=await getFieldInspectionTaskDetailReal(task.projectId,task.id);
      validateCrewTaskDetail(fresh.data,fresh.etag,task.projectId,task.id,c.actor);
      if(!isLatest())return;
      const previous=fresh.data.latestSubmissionId ? (await getFieldSubmissionDetailReal(task.projectId,task.id,fresh.data.latestSubmissionId)).data : null;
      if(previous&&(previous.taskId!==task.id||previous.id!==fresh.data.latestSubmissionId))throw Error('field_lineage_invalid');
      if(!isLatest())return;
      if(!refresh&&!localError)setDraft(saved);
      setLatest(previous);setVerifiedTask(fresh.data);setVerifiedEtag(fresh.etag);setServerLoaded(true);
      await loadRepairRecovery(c,saved?.result?.id);
      if(!isLatest())return;
      if(!refresh&&!localError){setLocationProof(saved?.locationProof??null);setChainage(saved?.locationProof?.observedChainageMeters==null?'':String(saved.locationProof.observedChainageMeters));setRawValues({});}
      const initial=measurementTemplate(fresh.data.requiredMeasurementType,randomUUID());
      const prior = previous?.measurements?.length ? previous.measurements : [];
      setPreviousMeasurements(prior);
      if(!refresh&&!localError)setMeasurements(saved?.measurements.length ? saved.measurements : initial ? [initial] : []);
    } catch(e){if(isLatest()){setServerLoaded(false);setVerifiedTask(null);setVerifiedEtag('');setError(fieldErrorMessage(e));setNoticeDetail('Không đọc được trạng thái nhiệm vụ từ máy chủ.');}}
    finally{if(isLatest())setLoading(false);}
  },[loadRepairRecovery,task.id,task.projectId,identity.scope]);
  useFocusEffect(useCallback(()=>{active.current=true;void load();return()=>{active.current=false;};},[load]));
  const block=localRecoveryBlocked?'Cần đối soát nháp cũ trước khi lưu hoặc gửi hồ sơ.':!identity.user||!identity.scope||!verifiedTask||loading?'Chưa xác minh trạng thái nhiệm vụ mới nhất từ máy chủ.':fieldCapabilityBlock(verifiedTask,verifiedEtag,identity.user.id,'submit');
  const captureBlock=localRecoveryBlocked?'Cần đối soát nháp cũ trước khi thêm ảnh.':!identity.user||!identity.scope||!verifiedTask||loading?'Chưa xác minh trạng thái nhiệm vụ mới nhất từ máy chủ.':fieldCapabilityBlock(verifiedTask,verifiedEtag,identity.user.id,'capture');
  const evidenceModel=fieldEvidenceActionModel(verifiedTask?.status, captureBlock, draft?.captures.length ?? 0);
  const taskReadOnly=fieldTaskReadOnly(verifiedTask?.status);
  const frozen=!!draft?.command;
  const normalMeasurement=verifiedTask?.mode==='NORMAL'&&!draft?.repairClaim&&!supplementMode;
  const recoverHistorical=async(action:'new'|'read'|'replay')=>{
    if(busyRef.current)return;
    const c=context();if(!c||!current(c)||!historicalDraft||!serverLoaded)return;
    if(action==='replay'&&recoveryDecision!=='replay')return;
    if(action==='new'&&recoveryDecision!=='new')return;
    busyRef.current=true;setBusy(true);setRecoveryDecision(null);
    try {
      if(action==='new')await startNewFieldSessionDraft(c);
      else await reconcileFieldDraft(c,action==='replay',historicalDraft.command?.key);
      if(current(c))await load();
    }catch(e){if(current(c)){setNotice(fieldErrorMessage(e));setNoticeDetail(safeFieldErrorDetail(e));}}
    finally{busyRef.current=false;if(current(c))setBusy(false);}
  };
  const run=async(action:'save'|'upload'|'submit'|'replay'|'reconcile'|'recover'|'new'|'download',fileId?:string)=>{
    if(busyRef.current)return;
    const c=context();if(!c)return;
    if(action==='replay'&&(!replayConfirmed||replayConfirmed.key!==draft?.command?.key||replayConfirmed.context!==JSON.stringify(c)))return;
    if(action==='recover'&&(!repairRecovery||repairRecovery.phase==='CONFIRMED'||
      (['PREPARED','PENDING'].includes(repairRecovery.phase)&&(!repairRecoveryConfirmed||repairRecoveryConfirmed.key!==repairRecovery.key||repairRecoveryConfirmed.context!==JSON.stringify(c)))))return;
    busyRef.current=true;setBusy(true);setNotice('');setReplayConfirmed(null);
    setRepairRecoveryConfirmed(null);
    try {
      const runtime=await openFieldRuntime(c);
      let saved:FieldDraft;
      if(action==='recover') {
        const i=currentRepairIdentity(task.projectId,task.id);if(!i||!repairRecovery)throw Error('repair_session_changed');
        const result=await dispatchRepair(i,repairRecovery.key,repairRuntime(i));
        if(current(c))setRepairRecovery(result);
        setNotice(result.phase==='CONFIRMED'?'Đã đối soát bổ sung đã lưu từ máy chủ.':'Chưa xác nhận kết quả. Lệnh bổ sung gốc được giữ nguyên.');
        return;
      }
      if(action==='replay'||action==='reconcile')saved=await reconcileFieldDraft(c,action==='replay',draft?.command?.key);
      else if(action==='new')saved=await acknowledgeFieldResult(c);
      else if(action==='download')saved=draft??await loadFieldDraft(c,runtime);
      else saved=await loadFieldDraft(c,runtime);
      if(action==='download') {const uri=await downloadFieldPhoto(c,fileId!);if(current(c))setPreview(uri);return;}
      if(['save','upload','submit'].includes(action)) {
        if(saved.command)throw Error('field_command_pending');
        if(Object.values(rawValues).some(v=>v.trim()!==''&&(!Number.isFinite(Number(v.replace(',','.')))||Number(v.replace(',','.'))<0)))throw Error('field_measurements_required');
        if(chainage.trim()!==''&&(!Number.isFinite(Number(chainage.replace(',','.')))||Number(chainage.replace(',','.'))<0))throw Error('field_measurements_required');
        const proof=locationProof?{...locationProof,observedChainageMeters:chainage.trim()===''?null:Number(chainage.replace(',','.'))}:null;
        saved=await saveFieldMeasurements(c,measurements,proof);
      }
      if(action==='upload') for(let i=0;i<saved.captures.length;i++)saved=await uploadFieldCapture(saved,i,runtime);
      if(action==='submit') {
        saved=await submitFieldDraft(saved,runtime);
        if(supplementMode&&saved.command?.phase==='confirmed') {
          const repairIdentity=currentRepairIdentity(task.projectId,task.id);
          if(!repairIdentity) throw Error('repair_session_changed');
          const rows=await readRepairHistory(repairIdentity,repairRuntime(repairIdentity),true);
          const existing=rows.filter(row=>row.operation==='supplement'&&row.payload.fieldSubmissionId===saved.result?.id).at(-1);
          if(existing) {
            if(current(c))setRepairRecovery(existing);
            setNotice('Bản FIELD đã xác nhận; lệnh bổ sung đã lưu cần được tiếp tục hoặc đối soát riêng.');
            return;
          }
          const command=await prepareRepairSupplement(repairIdentity,saved,repairRuntime(repairIdentity));
          const result=await dispatchRepair(repairIdentity,command.key,repairRuntime(repairIdentity));
          if(result.phase!=='CONFIRMED') {if(current(c))setRepairRecovery(result);throw Error('repair_reconciliation_pending');}
        }
      }
      if(!current(c))return;
      setDraft({...saved});
      setNotice(saved.command?.phase==='confirmed'?'Đã đọc lại và xác nhận hồ sơ từ máy chủ. '+(saved.result?.readiness==='READY'?'Đủ thông tin theo đánh giá máy chủ; chưa phải nghiệm thu.':'Hồ sơ còn thiếu thông tin; chưa được nghiệm thu.'):
        action==='upload'?'Ảnh đã được máy chủ xác minh.':saved.command?'Chưa xác nhận kết quả. Lệnh gốc được giữ nguyên.':'Đã lưu nháp cục bộ.');
      if(action==='new')await load();
    }catch(e){if(current(c)){
      setNotice(fieldErrorMessage(e));
      setNoticeDetail(safeFieldErrorDetail(e));
      try{const saved=await loadFieldDraft(c,await openFieldRuntime(c));if(current(c)){setDraft(saved);await loadRepairRecovery(c,saved.result?.id);}}catch{/* keep explicit error; never reset an unresolved command */}
    }}finally{busyRef.current=false;if(current(c))setBusy(false);}
  };
  const removeLocalCapture = (captureId: string) => setDeleteTarget(captureId);
  const confirmRemoveLocalCapture = () => {
    const captureId=deleteTarget; setDeleteTarget(null); if (!captureId) return;
    void (async () => {
        const ctx = context();
        try {
          if (!ctx) return;
          const saved = await removeLocalFieldCapture(ctx, captureId);
          if (current(ctx)) setDraft(saved);
        } catch (e) { if (ctx && current(ctx)) { setNotice(fieldErrorMessage(e)); setNoticeDetail(safeFieldErrorDetail(e)); } }
      })();
  };
  const update=(index:number,change:Partial<FieldMeasurementInput>)=>{if(busy||frozen)return;setMeasurements(values=>values.map((v,i)=>i===index?{...v,...change}:v));};
  const mode=TASK_MODE_CHIP[task.task_mode];
  return <SafeAreaScreen scroll header={<AppHeader subtitle="Hồ sơ hiện trường" showBack onBack={()=>router.back()} />}>
    <View style={styles.content}>
      <Card style={styles.card}><View style={styles.summaryHeader}><View style={styles.flex}><Text style={typography.titleMd}>{task.title||'Nhiệm vụ hiện trường'}</Text><View style={styles.summaryHeader}><Chip label={`Nhiệm vụ: ${fieldTaskStatusLabel(verifiedTask?.status ?? task.status)}`} variant={mode.variant}/>{serverLoaded&&latest?<Chip label={`Hồ sơ: ${fieldSubmissionReadinessLabel(latest.readiness)}`} variant={latest.readiness==='READY'?'approved':'status-pending'} uppercase={false}/>:null}</View></View><Pressable accessibilityRole="button" accessibilityLabel="Tải lại hồ sơ hiện trường" style={({pressed})=>[styles.refreshAction,pressed&&styles.refreshPressed]} disabled={busy||loading} onPress={()=>void load(true)}><MaterialIcons name="refresh" size={18} color={colors.secondary}/></Pressable></View>
        <Text>{supplementMode?'Bản bổ sung FIELD cho yêu cầu SUPPLEMENT.':draft?.repairClaim?'Hồ sơ đo kiểm sau sửa.':'Kết quả đo kiểm hiện trường.'}</Text></Card>
      {loading?<Text>Đang tải hồ sơ…</Text>:null}
      {error?<FieldErrorPanel title="Không đọc được hồ sơ" message={error} detail={noticeDetail} expanded={showErrorDetail} onToggle={()=>setShowErrorDetail(v=>!v)} />:null}
      {localRecoveryBlocked?<Card style={styles.card}><Text style={styles.sectionTitle}>Nháp cũ cần đối soát</Text><Text style={styles.muted}>{localRecoveryError} Ảnh, số đo và lệnh cũ vẫn được giữ trên thiết bị; chưa thể chỉnh sửa hay chụp ảnh mới.</Text>
        {historicalDraft?.command?.phase==='acknowledged'?<><Text>Đã có mã hồ sơ máy chủ. Chỉ đọc lại kết quả, không gửi lệnh mới.</Text><Button variant="secondary" title="Đọc lại kết quả đã lưu" disabled={busy||!serverLoaded} onPress={()=>void recoverHistorical('read')}/></>:null}
        {historicalDraft?.command?.phase==='pending'?<><Text>Kết quả lệnh cũ chưa rõ. Chỉ có thể gửi lại nguyên lệnh sau khi xác nhận; không tạo nháp hoặc lệnh mới.</Text><Button variant="secondary" title="Đối soát lệnh gốc" disabled={busy||!serverLoaded} onPress={()=>setRecoveryDecision('replay')}/></>:null}
        {historicalDraft&&!fieldDraftPending(historicalDraft)?<><Text>Nháp phiên cũ không có lệnh đang chờ. Có thể bắt đầu nháp trống cho phiên hiện tại sau khi xác nhận; dữ liệu cũ không được chuyển sang.</Text><Button variant="secondary" title="Tạo nháp trống cho phiên này" disabled={busy||!serverLoaded} onPress={()=>setRecoveryDecision('new')}/></>:null}
        {!historicalDraft?<Text>Không xác định được một nháp cũ an toàn để đối soát. Cần kiểm tra dữ liệu cục bộ; không tự gửi lại hoặc xóa dữ liệu.</Text>:null}
        {recoveryDecision?<View><Text accessibilityRole="alert">{recoveryDecision==='new'?'Sẽ tạo nháp trống mới. Nháp và ảnh phiên cũ được giữ nguyên.':'Có thể thực thi lệnh gốc lần đầu nếu máy chủ chưa nhận; nội dung, khóa và phiên bản gốc được giữ nguyên.'}</Text><Button variant="secondary" title={recoveryDecision==='new'?'Xác nhận tạo nháp trống':'Xác nhận gửi lại lệnh gốc'} disabled={busy||!serverLoaded} onPress={()=>void recoverHistorical(recoveryDecision)}/><Button variant="text" title="Hủy" onPress={()=>setRecoveryDecision(null)}/></View>:null}
      </Card>:null}
      {serverLoaded&&latest?<Card style={styles.card}><View style={styles.summaryHeader}><View style={styles.flex}><Text style={styles.sectionTitle}>Lượt gửi #{latest.revision}</Text><Text style={styles.muted}>{fieldSubmissionSummary(verifiedTask?.status,latest.readiness)}</Text></View></View>{latest.missingReasons?.length&&verifiedTask?.status==='SupplementRequired'?<View style={styles.missingList}><Text style={styles.muted}>Thông tin máy chủ còn thiếu:</Text>{fieldMissingReasonLabels(latest.missingReasons).map(reason=><Text key={reason}>• {reason}</Text>)}</View>:null}
        {(latest.evidence??[]).filter(e=>e.fileId).map(e=><Button key={e.captureOriginId} variant="secondary" title={`Xem ảnh ${e.purpose==='AFTER'?'sau sửa':e.purpose==='BEFORE'?'hiện trạng':'đo kiểm'} riêng tư`} disabled={busy} onPress={()=>void run('download',e.fileId!)}/>)}</Card>:serverLoaded&&!loading?<Card style={styles.card}><Text style={styles.sectionTitle}>Lượt gửi từ máy chủ</Text><Text style={styles.muted}>Chưa có lượt gửi từ máy chủ.</Text></Card>:null}
      {preview?<Image source={{uri:preview}} style={{width:'100%',height:240}} resizeMode="contain"/>:null}
      {draft&&serverLoaded&&!localRecoveryBlocked?<>
        {previousMeasurements.length?<Card style={styles.priorCard}><Text style={styles.sectionTitle}>Số đo lượt trước</Text><Text style={styles.muted}>Chỉ đọc từ lần gửi máy chủ; không dùng làm nháp đang chỉnh.</Text>{previousMeasurements.map(m=><Text key={m.sampleId}>{m.dimension} · {m.value == null ? 'Chưa có giá trị' : `${m.value} ${m.unit}`}</Text>)}</Card>:null}
        <Card style={styles.card}><Text style={styles.sectionTitle}>Số đo đang chỉnh</Text>
          {!measurements.length?<Text>Chưa có loại đo được máy chủ hỗ trợ; chưa thể gửi hồ sơ.</Text>:null}
          {measurements.map((m,i)=><View key={m.sampleId} pointerEvents={busy||frozen||taskReadOnly?'none':'auto'} style={{opacity:busy||frozen||taskReadOnly?0.6:1}}>
            <Text>{m.dimension==='AREA'?'Diện tích hư hại':m.type==='SlabFaultingHeight'?'Độ chênh tấm':m.type==='ShoulderErosionExtent'?'Kích thước xói lở':m.dimension==='LENGTH'?'Chiều dài':'Độ sâu thực tế'} · {m.unit}</Text>
            {!taskReadOnly?<InputField label="Giá trị đo thực" value={rawValues[m.sampleId]??(m.value===null?'':String(m.value))} keyboardType="decimal-pad" onChangeText={text=>{
              if(busy||frozen)return;setRawValues(values=>({...values,[m.sampleId]:text}));
              const normalized=text.trim().replace(',','.');const value=normalized===''?null:Number(normalized);
              update(i,{value,state:value===null?'UNKNOWN':'KNOWN',unknownReason:value===null?m.unknownReason||'Chưa đo tại hiện trường':null});}}/>:null}
            {!taskReadOnly&&measurementValidationMessage(rawValues[m.sampleId]??'')?<Text style={styles.errorText}>{measurementValidationMessage(rawValues[m.sampleId]??'')}</Text>:null}
            {!taskReadOnly&&m.value===null?<InputField label="Lý do chưa đo" value={m.unknownReason??''} onChangeText={unknownReason=>update(i,{unknownReason})}/>:null}
            {!taskReadOnly?<><InputField label="Dụng cụ đo thực tế" value={m.instrument} onChangeText={instrument=>update(i,{instrument})}/><InputField label="Phương pháp đo thực tế" value={m.method} onChangeText={method=>update(i,{method})}/></>:<Text style={styles.muted}>Giá trị máy chủ: {m.value == null ? 'Chưa có' : `${m.value} ${m.unit}`}</Text>}
            {m.latitude==null||m.longitude==null?(taskReadOnly?<Text style={styles.muted}>Chưa có GPS quan sát{m.locationReason?` · ${m.locationReason}`:''}</Text>:<InputField label="Lý do chưa có tọa độ quan sát" value={m.locationReason??''} onChangeText={locationReason=>update(i,{locationReason})}/>):<Text>GPS quan sát trong hồ sơ máy chủ: {m.latitude}, {m.longitude}</Text>}
          </View>)}
          {!taskReadOnly?<><Button variant="secondary" title="Lưu nháp số đo" disabled={busy||frozen} onPress={()=>void run('save')}/><Text style={styles.muted}>Vị trí nhiệm vụ không thay cho bằng chứng quan sát thực tế.</Text><Text style={styles.muted}>Đối chiếu vị trí thực tế (tùy chọn)</Text><View style={styles.choiceRow}>{[['ROUTE_CHAINAGE_MARKINGS_CONFIRMED','Dấu mốc tuyến / lý trình'],['SLAB_MARKINGS_CONFIRMED','Ký hiệu tấm bê tông'],['UNKNOWN','Chưa xác định']].map(([value,label])=>{const selected=locationProof?.checklist===value || (value==='UNKNOWN'&&!locationProof);return <Pressable key={value} accessibilityRole="radio" accessibilityState={{selected}} style={[styles.choiceOption,selected&&styles.choiceOptionSelected]} onPress={()=>value==='UNKNOWN'?(setLocationProof(null),setChainage('')):setLocationProof({kind:'POSITION_CHECKLIST',checklist:value})}><Text style={selected?styles.choiceTextSelected:styles.choiceText}>{label}</Text></Pressable>;})}</View></>:<Text style={styles.muted}>Số đo và đối chiếu vị trí đã khóa vì nhiệm vụ đã nộp/hoàn tất.</Text>}
          {locationProof?.checklist==='ROUTE_CHAINAGE_MARKINGS_CONFIRMED'?<>
            {taskReadOnly?<Text style={styles.muted}>Tuyến: {locationProof.observedRouteVersionId||'Chưa có'} · Lý trình: {chainage||'Chưa có'} m</Text>:<><InputField label="Mã phiên bản tuyến trên hồ sơ đối chiếu" value={locationProof.observedRouteVersionId??''} onChangeText={value=>{if(!busy&&!frozen)setLocationProof({...locationProof,observedRouteVersionId:value});}}/><InputField label="Lý trình quan sát thực tế (m)" value={chainage} keyboardType="decimal-pad" onChangeText={value=>{if(!busy&&!frozen)setChainage(value);}}/></>}
          </>:null}
          {locationProof?.checklist==='SLAB_MARKINGS_CONFIRMED'?(taskReadOnly?<Text style={styles.muted}>Ký hiệu tấm: {locationProof.observedSlabId||'Chưa có'}</Text>:<InputField label="Ký hiệu tấm đã đối chiếu thực tế" value={locationProof.observedSlabId??''} onChangeText={value=>{if(!busy&&!frozen)setLocationProof({...locationProof,observedSlabId:value});}}/>):null}
        </Card>
        <Card style={styles.card}><Text style={styles.sectionTitle}>Ảnh bằng chứng</Text>
          {!draft.captures.length?<Text>Chưa có ảnh nháp của phiên và nhiệm vụ này.</Text>:null}
          {draft.captures.map(c=><View key={c.id} style={styles.missingBox}>
            <View style={styles.evidenceTop}><Image source={{uri:c.uri}} style={styles.thumbnail} resizeMode="cover"/><View style={styles.evidenceBody}><Text style={typography.labelLg}>{c.purpose==='AFTER'?'Sau sửa chữa':c.purpose==='BEFORE'?'Hiện trạng trước sửa':'Đo kiểm'}</Text><Chip {...fieldEvidenceStatus(c)} /><Text style={styles.muted}>{c.coordinates?'Có vị trí camera quan sát':'Không có GPS quan sát'}</Text></View>{!c.upload&&!c.completed&&!c.verified&&!frozen?<Pressable accessibilityRole="button" accessibilityLabel="Xóa ảnh cục bộ" style={styles.removePhoto} onPress={()=>removeLocalCapture(c.id)}><MaterialIcons name="delete-outline" size={20} color={colors.error}/></Pressable>:null}</View>
          </View>)}
          {evidenceModel.readOnly?<Text style={styles.muted}>Trạng thái {evidenceModel.statusLabel}: chỉ xem ảnh và kết quả đọc lại từ máy chủ.</Text>:null}
          {!evidenceModel.readOnly&&captureBlock?<Text>{captureBlock}</Text>:null}
          {evidenceModel.canCapture?<View style={styles.actionRow}><Button style={styles.actionButton} variant="secondary" title="Chụp / chọn ảnh" disabled={busy||frozen} onPress={()=>router.push({pathname:'/(crew)/viewfinder',params:{id:task.id,projectId:task.projectId,mode:draft.repairClaim?'AFTER':'BEFORE',...(supplementMode?{supplement:'1'}:{})}})}/><Button style={styles.actionButton} variant="secondary" title="Tải ảnh đã lưu" disabled={busy||frozen||!evidenceModel.canUpload} onPress={()=>void run('upload')}/></View>:null}
        </Card>
        {block?<Text>{block}</Text>:null}
        {normalMeasurement?<Text>Với sửa chữa theo kế hoạch, lưu số đo và tải ảnh lên để đánh giá trước sửa tại chi tiết nhiệm vụ. Chỉ lập hồ sơ sửa chữa sau khi kết thúc thi công; hồ sơ đo kiểm không thay cho hồ sơ sửa chữa.</Text>:null}
        {!taskReadOnly?<Button variant="primary" title={supplementMode?'Gửi bản bổ sung và liên kết lượt sửa chữa':draft.repairClaim?'Gửi hồ sơ đo kiểm sau sửa':latest?'Gửi bổ sung đo kiểm':'Gửi hồ sơ đo kiểm'} loading={busy} disabled={busy||frozen||normalMeasurement||!!block||!measurements.length||(!draft.captures.length&&!latest?.evidence?.length)||draft.captures.some(c=>!c.verified)} onPress={()=>void run('submit')}/>:null}
        {fieldDraftPending(draft)?<Card style={styles.card}>
          <Text>Kết quả thao tác đang được đối soát. Không tạo hồ sơ mới hoặc thay nội dung lệnh đã lưu.</Text>
          {!draft.command?.responseId?<Text>Chưa có mã hồ sơ được máy chủ xác nhận để đọc lại. Chỉ có thể chủ động đối soát bằng lệnh gốc; tải lại không chứng minh lệnh đã thành công.</Text>:<Text>Đã có mã hồ sơ máy chủ. Có thể đọc lại kết quả mà không gửi lệnh mới.</Text>}
          <Button variant="secondary" title="Chỉ đọc lại kết quả — không gửi" disabled={busy||!draft.command?.responseId} onPress={()=>void run('reconcile')}/>
          {draft.command?.phase==='pending'?<Button variant="secondary" title="Đối soát / gửi lại đúng lệnh đã lưu" disabled={busy} onPress={()=>setReplayConfirmed(draft.command?{key:draft.command.key,context:JSON.stringify(context())}:null)}/>:null}
          {replayConfirmed?<View><Text accessibilityRole="alert">Gửi lại giữ nguyên nội dung, khóa và phiên bản gốc. Nếu máy chủ chưa nhận lệnh, thao tác này có thể thực thi lần đầu.</Text><Button variant="secondary" title="Xác nhận gửi lại lệnh gốc" disabled={busy} onPress={()=>void run('replay')}/><Button variant="text" title="Hủy" onPress={()=>setReplayConfirmed(null)}/></View>:null}
        </Card>:null}
        {supplementMode&&repairRecovery&&repairRecovery.phase!=='CONFIRMED'?<Card style={styles.card}>
          <Text style={styles.sectionTitle}>Đối soát bổ sung hồ sơ sửa chữa</Text>
          <Text>{repairRecovery.phase==='ACKNOWLEDGED'?'Đã có biên nhận API-159 trên thiết bị; chỉ cần đọc lại trạng thái máy chủ.':repairRecovery.phase==='PREPARED'?'Lệnh bổ sung đã lưu nhưng chưa gửi.':'Chưa xác nhận kết quả API-159; lệnh gốc được giữ nguyên.'}</Text>
          <Button variant="secondary" title="Tiếp tục / Đối soát bổ sung đã lưu" disabled={busy} onPress={()=>{
            if(['PREPARED','PENDING'].includes(repairRecovery.phase))setRepairRecoveryConfirmed({key:repairRecovery.key,context:JSON.stringify(context())});
            else void run('recover');
          }}/>
          {repairRecoveryConfirmed?<View><Text accessibilityRole="alert">Sẽ giữ nguyên khóa, nội dung và phiên bản gốc. Nếu máy chủ chưa nhận lệnh, thao tác này có thể thực thi lần đầu.</Text><Button variant="secondary" title="Xác nhận tiếp tục lệnh bổ sung đã lưu" disabled={busy} onPress={()=>void run('recover')}/><Button variant="text" title="Hủy" onPress={()=>setRepairRecoveryConfirmed(null)}/></View>:null}
        </Card>:null}
        {!draft.repairClaim&&draft.command&&['confirmed','rejected'].includes(draft.command.phase)?<Button variant="secondary" title="Đã xem kết quả — tạo nháp mới" disabled={busy} onPress={()=>void run('new')}/>:null}
        {draft.repairClaim&&draft.command?.phase==='confirmed'?<Button variant="secondary" title="Về chi tiết để nộp hồ sơ chờ quản lý" disabled={busy} onPress={()=>router.push({pathname:'/(crew)/wo-detail',params:{id:task.id,projectId:task.projectId}})}/>:null}
        {draft.result?<Card><Text>{draft.result.readiness==='READY'?'Hồ sơ đủ thông tin theo máy chủ':'Hồ sơ cần bổ sung thông tin'}</Text><Text>Đây là kết quả đọc lại hồ sơ, chưa phải xác nhận nghiệm thu.</Text></Card>:null}
      </>:null}
      {notice?<FieldErrorPanel tone={notice.includes('Ảnh đã')||notice.startsWith('Đã lưu')||notice.startsWith('Đã đọc')?'success':notice.includes('đối soát')||notice.includes('chờ')?'pending':'error'} title={notice.includes('Ảnh đã')||notice.startsWith('Đã lưu')||notice.startsWith('Đã đọc')?'Đã cập nhật':notice.includes('đối soát')||notice.includes('chờ')?'Đang chờ đối soát':'Cần xử lý'} message={notice} detail={noticeDetail} expanded={showErrorDetail} onToggle={()=>setShowErrorDetail(v=>!v)} />:null}
      <Modal visible={!!deleteTarget} transparent animationType="fade" onRequestClose={()=>setDeleteTarget(null)}>
        <View style={styles.modalBackdrop}><View style={styles.confirmModal} accessibilityViewIsModal>
          <Text style={styles.sectionTitle}>Xóa ảnh cục bộ?</Text>
          <Text style={styles.muted}>Chỉ ảnh đã chứng minh còn LOCAL mới được xóa. Ảnh đang tải, đã xác minh hoặc có lệnh chưa đối soát sẽ được giữ nguyên.</Text>
          <View style={styles.modalActions}><Button variant="text" title="Hủy" onPress={()=>setDeleteTarget(null)} /><Button variant="secondary" title="Xóa ảnh" onPress={confirmRemoveLocalCapture} /></View>
        </View></View>
      </Modal>
    </View>
  </SafeAreaScreen>;
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xl,
  },
  card: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  priorCard: { marginBottom: spacing.md, gap: spacing.xs, backgroundColor: colors.surfaceAlt },
  missingList: { gap: spacing.xs },
  compactAction: { alignSelf: 'flex-start', minHeight: 36, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  refreshAction: { width: 40, height: 40, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  refreshPressed: { backgroundColor: colors.surfaceAlt },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  actionButton: { flex: 1 },
  thumbnail: { width: 88, height: 88, borderRadius: radius.md },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  summaryTitle: {
    flex: 1,
    color: colors.neutral,
  },
  summaryMeta: {
    color: colors.secondary,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    ...typography.titleMd,
    color: colors.neutral,
    marginBottom: spacing.sm,
  },
  readinessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  missingBox: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    gap: 4,
  },
  evidenceTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  evidenceBody: { flex: 1, gap: 4 },
  removePhoto: { width: 44, height: 44, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  errorPanel: { marginBottom: spacing.md, borderLeftWidth: 3, borderLeftColor: colors.error, gap: spacing.xs },
  successPanel: { marginBottom: spacing.md, borderLeftWidth: 3, borderLeftColor: colors.success, gap: spacing.xs },
  pendingPanel: { marginBottom: spacing.md, borderLeftWidth: 3, borderLeftColor: colors.warning, gap: spacing.xs },
  noticeMessage: { color: colors.neutral },
  errorHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  errorTitle: { ...typography.labelLg, color: colors.neutral },
  errorMessage: { ...typography.bodyMd, color: colors.neutral },
  detailToggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start', minHeight: 40 },
  detailLabel: { ...typography.labelSm, color: colors.secondary },
  errorDetail: { ...typography.caption, color: colors.secondary },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.42)', justifyContent: 'center', padding: spacing.lg },
  confirmModal: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm },
  missingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 2,
  },
  missingText: {
    flex: 1,
    color: colors.secondary,
  },
  muted: {
    color: colors.secondary,
    marginTop: spacing.xs,
  },
  centerText: {
    textAlign: 'center',
  },
  choiceRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  choiceOption: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    justifyContent: 'center',
  },
  choiceOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceAlt,
  },
  choiceText: {
    color: colors.secondary,
    textAlign: 'center',
  },
  choiceTextSelected: {
    color: colors.neutral,
    fontWeight: '700',
    textAlign: 'center',
  },
  evidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  evidenceText: {
    flex: 1,
    color: colors.secondary,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
});

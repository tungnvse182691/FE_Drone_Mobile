import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Image, Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Chip } from '../../src/components/Chip';
import { CrewTaskStatus } from '../../src/components/CrewTaskStatus';
import { CrewPressable, CrewContentTransition } from '../../src/components/crew/CrewMotion';
import { CrewFastTrackMeasurementGuide } from '../../src/components/crew/CrewFastTrackMeasurementGuide';
import { CrewPhotoInfo } from '../../src/components/crew/CrewPhotoInfo';
import { InputField } from '../../src/components/InputField';
import { Toast } from '../../src/components/Toast';
import { CrewTaskBoundary, useCrewIdentity, TASK_MODE_CHIP } from './tasks';
import { repairSupplementBlock, crewLocalReadUnavailable, fieldCapabilityBlock, validateCrewTaskDetail, getFieldInspectionTaskDetailReal, getFieldSubmissionDetailReal, getFieldTaskGeometryReal,
  type CrewTask, type FieldTaskGeometry, type FieldMeasurementInput, type FieldPositionProofInput, type FieldSubmissionViewFact } from '../../src/api/crewApi';
import { chooseCrewPosition, crewPositionSources, crewPositionInputError } from '../../src/utils/crew-position-proof';
import { prepareFieldRepairSupplement, reconcileFieldDraft, currentFieldContext, openFieldRuntime, loadFieldDraft, startNewFieldSessionDraft, measurementTemplate, saveFieldMeasurements,
  uploadFieldCapture, cancelFieldUpload, uploadAndSubmitFieldDraft, acknowledgeFieldResult, fieldDraftPending, fieldErrorMessage, downloadFieldPhoto, removeLocalFieldCapture,
  type FieldDraft } from '../../src/api/crewFieldDraft';
import { prepareRepairSupplement, dispatchRepair, readRepairHistory, repairRuntime, repairErrorMessage } from '../../src/api/crewRepairWorkflow';
import { currentRepairIdentity, type RepairJournalRecord } from '../../src/api/crewRepairDraft';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

function safeFieldErrorDetail(error: unknown): string {
  const status=(error as {response?:{status?:number}})?.response?.status;
  const stage=(error as {uploadStage?:unknown})?.uploadStage;
  if (stage === 'upload_put') return status ? `Bước tải bytes trả về HTTP ${status}. URL có chữ ký và lệnh tải vẫn được giữ để đối soát.` : 'Bước tải bytes chưa có kết quả chắc chắn; phiên và lệnh cũ vẫn được giữ.';
  if (status) return `Máy chủ trả về HTTP ${status}. Không tự tạo phiên hoặc gửi lại khi chưa đối soát.`;
  return '';
}

function FieldErrorPanel({title,message,detail,expanded,onToggle,tone='error'}:{title:string;message:string;detail:string;expanded:boolean;onToggle:()=>void;tone?:'error'|'success'|'pending'}) {
  const palette=tone==='success'?{icon:'check-circle' as const,color:colors.success,style:styles.successPanel}:tone==='pending'?{icon:'hourglass-top' as const,color:colors.warning,style:styles.pendingPanel}:{icon:'error-outline' as const,color:colors.error,style:styles.errorPanel};
  return <Card style={palette.style}>
    <View style={styles.errorHeading}><MaterialIcons name={palette.icon} size={20} color={palette.color}/><Text style={[styles.errorTitle,{color:palette.color}]}>{title}</Text></View>
    <Text accessibilityLiveRegion="polite" style={[styles.errorMessage,tone==='error'?null:styles.noticeMessage]}>{message}</Text>
    <CrewPressable accessibilityRole="button" accessibilityState={{expanded}} onPress={onToggle} style={({pressed})=>[styles.detailToggle,pressed&&styles.refreshPressed]}><Text style={styles.detailLabel}>{expanded?'Ẩn chi tiết':'Chi tiết'}</Text><MaterialIcons name={expanded?'expand-less':'expand-more'} size={18} color={colors.secondary}/></CrewPressable>
    {expanded?<Text style={styles.errorDetail}>{detail}</Text>:null}
  </Card>;
}

export function fieldNoticeModel(notice: string, result?: FieldDraft['result'], detail='') {
  if(result&&(!notice||notice.startsWith('Đã đọc'))) {
    const missing=fieldMissingReasonLabels(result.missingReasons);
    if (fieldAwaitingRepairLink(result.readiness, result.missingReasons)) return {
      title:'Đã gửi hồ sơ',tone:'pending' as const,
      summary:'Ảnh đã lưu · chờ liên kết lượt sửa chữa',
      detail:'Ảnh đã được lưu. Mở hồ sơ hoàn tất để tiếp tục nộp vào lượt sửa chữa. Không cần tải lại ảnh. Chưa có xác nhận nghiệm thu.',
    };
    return {title:'Đã gửi hồ sơ',tone:result.readiness==='INCOMPLETE'?'pending' as const:'success' as const,
      summary:result.readiness==='INCOMPLETE'?(missing[0]??'Cần bổ sung thông tin'):'Máy chủ đã nhận hồ sơ',
      detail:[...missing,...(result.missingReasons?.includes('POSITION_CHECKLIST_INSUFFICIENT')?['Máy chủ chưa đối chiếu được tấm, phân đoạn hoặc lý trình với nguồn của nhiệm vụ. Cần kiểm tra đúng dấu mốc và phạm vi tuyến; không dùng số ví dụ cho mọi nhiệm vụ.']:[]),'Hồ sơ đã được đọc lại từ máy chủ; chưa phải xác nhận nghiệm thu.'].join('\n')};
  }
  const success=notice.includes('Ảnh đã')||notice.startsWith('Đã lưu');
  const pending=notice.includes('đối soát')||notice.includes('chờ');
  return {title:success?'Đã cập nhật':pending?'Cần đối soát':'Chưa hoàn tất',tone:success?'success' as const:pending?'pending' as const:'error' as const,
    summary:success?notice:'Mở chi tiết để xem hướng xử lý',detail:success?'':[notice,detail].filter(Boolean).join('\n')};
}
function FieldNotice({model,expanded,onToggle}:{model:ReturnType<typeof fieldNoticeModel>;expanded:boolean;onToggle:()=>void}) {
  const color=model.tone==='success'?colors.success:model.tone==='pending'?colors.warning:colors.error;
  return <View style={styles.noticeContainer}>
    <View style={[styles.noticeBanner,{borderLeftColor:color}]}>
      <MaterialIcons name={model.tone==='success'?'check-circle':model.tone==='pending'?'info-outline':'error-outline'} size={22} color={color}/>
      <View style={styles.flex} accessibilityLiveRegion="polite"><Text style={styles.errorTitle}>{model.title}</Text><Text style={styles.noticeSummary}>{model.summary}</Text></View>
      {model.detail?<CrewPressable accessibilityRole="button" accessibilityLabel={expanded?'Ẩn chi tiết thông báo':'Xem chi tiết thông báo'} accessibilityState={{expanded}} onPress={onToggle} style={({pressed})=>[styles.noticeToggle,pressed&&styles.refreshPressed]}><MaterialIcons name={expanded?'expand-less':'expand-more'} size={24} color={colors.secondary}/></CrewPressable>:null}
    </View>
    {expanded&&model.detail?<ScrollView style={styles.noticeDetails}><Text style={styles.errorDetail}>{model.detail}</Text></ScrollView>:null}
  </View>;
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

export function fieldMeasurementTitle(type: string) {
  return ({Area:'Diện tích hư hại',SlabFaultingHeight:'Độ chênh tấm',ShoulderErosionExtent:'Kích thước xói lở',DepressionDepth:'Độ sâu chỗ lõm',DepressionLength:'Chiều dài chỗ lõm',DepressionWidth:'Chiều rộng chỗ lõm'} as Record<string,string>)[type] ?? 'Số đo thực tế';
}

export function fieldEvidenceStatus(capture: { verified?: boolean; completed?: boolean; cancelState?: string; upload?: { status?: string; failureCode?: string | null } }) {
  const status = capture.upload?.status;
  if (capture.cancelState === 'REQUESTED' || capture.cancelState === 'UNKNOWN') return { label: 'Chưa rõ kết quả hủy · cần đối soát', variant: 'status-pending' as const };
  if (capture.cancelState === 'CONFIRMED' || (status === 'FAILED' && capture.upload?.failureCode === 'upload_cancelled')) return { label: 'Đã hủy phiên tải', variant: 'status-pending' as const };
  if (!status) return { label: 'Đã lưu trên thiết bị', variant: 'status-pending' as const };
  if (status === 'PENDING') return { label: 'Đang chờ tải lên', variant: 'status-pending' as const };
  if (status === 'UPLOADING') return { label: 'Đang tải lên', variant: 'status-pending' as const };
  if (status === 'VERIFYING') return { label: 'Đang xác minh', variant: 'status-pending' as const };
  if (status === 'VERIFIED') return capture.verified ? { label: 'Máy chủ đã xác minh', variant: 'approved' as const } : { label: 'Đang đối soát ảnh', variant: 'status-pending' as const };
  if (status === 'FAILED') return { label: 'Máy chủ không xác minh được ảnh', variant: 'rejected' as const };
  const safeStatus = status.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40) || 'UNKNOWN';
  return { label: `Máy chủ trả mã chưa có diễn giải: ${safeStatus}`, variant: 'status-pending' as const };
}

export function fieldPhotoFeedback(capture: FieldDraft['captures'][number], active: boolean, transferPercent?: number) {
  const blocked=!!capture.cancelState||capture.upload?.status==='FAILED';
  const verified=!blocked&&!!capture.verified;
  const checking=!verified&&(capture.completed||capture.upload?.status==='VERIFYING'||capture.upload?.status==='VERIFIED');
  const partSize=capture.upload?.partSizeBytes??0;
  const confirmed=capture.parts.reduce((sum,part)=>sum+Math.max(0,Math.min(partSize,capture.size-(part.partNumber-1)*partSize)),0);
  const percent=blocked||verified?null:checking?100:active&&Number.isFinite(transferPercent)?Math.max(0,Math.min(100,Math.floor(transferPercent!))):active&&partSize>0&&capture.size>0?Math.min(100,Math.floor(100*confirmed/capture.size)):null;
  return {verified,busy:active&&!blocked&&!verified,label:blocked?'Cần kiểm tra':verified?'Đã xác minh':checking?'Đang kiểm tra':active?'Đang tải':'Chờ tải',percent};
}

export function fieldAwaitingRepairLink(readiness: string | null | undefined, reasons?: string[] | null) {
  return readiness === 'INCOMPLETE' && reasons?.length === 1 && reasons[0] === 'AFTER_ATTEMPT_BINDING_UNAVAILABLE';
}
export function fieldSubmissionReadinessLabel(readiness: string | null | undefined, reasons?: string[] | null) {
  if (fieldAwaitingRepairLink(readiness, reasons)) return 'Chờ liên kết lượt sửa chữa';
  return readiness === 'READY' ? 'Đủ thông tin theo máy chủ' : readiness === 'INCOMPLETE' ? 'Cần bổ sung thông tin' : 'Chưa xác nhận độ đầy đủ';
}

export default function CrewFieldReviewScreen() {
  return <CrewTaskBoundary operational={false} localDraft>{task => <CrewFieldReviewScreenContent task={task} />}</CrewTaskBoundary>;
}
function CrewFieldReviewScreenContent({ task }: { task: CrewTask }) {
  const router = useRouter();
  const params=typeof useLocalSearchParams==='function'?useLocalSearchParams<{supplement?:string;signed?:string}>():{};
  const supplementMode=params.supplement==='1';
  const signedMode=params.signed==='1';
  const identity=useCrewIdentity();
  const [draft,setDraft]=useState<FieldDraft|null>(null);
  const [measurements,setMeasurements]=useState<FieldMeasurementInput[]>([]);
  const [showMeasurementChoices,setShowMeasurementChoices]=useState(false);
  const [showMeasurements,setShowMeasurements]=useState(false);
  const [showPosition,setShowPosition]=useState(false);
  const [showEvidenceHelp,setShowEvidenceHelp]=useState(false);
  const [showAssessmentHelp,setShowAssessmentHelp]=useState(false);
  const [editingSampleId,setEditingSampleId]=useState<string|null>(null);
  const [showRecoveryDetail,setShowRecoveryDetail]=useState(false);
  const [rawValues,setRawValues]=useState<Record<string,string>>({});
  const [locationProof,setLocationProof]=useState<FieldPositionProofInput|null>(null);
  const [chainage,setChainage]=useState('');
  const [positionGeometry,setPositionGeometry]=useState<FieldTaskGeometry|null>(null);
  const [latest,setLatest]=useState<FieldSubmissionViewFact|null>(null);
  const [verifiedTask,setVerifiedTask]=useState<CrewTask['detail']|null>(null);
  const [verifiedEtag,setVerifiedEtag]=useState('');
  const [previousMeasurements,setPreviousMeasurements]=useState<FieldMeasurementInput[]>([]);
  const [busy,setBusy]=useState(false), busyRef=useRef(false);
  const [busyAction,setBusyAction]=useState('');
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
  const [localOnly,setLocalOnly]=useState(false);
  // The boundary scopes this snapshot to the current actor, session, environment and task.
  // Definitive read failures revoke it until a successful read replaces it.
  const localSnapshot=useRef(task.detail ? {data:task.detail,etag:task.etag??''} : null);
  const [deleteTarget,setDeleteTarget]=useState<string|null>(null),[showErrorDetail,setShowErrorDetail]=useState(false);
  const [cancelTarget,setCancelTarget]=useState<string|null>(null);
  const [cancelling,setCancelling]=useState(false),cancelRef=useRef(false);
  const [uploadingCaptureId,setUploadingCaptureId]=useState<string|null>(null);
  const active=useRef(true);
  const loadSequence=useRef(0);
  const context=()=>currentFieldContext(task.projectId,task.id);
  const current=(c: NonNullable<ReturnType<typeof context>>)=>active.current&&JSON.stringify(context())===JSON.stringify(c);
  const [transferProgress,setTransferProgress]=useState<{captureId:string;percent:number}|null>(null);
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
    setLoading(true);setError('');setLocalOnly(false);setReplayConfirmed(null);setRepairRecoveryConfirmed(null);setRecoveryDecision(null);
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
      if(!localError)setDraft(saved);
      localSnapshot.current=fresh;
      setLatest(previous);setVerifiedTask(fresh.data);setVerifiedEtag(fresh.etag);setServerLoaded(true);
      setPositionGeometry(null);
      if(fresh.data.segmentSetId&&!fresh.data.slabId){
        try{const geometry=await getFieldTaskGeometryReal(task.projectId,task.id);if(isLatest())setPositionGeometry(geometry.data);}
        catch{/* Geometry may be source_not_ready. Route/slab authority remains the task DTO. */}
        if(!isLatest())return;
      }
      await loadRepairRecovery(c,saved?.result?.id);
      if(!isLatest())return;
      if(!refresh&&!localError){setLocationProof(saved?.locationProof??null);setChainage(saved?.locationProof?.observedChainageMeters==null?'':String(saved.locationProof.observedChainageMeters));setRawValues({});}
      const initial=measurementTemplate(fresh.data.requiredMeasurementType,randomUUID());
      const prior = previous?.measurements?.length ? previous.measurements : [];
      setPreviousMeasurements(prior);
      if(!refresh&&!localError)setMeasurements(saved?.measurements.length ? saved.measurements : initial ? [initial] : []);
    } catch(e){if(isLatest()){
      setServerLoaded(false);setVerifiedTask(null);setVerifiedEtag('');
      if(!crewLocalReadUnavailable(e))localSnapshot.current=null;
      const snapshot=localSnapshot.current;
      if(crewLocalReadUnavailable(e)&&snapshot&&!localError){
        try {
          validateCrewTaskDetail(snapshot.data,snapshot.etag,task.projectId,task.id,c.actor);
          setDraft(saved);setLatest(null);setVerifiedTask(snapshot.data);setVerifiedEtag(snapshot.etag);setLocalOnly(true);
          setPositionGeometry(null);setRepairRecovery(null);
          if(!refresh){
            setLocationProof(saved?.locationProof??null);
            setChainage(saved?.locationProof?.observedChainageMeters==null?'':String(saved.locationProof.observedChainageMeters));
            setRawValues({});
            const initial=measurementTemplate(snapshot.data.requiredMeasurementType,randomUUID());
            setMeasurements(saved?.measurements.length?saved.measurements:initial?[initial]:[]);
          }
        }catch{localSnapshot.current=null;setError('Dữ liệu đã tải không còn hợp lệ. Kết nối mạng để kiểm tra lại.');}
      }else{setError(fieldErrorMessage(e));setNoticeDetail('Không đọc được trạng thái nhiệm vụ từ máy chủ.');}
    }}
    finally{if(isLatest())setLoading(false);}
  },[loadRepairRecovery,task.id,task.projectId,identity.scope]);
  useFocusEffect(useCallback(()=>{active.current=true;setBusy(busyRef.current);setCancelling(cancelRef.current);if(!busyRef.current){setBusyAction('');setUploadingCaptureId(null);}void load();return()=>{active.current=false;};},[load]));
  const block=localRecoveryBlocked?'Cần đối soát nháp cũ trước khi lưu hoặc gửi hồ sơ.':!identity.user||!identity.scope||!verifiedTask||loading||!serverLoaded?'Kết nối mạng để xác minh trạng thái và gửi hồ sơ.':fieldCapabilityBlock(verifiedTask,verifiedEtag,identity.user.id,'submit');
  const captureBlock=localRecoveryBlocked?'Cần đối soát nháp cũ trước khi thêm ảnh.':!identity.user||!identity.scope||!verifiedTask||loading?'Chưa xác minh trạng thái nhiệm vụ mới nhất từ máy chủ.':fieldCapabilityBlock(verifiedTask,verifiedEtag,identity.user.id,'capture');
  const evidenceModel=fieldEvidenceActionModel(verifiedTask?.status, captureBlock, draft?.captures.length ?? 0);
  const taskReadOnly=fieldTaskReadOnly(verifiedTask?.status);
  const supplementAllowed=verifiedTask?.repairContext?.attempt?.review?.decision==='SUPPLEMENT'&&!!identity.user&&!repairSupplementBlock(verifiedTask,verifiedEtag,identity.user.id);
  const repairContext=verifiedTask?.repairContext;
  const finalConfirmed=repairContext?.status==='Confirmed'&&repairContext.finalDecision?.result==='CONFIRMED';
  const repairAccepted=repairContext?.attempt?.review?.decision==='ACCEPT';
  const linkedSubmission=!!latest?.id&&!!repairContext?.attempt?.attemptId&&repairContext.attempt.effectiveSubmissionId===latest.id;
  const frozen=!!draft?.command;
  const positionSources=crewPositionSources(verifiedTask,positionGeometry);
  const positionInputError=crewPositionInputError(locationProof,chainage,positionSources.segments);
  const normalMeasurement=(verifiedTask?.mode==='NORMAL'||verifiedTask?.mode==='CONDITIONAL_FT')&&!draft?.repairClaim&&!supplementMode;
  const historicalCancelPending=historicalDraft?.captures.some(c=>c.cancelState==='REQUESTED'||c.cancelState==='UNKNOWN'||(c.cancelState==='BLOCKED'&&!(c.verified&&c.upload?.status==='VERIFIED')));
  const canStartFreshSession=!!historicalDraft&&!fieldDraftPending(historicalDraft)&&!historicalCancelPending;
  const recoverHistorical=async(action:'new'|'read'|'replay')=>{
    if(busyRef.current||cancelRef.current)return;
    const c=context();if(!c||!current(c)||!historicalDraft||!serverLoaded)return;
    if(action==='replay'&&recoveryDecision!=='replay')return;
    if(action==='new'&&recoveryDecision!=='new')return;
    busyRef.current=true;setBusy(true);setRecoveryDecision(null);
    try {
      if(action==='new')await startNewFieldSessionDraft(c);
      else await reconcileFieldDraft(c,action==='replay',historicalDraft.command?.key);
      if(current(c)){setNotice('');setNoticeDetail('');setShowErrorDetail(false);await load();}
    }catch(e){if(current(c)){setNotice(fieldErrorMessage(e));setNoticeDetail(safeFieldErrorDetail(e));}}
    finally{busyRef.current=false;if(current(c))setBusy(false);}
  };
  const run=async(action:'prepare-supplement'|'bind-supplement'|'save'|'camera'|'upload'|'submit'|'replay'|'reconcile'|'recover'|'new'|'download',fileId?:string)=>{
    if(busyRef.current||cancelRef.current)return;
    if(signedMode&&['submit','replay','bind-supplement','prepare-supplement'].includes(action))return;
    const c=context();if(!c)return;
    if(action==='replay'&&(!replayConfirmed||replayConfirmed.key!==draft?.command?.key||replayConfirmed.context!==JSON.stringify(c)))return;
    if(action==='recover'&&(!repairRecovery||repairRecovery.phase==='CONFIRMED'||
      (['PREPARED','PENDING'].includes(repairRecovery.phase)&&(!repairRecoveryConfirmed||repairRecoveryConfirmed.key!==repairRecovery.key||repairRecoveryConfirmed.context!==JSON.stringify(c)))))return;
    busyRef.current=true;setBusy(true);setBusyAction(action);setTransferProgress(null);setNotice('');setNoticeDetail('');setShowErrorDetail(false);setReplayConfirmed(null);
    setRepairRecoveryConfirmed(null);
    try {
      const runtime=await openFieldRuntime(c);
      let saved:FieldDraft;
      if(action==='prepare-supplement') {
        await prepareFieldRepairSupplement(c,runtime);
        if(current(c))await load();
        return;
      }
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
      if(action==='save'||action==='submit'||action==='camera') {
        if(saved.command)throw Error('field_command_pending');
        if(Object.values(rawValues).some(v=>v.trim()!==''&&(!Number.isFinite(Number(v.replace(',','.')))||Number(v.replace(',','.'))<0)))throw Error('field_measurements_required');
        if(chainage.trim()!==''&&(!Number.isFinite(Number(chainage.replace(',','.')))||Number(chainage.replace(',','.'))<0))throw Error('field_measurements_required');
        const proof=locationProof?{...locationProof,observedChainageMeters:chainage.trim()===''?null:Number(chainage.replace(',','.'))}:null;
        saved=await saveFieldMeasurements(c,measurements,proof);
        if(action==='save'&&current(c)){setShowMeasurements(false);setShowPosition(false);setEditingSampleId(null);}
      }
      if(action==='camera') {
        if(current(c))router.push({pathname:'/(crew)/viewfinder',params:{id:task.id,projectId:task.projectId,mode:saved.repairClaim?'AFTER':'BEFORE',...(supplementMode?{supplement:'1'}:{}),...(signedMode?{signed:'1'}:{})}});
        return;
      }
      if(action==='upload') {
        const index=saved.captures.findIndex(capture=>capture.id===fileId);
        if(index<0)throw Error('field_capture_missing');
        setUploadingCaptureId(fileId??null);
        saved=await uploadFieldCapture(saved,index,runtime,(updated,percent)=>{if(current(c)){setDraft(updated);setTransferProgress(percent===undefined?null:{captureId:fileId!,percent});}});
      }
      if(action==='submit'||action==='bind-supplement') {
        if(action==='submit')saved=await uploadAndSubmitFieldDraft(saved,runtime,(updated,captureId,percent)=>{if(current(c)){setUploadingCaptureId(captureId);setDraft(updated);setTransferProgress(percent===undefined?null:{captureId,percent});}});
        if(current(c))setUploadingCaptureId(null);
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
      else if(saved.command?.phase==='confirmed')await load(true);
    }catch(e){if(current(c)){
      setNotice(fieldErrorMessage(e));
      setNoticeDetail(safeFieldErrorDetail(e));
      try{const saved=await loadFieldDraft(c,await openFieldRuntime(c));if(current(c)){setDraft(saved);await loadRepairRecovery(c,saved.result?.id);}}catch{/* keep explicit error; never reset an unresolved command */}
    }}finally{busyRef.current=false;if(current(c)){setBusy(false);setBusyAction('');setUploadingCaptureId(null);}}
  };
  const confirmCancelUpload=()=>{
    const captureId=cancelTarget;setCancelTarget(null);
    if(!captureId||cancelRef.current)return;
    cancelRef.current=true;setCancelling(true);setNotice('');setNoticeDetail('');setShowErrorDetail(false);
    void (async()=>{
      const c=context();
      try {
        if(!c)return;
        const runtime=await openFieldRuntime(c);
        const saved=await loadFieldDraft(c,runtime);
        const index=saved.captures.findIndex(capture=>capture.id===captureId);
        if(index<0)throw Error('field_capture_missing');
        const result=await cancelFieldUpload(saved,index,runtime);
        if(!current(c))return;
        setDraft(result);
        setNotice(result.captures[index].cancelState==='CONFIRMED'?'Đã hủy phiên tải trên máy chủ. Ảnh cục bộ vẫn được giữ.':
          result.captures[index].cancelState==='UNKNOWN'?'Chưa rõ kết quả hủy. Dùng đối soát đúng phiên ảnh này.':'Máy chủ không cho hủy phiên hiện tại. Đã đọc lại trạng thái; ảnh vẫn được giữ.');
      } catch(e) {if(c&&current(c)){setNotice(fieldErrorMessage(e));setNoticeDetail(safeFieldErrorDetail(e));}}
      finally {cancelRef.current=false;if(c&&current(c))setCancelling(false);}
    })();
  };
  const removeLocalCapture = (captureId: string) => {if(!busyRef.current&&!cancelRef.current)setDeleteTarget(captureId);};
  const confirmRemoveLocalCapture = () => {
    const captureId=deleteTarget; setDeleteTarget(null); if (!captureId||busyRef.current||cancelRef.current) return;
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
  const showNotice=!busy&&!loading&&(notice||draft?.result)&&!(localRecoveryBlocked&&notice===`Không thể dùng nháp của phiên này: ${localRecoveryError} Dữ liệu cũ vẫn được giữ nguyên.`);
  const historicalNotice=fieldNoticeModel(notice,draft?.result,noticeDetail);
  const showRepairDecision=serverLoaded&&!!latest&&(finalConfirmed||repairAccepted)&&(!notice||notice.startsWith('Đã đọc'));
  const showLinkedSubmission=serverLoaded&&linkedSubmission&&!showRepairDecision&&(!notice||notice.startsWith('Đã đọc'));
  const linkedReview=repairContext?.attempt?.review?.decision;
  const noticeModel=showRepairDecision?{
    title:finalConfirmed?'Đã nghiệm thu':'Hồ sơ đã được chấp nhận',
    tone:'success' as const,
    summary:finalConfirmed?'Hạng mục đã có xác nhận cuối từ người có thẩm quyền.':'Đang chờ xác nhận cuối của người có thẩm quyền.',
    detail:['Kết quả kiểm tra tại thời điểm nộp hồ sơ:',...fieldMissingReasonLabels(latest?.missingReasons),'Tiến độ sửa chữa hiện tại được đọc riêng từ nhiệm vụ.'].join('\n'),
  }:showLinkedSubmission?{
    title:'Đã nộp hồ sơ sửa chữa',tone:linkedReview==='SUPPLEMENT'?'pending' as const:'success' as const,
    summary:linkedReview==='SUPPLEMENT'?'Quản lý yêu cầu bổ sung':linkedReview?'Xem kết quả đánh giá':'Chờ quản lý đánh giá',
    detail:'Máy chủ đã liên kết hồ sơ ảnh với lượt sửa chữa. Không cần gửi lại ảnh. Kết quả kiểm tra lúc nộp được giữ trong lịch sử; chưa phải xác nhận nghiệm thu.',
  }:historicalNotice;
  return <SafeAreaScreen scroll header={<><AppHeader subtitle="Hồ sơ hiện trường" showBack onBack={()=>router.back()} />
    {showNotice||showRepairDecision||showLinkedSubmission?<FieldNotice model={noticeModel} expanded={showErrorDetail} onToggle={()=>setShowErrorDetail(v=>!v)}/>:null}
  </>}>
    <View style={styles.content}>
      <Card style={[styles.card,styles.taskSummary]}>
        <View style={styles.identity}><Text style={styles.taskCode}>{task.wo_code||`ID nhiệm vụ: ${task.id.slice(0,8)}`}</Text></View>
        <Text style={styles.taskTitle}>{task.title||'Nhiệm vụ hiện trường'}</Text>
        <View style={styles.taskStatusRow}>
          <Text style={styles.resultLabel}>Trạng thái nhiệm vụ</Text>
          <CrewTaskStatus status={verifiedTask?.status ?? task.status} label={fieldTaskStatusLabel(verifiedTask?.status ?? task.status)} />
        </View>
        <View style={styles.summaryHeader}>
          {serverLoaded&&latest?<Chip label={linkedSubmission&&fieldAwaitingRepairLink(latest.readiness,latest.missingReasons)?'Hồ sơ: Đã liên kết lượt sửa chữa':`${finalConfirmed||repairAccepted?'Kết quả lúc nộp':'Hồ sơ'}: ${fieldSubmissionReadinessLabel(latest.readiness,latest.missingReasons)}`} variant={latest.readiness==='READY'?'approved':'status-pending'} uppercase={false}/>:null}
          <CrewPressable accessibilityRole="button" accessibilityLabel="Tải lại hồ sơ hiện trường" style={({pressed})=>[styles.refreshAction,pressed&&styles.refreshPressed,{opacity:busy||cancelling||loading?0.5:1}]} disabled={busy||cancelling||loading} onPress={()=>void load(true)}><MaterialIcons name="refresh" size={18} color={colors.secondary}/><Text style={styles.actionLabel}>Tải lại</Text></CrewPressable>
        </View>
        {supplementMode||draft?.repairClaim?<Text style={styles.muted}>{supplementMode?'Bổ sung hồ sơ sửa chữa':'Đo kiểm sau sửa chữa'}</Text>:null}
      </Card>
      {serverLoaded&&supplementAllowed?<View style={{gap:spacing.sm}}>
        <Button variant="secondary" title="Xem yêu cầu bổ sung" onPress={()=>router.push({pathname:'/(crew)/repair-correction',params:{id:task.id,projectId:task.projectId}})}/>
        {supplementMode&&draft?.command?.phase==='confirmed'&&linkedSubmission?<Button variant="primary" title="Tạo bản bổ sung từ hồ sơ đã xác nhận" disabled={busy||cancelling||localRecoveryBlocked} onPress={()=>void run('prepare-supplement')}/>:null}
        {supplementMode&&draft?.supplement&&draft.command?.phase==='confirmed'&&!linkedSubmission&&!repairRecovery?<Button variant="primary" title="Liên kết bản bổ sung đã xác nhận" disabled={busy||cancelling||localRecoveryBlocked} onPress={()=>void run('bind-supplement')}/>:null}
      </View>:null}
      {loading?<View style={styles.loadingRow}><ActivityIndicator size="small" color={colors.primaryDark}/><Text style={styles.muted}>Đang tải hồ sơ…</Text></View>:null}
      {error?<FieldErrorPanel title="Không đọc được hồ sơ" message={error} detail={noticeDetail} expanded={showErrorDetail} onToggle={()=>setShowErrorDetail(v=>!v)} />:null}
      {localRecoveryBlocked?<Card style={[styles.card,styles.recoveryCard]}>
        <View style={styles.recoveryHeading}><MaterialIcons name={recoveryDecision?'note-add':'history'} size={22} color={colors.primaryDark}/><Text style={[styles.recoveryTitle,styles.flex]}>{recoveryDecision?(recoveryDecision==='new'?'Tạo hồ sơ mới?':'Gửi lại lệnh gốc?'):canStartFreshSession?'Có nháp từ lần đăng nhập trước':'Hồ sơ cần kiểm tra kết quả'}</Text>
          {!recoveryDecision?<CrewPressable accessibilityRole="button" accessibilityLabel={showRecoveryDetail?'Ẩn giải thích':'Vì sao có thông báo này?'} accessibilityState={{expanded:showRecoveryDetail}} onPress={()=>setShowRecoveryDetail(v=>!v)} style={({pressed})=>[styles.recoveryToggle,pressed&&styles.refreshPressed]}><MaterialIcons name={showRecoveryDetail?'expand-less':'expand-more'} size={22} color={colors.secondary}/></CrewPressable>:null}
        </View>
        {recoveryDecision?<>
          <Text style={styles.recoveryCopy} accessibilityRole="alert">{recoveryDecision==='new'?'Nháp và ảnh cũ vẫn được giữ. Hồ sơ mới bắt đầu trống.':'Lệnh có thể được gửi nếu máy chủ chưa nhận. Nội dung, khóa và phiên bản gốc được giữ nguyên.'}</Text>
          <View style={styles.recoveryActions}><Button variant="text" title="Hủy" disabled={busy} onPress={()=>setRecoveryDecision(null)}/><Button variant="primary" title={recoveryDecision==='new'?'Xác nhận tạo nháp trống':'Xác nhận gửi lại lệnh gốc'} loading={busy} disabled={!serverLoaded} onPress={()=>void recoverHistorical(recoveryDecision)}/></View>
        </>:<>
        <Text style={styles.recoveryCopy}>{canStartFreshSession?'Nháp cũ được giữ trên máy. Tạo hồ sơ mới để tiếp tục.':'Kiểm tra kết quả hồ sơ cũ trước khi gửi tiếp.'}</Text>
        {showRecoveryDetail?<View style={styles.recoveryDetail}><Text style={styles.recoveryCopy}>{localRecoveryError} Ảnh, số đo và lệnh cũ không bị xóa hoặc tự gửi lại.</Text></View>:null}
        {historicalDraft?.command?.phase==='acknowledged'?<><Button variant="secondary" title="Đọc lại kết quả đã lưu" disabled={busy||!serverLoaded} onPress={()=>void recoverHistorical('read')}/></>:null}
        {historicalDraft?.command?.phase==='pending'?<><Button variant="secondary" title="Đối soát lệnh gốc" disabled={busy||!serverLoaded} onPress={()=>setRecoveryDecision('replay')}/></>:null}
        {historicalDraft?.captures.some(c=>c.cancelState==='REQUESTED'||c.cancelState==='UNKNOWN'||(c.cancelState==='BLOCKED'&&!(c.verified&&c.upload?.status==='VERIFIED')))?<Text>Phiên cũ còn lệnh hủy ảnh chưa đối soát. Cần khôi phục đúng phiên và quyền trước khi tiếp tục; không tạo nháp mới hoặc gửi ảnh khác.</Text>:null}
        {canStartFreshSession?<Button variant="secondary" title="Tạo nháp trống cho phiên này" disabled={busy||!serverLoaded} onPress={()=>setRecoveryDecision('new')}/>:null}
        {!historicalDraft?<Text>Chưa đọc được hồ sơ cũ. Thử tải lại hồ sơ.</Text>:null}
        </>}
      </Card>:null}
      {serverLoaded&&latest?<Card style={styles.card}>
        <View style={styles.summaryHeader}><Text style={styles.sectionTitle}>Hồ sơ đã gửi</Text><Text style={styles.muted}>Lần {latest.revision}</Text></View>
        {!frozen&&!taskReadOnly?<Text style={styles.muted}>Đây là kết quả lần gửi trước. Thông tin bên dưới là bản bổ sung đang soạn; chỉ cập nhật vào hồ sơ sau khi gửi và được máy chủ nhận.</Text>:null}
        {(latest.measurements??[]).map(m=><View key={m.sampleId} style={styles.measurementResult}>
          <View style={styles.resultHeading}><Text style={[typography.labelLg,styles.flex]}>{fieldMeasurementTitle(m.type)}</Text><Text style={styles.resultValue}>{m.value==null?'Chưa đo':`${m.value} ${m.unit}`}</Text></View>
          {m.value==null&&m.unknownReason?<Text style={styles.muted}>{m.unknownReason}</Text>:null}
          <View style={styles.resultRow}><Text style={styles.resultLabel}>Dụng cụ</Text><Text style={styles.resultText}>{crewInstrumentLabel(m.instrument)}</Text></View>
          <View style={styles.resultRow}><Text style={styles.resultLabel}>Phương pháp</Text><Text style={styles.resultText}>{m.method||'Chưa có thông tin'}</Text></View>
          {m.latitude!=null&&m.longitude!=null?<View style={styles.resultRow}><Text style={styles.resultLabel}>Tọa độ đo</Text><Text style={styles.resultText}>{m.latitude}, {m.longitude}</Text></View>:null}
        </View>)}
        {finalConfirmed?<Chip label="Sửa chữa: Đã nghiệm thu" variant="approved" uppercase={false}/>:repairAccepted?<Chip label="Sửa chữa: Chờ xác nhận cuối" variant="status-pending" uppercase={false}/>:null}
        {!showNotice&&!showRepairDecision&&!showLinkedSubmission&&latest.missingReasons?.length?<View style={styles.missingBox}><Text style={typography.labelLg}>Thông tin còn thiếu</Text>{fieldMissingReasonLabels(latest.missingReasons).map(reason=><Text style={styles.muted} key={reason}>• {reason}</Text>)}</View>:null}
        <View style={styles.resultHeading}><Text style={typography.labelLg}>Ảnh đã gửi</Text><Text style={styles.muted}>{(latest.evidence??[]).filter(e=>e.fileId).length} ảnh</Text></View>
        <View style={styles.photoGrid}>{(latest.evidence??[]).filter(e=>e.fileId).map((e,index)=>{
          const local=draft?.captures.find(c=>c.verified&&c.upload?.fileId===e.fileId);
          const label=e.purpose==='AFTER'?'Sau sửa chữa':e.purpose==='BEFORE'?'Hiện trạng':'Đo kiểm';
          return <View key={e.captureOriginId} style={styles.photoTile}><CrewPressable accessibilityRole="button" accessibilityLabel={`Xem ảnh ${index+1}: ${label}`} disabled={busy} onPress={()=>void run('download',e.fileId!)}>
            <View style={[styles.photoFrame,styles.serverPhoto]}>{local?<Image source={{uri:local.uri}} style={styles.photoImage} resizeMode="cover"/>:<View style={styles.photoPlaceholder}><MaterialIcons name="image" size={24} color={colors.secondary}/><Text style={styles.placeholderLabel}>Chạm để tải ảnh</Text></View>}
              <View pointerEvents="none" style={[styles.photoCaption,!local&&styles.placeholderCaption]}><Text style={[styles.photoStatus,!local&&styles.placeholderLabel]}>Ảnh {index+1} · {label}</Text></View>
              <View pointerEvents="none" style={styles.viewPhotoBadge}><MaterialIcons name="zoom-in" size={20} color={colors.neutral}/></View>
            </View>
          </CrewPressable><CrewPhotoInfo label={`Ảnh ${index+1} · ${label}`} coordinates={local?.coordinates} capturedAt={e.capturedAt??local?.capturedAt} localMetadata={!!local}/></View>;
        })}</View>
      </Card>:serverLoaded&&!loading?<Card style={styles.card}><Text style={styles.sectionTitle}>Hồ sơ đã gửi</Text><Text style={styles.muted}>Chưa có hồ sơ đã gửi.</Text></Card>:null}
      <Modal visible={!!preview} transparent animationType="fade" onRequestClose={()=>setPreview(null)}>
        <View style={styles.previewBackdrop} accessibilityViewIsModal>
          {preview?<Image accessibilityLabel="Ảnh bằng chứng từ máy chủ" source={{uri:preview}} style={styles.previewImage} resizeMode="contain"/>:null}
          <Button variant="secondary" title="Đóng ảnh" style={styles.previewClose} onPress={()=>setPreview(null)}/>
        </View>
      </Modal>
      {localOnly?<Card style={styles.card}><Text style={styles.sectionTitle}>Đang làm việc với dữ liệu đã tải</Text><Text style={styles.muted}>Chỉ lưu nháp trên máy. Kết nối mạng để xác minh trạng thái và gửi hồ sơ.</Text></Card>:null}
      {draft&&(serverLoaded||localOnly)&&!localRecoveryBlocked?<>
        {!taskReadOnly&&!frozen?<>
        <Card style={styles.card}>
          <View style={styles.summaryHeader}><Text style={styles.sectionTitle}>Số đo hiện trường</Text><MaterialIcons name="straighten" size={24} color={colors.primaryDark}/></View>
          {measurements.map(m=><View key={m.sampleId} style={styles.resultHeading}><Text style={[typography.bodyMd,styles.flex]}>{fieldMeasurementTitle(m.type)}</Text><Text style={styles.resultValue}>{m.value===null?'Chưa đo':`${m.value} ${m.unit}`}</Text></View>)}
          <Button variant="secondary" style={styles.compactAction} title="Chỉnh số đo" disabled={busy||cancelling} onPress={()=>{if(!busy&&!cancelling){setShowMeasurements(true);setEditingSampleId(null);}}}/>
        </Card>
        <Modal visible={showMeasurements} presentationStyle="fullScreen" animationType="none" onRequestClose={()=>{if(!busy){if(frozen)setShowMeasurements(false);else void run('save');}}}>
          <SafeAreaProvider>
          <SafeAreaScreen scroll keyboardAware header={<AppHeader subtitle="Số đo hiện trường" showBack onBack={()=>{if(!busy){if(frozen)setShowMeasurements(false);else void run('save');}}}/>}>
            <CrewContentTransition ready={showMeasurements}><View style={styles.measurementBody}>
              <View style={styles.measurementIntro}><Text style={styles.sectionTitle}>Nhập số đo thực tế</Text>
              <Text style={styles.muted}>Chọn số đo để nhập hoặc chỉnh sửa.</Text></View>
          {!measurements.length?<Text>Chưa có loại đo được máy chủ hỗ trợ; chưa thể gửi hồ sơ.</Text>:null}
          {measurements.map((m,i)=><View key={m.sampleId} pointerEvents={busy||frozen||taskReadOnly?'none':'auto'} style={[styles.measurementItem,{opacity:busy||frozen||taskReadOnly?0.6:1}]}>
            <CrewPressable style={({pressed})=>[styles.measurementToggle,editingSampleId===m.sampleId&&styles.measurementToggleOpen,pressed&&styles.refreshPressed]} accessibilityRole="button" accessibilityLabel={`Sửa ${fieldMeasurementTitle(m.type)}`} accessibilityState={{expanded:editingSampleId===m.sampleId,disabled:busy||frozen||taskReadOnly}} onPress={()=>setEditingSampleId(editingSampleId===m.sampleId?null:m.sampleId)}>
              <View style={styles.measurementHeading}><Text style={styles.measurementTitle}>{fieldMeasurementTitle(m.type)}</Text><Text style={styles.measurementKind}>{measurementTemplate(verifiedTask?.requiredMeasurementType??0,'required')?.type===m.type?'Bắt buộc':'Bổ sung'}</Text></View>
              <Text style={[styles.measurementValue,m.value===null&&styles.measurementUnknown]}>{m.value===null?'Chưa đo':`${m.value} ${m.unit}`}</Text>
              <MaterialIcons name={editingSampleId===m.sampleId?'expand-less':'expand-more'} size={24} color={colors.secondary}/>
            </CrewPressable>
            {editingSampleId===m.sampleId?<CrewContentTransition ready><View style={styles.measurementEditor}>
            <View style={styles.resultHeading}><Text style={[typography.labelLg,{flex:1}]}>{fieldMeasurementTitle(m.type)} · {m.unit}</Text>
              {!taskReadOnly&&measurementTemplate(verifiedTask?.requiredMeasurementType??0,'required')?.type!==m.type?<Pressable style={styles.noticeToggle} accessibilityRole="button" accessibilityLabel={`Bỏ ${fieldMeasurementTitle(m.type)}`} disabled={busy||frozen} onPress={()=>{if(busy||frozen)return;setMeasurements(values=>values.filter(v=>v.sampleId!==m.sampleId));}}><MaterialIcons name="close" size={22} color={colors.secondary}/></Pressable>:null}
            </View>
            {!taskReadOnly?<InputField label="Giá trị đo thực" value={rawValues[m.sampleId]??(m.value===null?'':String(m.value))} keyboardType="decimal-pad" onChangeText={text=>{
              if(busy||frozen)return;setRawValues(values=>({...values,[m.sampleId]:text}));
              const normalized=text.trim().replace(',','.');const value=normalized===''?null:Number(normalized);
              update(i,{value,state:value===null?'UNKNOWN':'KNOWN',unknownReason:value===null?m.unknownReason||'Chưa đo tại hiện trường':null});}}/>:null}
            {m.dimension==='LENGTH'?<View style={styles.unitRow}>{['mm','cm','m'].map(unit=><Button style={[styles.unitButton,m.unit===unit&&styles.measurementUnitSelected]} key={unit} variant={m.unit===unit?'secondary':'text'} title={unit} icon={m.unit===unit?<MaterialIcons name="check" size={18} color={colors.primaryDark}/>:undefined} disabled={busy||frozen} onPress={()=>update(i,{unit})}/>)}</View>:null}
            {showMeasurements&&normalMeasurement&&verifiedTask?.mode==='CONDITIONAL_FT'&&!taskReadOnly?<CrewFastTrackMeasurementGuide projectId={task.projectId} taskId={task.id} measurement={m}/>:null}
            {!taskReadOnly&&measurementValidationMessage(rawValues[m.sampleId]??'')?<Text style={styles.errorText}>{measurementValidationMessage(rawValues[m.sampleId]??'')}</Text>:null}
            {!taskReadOnly?<><InputField label="Dụng cụ đo thực tế" value={m.instrument} onChangeText={instrument=>update(i,{instrument})}/><InputField label="Phương pháp đo thực tế" value={m.method} onChangeText={method=>update(i,{method})}/></>:<Text style={styles.muted}>Giá trị máy chủ: {m.value == null ? 'Chưa có' : `${m.value} ${m.unit}`}</Text>}
            {!taskReadOnly&&m.value===null?<InputField label="Lý do chưa đo" value={m.unknownReason??''} onChangeText={unknownReason=>update(i,{unknownReason})}/>:null}
            {m.latitude==null||m.longitude==null?(taskReadOnly?<Text style={styles.muted}>Chưa có GPS quan sát{m.locationReason?` · ${m.locationReason}`:''}</Text>:<InputField label="Lý do chưa có tọa độ quan sát" value={m.locationReason??''} onChangeText={locationReason=>update(i,{locationReason})}/>):<Text>GPS quan sát trong hồ sơ máy chủ: {m.latitude}, {m.longitude}</Text>}
            <Button variant="secondary" style={styles.measurementSecondary} title="Xong số đo này" onPress={()=>{Keyboard.dismiss();setEditingSampleId(null);}}/>
            </View></CrewContentTransition>:null}
          </View>)}
          {!taskReadOnly?<View>
            <Button variant="secondary" style={styles.measurementSecondary} icon={<MaterialIcons name={showMeasurementChoices?'expand-less':'add'} size={20} color={colors.primaryDark}/>} title={showMeasurementChoices?'Ẩn loại số đo':'Thêm số đo'} disabled={busy||frozen} onPress={()=>{if(!busy&&!frozen)setShowMeasurementChoices(v=>!v);}}/>
            {showMeasurementChoices?<View style={styles.choiceRow}>{[1,2,3,4,5,6].map(type=>{const template=measurementTemplate(type,'choice');if(!template||measurements.some(m=>m.type===template.type))return null;return <Button key={type} variant="secondary" title={fieldMeasurementTitle(template.type)} disabled={busy||frozen} onPress={()=>{if(busy||frozen)return;const next=measurementTemplate(type,randomUUID());if(next){setMeasurements(values=>values.some(m=>m.type===next.type)?values:[...values,next]);setEditingSampleId(next.sampleId);}setShowMeasurementChoices(false);}}/>;})}</View>:null}
          </View>:null}
              <Button variant="primary" title="Lưu nháp số đo" loading={busy&&busyAction==='save'} disabled={busy||cancelling||frozen} onPress={()=>void run('save')}/>
              {notice?<Text accessibilityLiveRegion="polite" style={styles.muted}>{notice}</Text>:null}
            </View></CrewContentTransition>
          </SafeAreaScreen>
          </SafeAreaProvider>
        </Modal>
        <Card style={styles.card}>
          <View style={styles.summaryHeader}><Text style={styles.sectionTitle}>Vị trí quan sát</Text><MaterialIcons name="place" size={24} color={colors.primaryDark}/></View>
          <View style={styles.positionSummary}><MaterialIcons name={draft.locationProof?"location-on":"location-off"} size={22} color={colors.secondary}/><View style={styles.flex}>
            <Text style={typography.labelLg}>{positionSources.choices.find(c=>c.value===draft.locationProof?.checklist)?.label??'Chưa xác định'}</Text>
            <Text style={styles.positionHintText}>{draft.locationProof?.observedChainageMeters!=null?`Lý trình ${draft.locationProof.observedChainageMeters} m`:draft.locationProof?.observedSlabId?`Ký hiệu tấm: ${draft.locationProof.observedSlabId}`:draft.locationProof?'Chưa có dấu mốc quan sát':'Cần bổ sung vị trí hiện trường'}</Text>
          </View></View>
          <Button variant="secondary" style={styles.compactAction} title={taskReadOnly?'Xem vị trí':'Chỉnh vị trí'} disabled={busy||cancelling} onPress={()=>{setNotice('');setShowErrorDetail(false);setShowPosition(true);}}/>
        </Card>
        <Modal visible={showPosition} presentationStyle="fullScreen" animationType="none" onRequestClose={()=>{if(!busy){if(frozen||taskReadOnly)setShowPosition(false);else void run('save');}}}>
          <SafeAreaProvider>
          <SafeAreaScreen scroll keyboardAware header={<AppHeader subtitle="Vị trí quan sát" showBack onBack={()=>{if(!busy){if(frozen||taskReadOnly)setShowPosition(false);else void run('save');}}}/>}>
            <CrewContentTransition ready={showPosition}><View style={styles.positionEditor} pointerEvents={busy||frozen?'none':'auto'}>
              <View style={styles.positionIntro}><Text style={styles.sectionTitle}>Đối chiếu vị trí thực tế</Text><Text style={styles.muted}>Chọn dấu mốc đã đối chiếu tại hiện trường.</Text><Text style={styles.muted}>Lý trình tính bằng mét từ đầu tuyến. Chọn phân đoạn và nhập dấu mốc quan sát thực tế.</Text></View>
              <View accessibilityRole="radiogroup" style={styles.choiceRow}>{positionSources.choices.map(({value,label})=>{const selected=locationProof?.checklist===value || (value==='UNKNOWN'&&!locationProof);return <CrewPressable key={value} disabled={busy||frozen||taskReadOnly} accessibilityRole="radio" accessibilityState={{selected,disabled:busy||frozen||taskReadOnly}} style={({pressed})=>[styles.positionOption,selected&&styles.positionOptionSelected,pressed&&styles.refreshPressed]} onPress={()=>{if(verifiedTask&&!busy&&!frozen&&!taskReadOnly){setLocationProof(chooseCrewPosition(verifiedTask,value));setChainage('');}}}><MaterialIcons name={selected?"radio-button-checked":"radio-button-unchecked"} size={22} color={selected?colors.primaryDark:colors.secondary}/><Text style={[styles.positionChoiceLabel,selected&&styles.positionChoiceSelected]}>{label}</Text></CrewPressable>;})}</View>
          {!locationProof?<View style={styles.positionHint}><MaterialIcons name="info-outline" size={18} color={colors.secondary}/><Text style={styles.positionHintText}>Hồ sơ sẽ ghi nhận thiếu vị trí.</Text></View>:null}
          {locationProof?.checklist==='ROUTE_CHAINAGE_MARKINGS_CONFIRMED'?<>
            {taskReadOnly?<Text style={styles.muted}>Lý trình: {chainage||'Chưa có'} m</Text>:<InputField label="Lý trình quan sát thực tế (m) — bắt buộc" error={positionInputError??undefined} value={chainage} keyboardType="decimal-pad" onChangeText={value=>{if(!busy&&!frozen)setChainage(value);}}/>}
          </>:null}
          {locationProof?.checklist==='SEGMENT_MARKINGS_CONFIRMED'?<>
            {taskReadOnly?<Text style={styles.muted}>Lý trình: {chainage||'Chưa có'} m</Text>:<>
              {positionSources.segments.map(segment=><Button key={segment.id} variant="secondary" style={[styles.positionSegment,locationProof.observedSegmentId===segment.id&&styles.positionOptionSelected]} title={`${locationProof.observedSegmentId===segment.id?'✓ ':''}Phân đoạn ${segment.sequence} · ${segment.fromOffsetMeters}–${segment.toOffsetMeters} m`} disabled={busy||frozen} onPress={()=>{if(!busy&&!frozen)setLocationProof({...locationProof,observedSegmentId:segment.id});}}/>)}
              <InputField label="Lý trình quan sát thực tế (m) — bắt buộc" error={positionInputError??undefined} value={chainage} keyboardType="decimal-pad" onChangeText={value=>{if(!busy&&!frozen)setChainage(value);}}/>
            </>}
          </>:null}
          {locationProof?.checklist==='SLAB_MARKINGS_CONFIRMED'?(taskReadOnly?<Text style={styles.muted}>Ký hiệu tấm: {locationProof.observedSlabId||'Chưa có'}</Text>:<InputField label="Ký hiệu tấm đã đối chiếu thực tế" value={locationProof.observedSlabId??''} onChangeText={value=>{if(!busy&&!frozen)setLocationProof({...locationProof,observedSlabId:value});}}/>):null}

              {!taskReadOnly?<Button variant="primary" title="Lưu vị trí" loading={busy&&busyAction==='save'} disabled={busy||cancelling||frozen||!!positionInputError} onPress={()=>void run('save')}/>:null}
              {notice?<FieldNotice model={fieldNoticeModel(notice,undefined,noticeDetail)} expanded={showErrorDetail} onToggle={()=>setShowErrorDetail(v=>!v)}/>:null}
            </View></CrewContentTransition>
          </SafeAreaScreen>
          </SafeAreaProvider>
        </Modal>
        <Card style={styles.card}><View style={styles.helpHeading}><MaterialIcons name="photo-library" size={22} color={colors.primaryDark}/><Text style={styles.helpTitle}>Ảnh bằng chứng</Text>{normalMeasurement?<CrewPressable accessibilityRole="button" accessibilityLabel="Hướng dẫn ảnh bằng chứng" accessibilityState={{expanded:showEvidenceHelp}} style={({pressed})=>[styles.helpToggle,pressed&&styles.refreshPressed]} onPress={()=>setShowEvidenceHelp(v=>!v)}><MaterialIcons name={showEvidenceHelp?"expand-less":"help-outline"} size={22} color={colors.secondary}/></CrewPressable>:null}</View>
          {normalMeasurement&&showEvidenceHelp?<Text style={styles.muted}>Ảnh chụp được lưu trên máy trước. Bấm “Tải ảnh này lên” dưới từng ảnh và chờ “Đã xác minh” để dùng cho đánh giá trước sửa.</Text>:null}
          {!draft.captures.length?<Text style={styles.muted}>{latest?.evidence?.some(e=>e.fileId)?'Ảnh đã gửi sẽ được giữ trong bản bổ sung. Có thể thêm ảnh mới nếu cần.':'Chưa có ảnh hiện trường.'}</Text>:null}
          <View style={styles.photoGrid}>{draft.captures.map((c,index)=>{const feedback=fieldPhotoFeedback(c,uploadingCaptureId===c.id,transferProgress?.captureId===c.id?transferProgress.percent:undefined);return <View key={c.id} style={styles.photoTile}>
            <View style={styles.photoFrame}><Image source={{uri:c.uri}} style={styles.photoImage} resizeMode="cover"/>
              <View pointerEvents="none" style={[styles.photoOverlay,feedback.busy&&styles.photoOverlayBusy]} accessible accessibilityLabel={`Ảnh ${index+1}: ${feedback.label}${feedback.percent===null?'':` ${feedback.percent}%`}`} accessibilityState={{busy:feedback.busy}} accessibilityLiveRegion="polite">
                {feedback.busy?(feedback.percent===null?<ActivityIndicator size="large" color={colors.surface}/>:<View style={styles.photoProgressRing} accessibilityRole="progressbar" accessibilityValue={{min:0,max:100,now:feedback.percent}}><View style={[styles.ringHalf,styles.ringRight]}><View style={[styles.ringArc,styles.arcRight,{transform:[{rotate:`${Math.min(feedback.percent,50)*3.6-135}deg`}]}]}/></View><View style={[styles.ringHalf,styles.ringLeft]}><View style={[styles.ringArc,styles.arcLeft,{transform:[{rotate:`${Math.max(0,feedback.percent-50)*3.6+45}deg`}]}]}/></View><Text style={styles.ringText}>{feedback.percent}%</Text></View>):feedback.verified?<View style={styles.verifiedBadge}><MaterialIcons name="check-circle" size={24} color={colors.success}/></View>:null}
                <View style={styles.photoCaption}><Text style={styles.photoStatus}>{feedback.label}{feedback.percent===null?'':` · ${feedback.percent}%`}</Text></View>
                {feedback.percent!==null?<View style={styles.progressTrack} accessibilityRole="progressbar" accessibilityValue={{min:0,max:100,now:feedback.percent}}><View style={[styles.progressFill,{width:`${feedback.percent}%`}]}/></View>:null}
              </View>
              {!c.upload&&!c.uploadAttempt&&!c.completed&&!c.verified&&!frozen&&!busy&&!cancelling?<Pressable accessibilityRole="button" accessibilityLabel="Xóa ảnh cục bộ" style={styles.removePhoto} onPress={()=>removeLocalCapture(c.id)}><MaterialIcons name="close" size={20} color={colors.neutral}/></Pressable>:null}
            </View>
            <Text style={typography.labelSm}>{c.purpose==='AFTER'?'Sau sửa chữa':c.purpose==='BEFORE'?'Hiện trạng trước sửa':'Đo kiểm'}</Text>
            <CrewPhotoInfo label={`Ảnh ${index+1} · ${c.purpose==='AFTER'?'Sau sửa chữa':c.purpose==='BEFORE'?'Hiện trạng trước sửa':'Đo kiểm'}`} coordinates={c.coordinates} capturedAt={c.capturedAt} localMetadata />
            {!evidenceModel.readOnly&&!frozen&&serverLoaded?<View style={styles.evidenceActions}>
              {(normalMeasurement||signedMode)&&serverLoaded&&!taskReadOnly&&!c.verified&&!c.cancelState&&(!c.upload||['PENDING','UPLOADING','VERIFYING'].includes(c.upload.status))?<Button variant="secondary" title={uploadingCaptureId===c.id?'Đang tải ảnh':'Tải ảnh này lên'} disabled={busy||cancelling||!!captureBlock} onPress={()=>void run('upload',c.id)}/>:null}
              {c.upload?.id&&(['PENDING','UPLOADING'].includes(c.upload.status)||['REQUESTED','UNKNOWN','BLOCKED'].includes(c.cancelState??''))?<Button variant="text" title={c.cancelState?'Đối soát hủy phiên':'Hủy tải lên'} disabled={cancelling||(busy&&uploadingCaptureId!==c.id)} onPress={()=>setCancelTarget(c.id)}/>:null}
            </View>:null}
          </View>;})}</View>
          {evidenceModel.readOnly?<Text style={styles.muted}>Trạng thái {evidenceModel.statusLabel}: chỉ xem ảnh và kết quả đọc lại từ máy chủ.</Text>:null}
          {!evidenceModel.readOnly&&captureBlock?<Text>{captureBlock}</Text>:null}
          {evidenceModel.canCapture&&!frozen?<Button variant="secondary" style={styles.compactAction} title="Chụp / chọn ảnh" disabled={busy||cancelling} onPress={()=>void run('camera')}/>:null}
        </Card>
        {block?<Text>{block}</Text>:null}
        {normalMeasurement?<Card style={styles.card}>
          <View style={styles.helpHeading}><MaterialIcons name="fact-check" size={22} color={colors.primaryDark}/><Text style={styles.helpTitle}>Đánh giá trước sửa</Text><CrewPressable accessibilityRole="button" accessibilityLabel="Hướng dẫn đánh giá trước sửa" accessibilityState={{expanded:showAssessmentHelp}} style={({pressed})=>[styles.helpToggle,pressed&&styles.refreshPressed]} onPress={()=>setShowAssessmentHelp(v=>!v)}><MaterialIcons name={showAssessmentHelp?"expand-less":"help-outline"} size={22} color={colors.secondary}/></CrewPressable></View>
          {showAssessmentHelp?<Text style={styles.muted}>Sau khi lưu số đo và tải ảnh, mở theo dõi thi công để gửi đánh giá trước sửa.</Text>:null}
          <Button variant="primary" title="Mở theo dõi thi công" disabled={busy} onPress={()=>router.push({pathname:'/(crew)/progress',params:{id:task.id,projectId:task.projectId}})}/>
        </Card>:null}
        {!signedMode&&!taskReadOnly&&!frozen&&!normalMeasurement?<View style={styles.submitActions}><Button variant="primary" title={supplementMode?'Gửi bản bổ sung và liên kết lượt sửa chữa':draft.repairClaim?'Gửi hồ sơ đo kiểm sau sửa':latest?'Gửi bổ sung đo kiểm':'Gửi hồ sơ đo kiểm'} loading={busy&&busyAction==='submit'} disabled={busy||cancelling||frozen||normalMeasurement||!!block||!measurements.length||(!draft.captures.length&&!latest?.evidence?.length)} onPress={()=>void run('submit')}/></View>:null}
        </>:null}
        {fieldDraftPending(draft)?<Card style={styles.card}>
          <View style={styles.summaryHeader}><Text style={typography.labelLg}>{replayConfirmed?'Xác nhận gửi lại':'Kiểm tra lần gửi'}</Text><MaterialIcons name="sync" size={20} color={colors.secondary}/></View>
          {replayConfirmed?<>
            <Text accessibilityRole="alert" style={styles.muted}>Giữ nguyên hồ sơ đã lưu. Nếu máy chủ chưa nhận, thao tác này sẽ gửi hồ sơ.</Text>
            <Button variant="primary" title="Xác nhận gửi lại" loading={busy&&busyAction==='replay'} disabled={busy} onPress={()=>void run('replay')}/>
            <Button variant="text" title="Hủy" disabled={busy} onPress={()=>setReplayConfirmed(null)}/>
          </>:<>
            <Text style={styles.muted}>{draft.command?.responseId?'Máy chủ đã nhận hồ sơ. Kiểm tra lại để xác nhận kết quả trên thiết bị.':'Chưa xác nhận được lần gửi này. Ảnh và nội dung đã lưu vẫn được giữ.'}</Text>
            {draft.command?.responseId?<Button variant="secondary" title="Kiểm tra kết quả" loading={busy&&busyAction==='reconcile'} disabled={busy} onPress={()=>void run('reconcile')}/>:null}
            {draft.command?.phase==='pending'?<Button variant="secondary" title="Kiểm tra lần gửi" disabled={busy} onPress={()=>setReplayConfirmed(draft.command?{key:draft.command.key,context:JSON.stringify(context())}:null)}/>:null}
          </>}
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
        {evidenceModel.canCapture&&!draft.repairClaim&&draft.command&&['confirmed','rejected'].includes(draft.command.phase)?<View style={styles.submitActions}><Button variant="secondary" title="Đã xem kết quả — tạo nháp mới" disabled={busy} onPress={()=>void run('new')}/></View>:null}

      </>:null}
      {serverLoaded&&latest&&repairContext?<Button variant="secondary" title={linkedSubmission||finalConfirmed||repairAccepted?'Xem hồ sơ hoàn tất':'Tiếp tục hồ sơ hoàn tất'} disabled={busy||cancelling||loading} onPress={()=>router.push({pathname:'/(crew)/complete',params:{id:task.id,projectId:task.projectId}})}/>:null}
      <Modal visible={!!deleteTarget} transparent animationType="fade" onRequestClose={()=>setDeleteTarget(null)}>
        <View style={styles.modalBackdrop}><View style={styles.confirmModal} accessibilityViewIsModal>
          <Text style={styles.sectionTitle}>Xóa ảnh cục bộ?</Text>
          <Text style={styles.muted}>Chỉ ảnh đã chứng minh còn LOCAL mới được xóa. Ảnh đang tải, đã xác minh hoặc có lệnh chưa đối soát sẽ được giữ nguyên.</Text>
          <View style={styles.modalActions}><Button variant="text" title="Hủy" onPress={()=>setDeleteTarget(null)} /><Button variant="secondary" title="Xóa ảnh" onPress={confirmRemoveLocalCapture} /></View>
        </View></View>
      </Modal>
      <Modal visible={!!cancelTarget} transparent animationType="fade" onRequestClose={()=>setCancelTarget(null)}>
        <View style={styles.modalBackdrop}><View style={styles.confirmModal}>
          <Text style={styles.sectionTitle}>{draft?.captures.find(c=>c.id===cancelTarget)?.cancelState?'Đối soát phiên hủy?':'Hủy phiên tải ảnh?'}</Text>
          <Text style={styles.muted}>Ảnh trên thiết bị và lệnh đã lưu vẫn được giữ. Nếu kết quả hủy chưa rõ, thao tác này có thể gửi lại yêu cầu hủy đúng phiên cũ; máy chủ sẽ quyết định trạng thái cuối.</Text>
          <View style={styles.modalActions}><Button variant="text" title="Giữ phiên" onPress={()=>setCancelTarget(null)}/><Button variant="secondary" title="Xác nhận" onPress={confirmCancelUpload}/></View>
        </View></View>
      </Modal>
    </View>
  </SafeAreaScreen>;
}

const styles = StyleSheet.create({
  measurementItem: {borderWidth:1,borderColor:colors.border,borderRadius:radius.md,overflow:'hidden'},
  measurementBody: {gap:12,paddingBottom:spacing.md},
  measurementIntro: {backgroundColor:'#FBF8EE',borderRadius:radius.lg,padding:spacing.md,gap:spacing.xs,borderWidth:1,borderColor:'#E8D9A8'},
  measurementHeading: {flexGrow:1,flexShrink:1,flexBasis:150,gap:spacing.xs},
  measurementTitle: {...typography.bodyMd,fontWeight:'500',lineHeight:21,color:colors.neutral},
  measurementKind: {...typography.caption,color:colors.secondary},
  measurementToggle: {flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:spacing.sm,padding:12,minHeight:72,backgroundColor:colors.surface},
  measurementToggleOpen: {backgroundColor:'#FBF8EE'},
  measurementValue: {...typography.labelLg,color:colors.secondary,flexShrink:1,textAlign:'right',backgroundColor:'#F1F3F5',paddingHorizontal:spacing.sm,paddingVertical:6,borderRadius:radius.sm},
  measurementUnknown: {fontWeight:'400'},
  measurementSecondary: {backgroundColor:'#FBF8EE',borderColor:'#B6A470'},
  measurementUnitSelected: {backgroundColor:'#F3ECD6',borderColor:'#8C6D1F'},
  measurementEditor: {padding:spacing.md,borderTopWidth:1,borderColor:colors.border,gap:spacing.xs},
  recoveryCard: {gap:spacing.sm},
  recoveryHeading: {flexDirection:'row',alignItems:'center',gap:spacing.sm},
  recoveryTitle: {...typography.labelLg,color:colors.neutral,lineHeight:21},
  recoveryCopy: {...typography.bodyMd,color:colors.secondary},
  recoveryToggle: {minWidth:48,minHeight:48,alignItems:'center',justifyContent:'center',borderRadius:radius.md,backgroundColor:'#FBF8EE',borderWidth:1,borderColor:'#E8D9A8'},
  recoveryDetail: {borderTopWidth:1,borderTopColor:'#E8D9A8',paddingTop:spacing.sm},
  recoveryActions: {flexDirection:'row',flexWrap:'wrap',justifyContent:'flex-end',gap:spacing.sm,marginTop:spacing.sm},
  submitActions:{paddingTop:spacing.md,paddingBottom:spacing.sm,gap:spacing.sm},
  unitRow: {flexDirection:'row',gap:spacing.sm,marginBottom:spacing.sm},
  unitButton: {flex:1},
  previewBackdrop: {flex:1,backgroundColor:'#111111',padding:spacing.lg,paddingVertical:spacing.xl,justifyContent:'center',gap:spacing.md},
  previewClose: {backgroundColor:colors.surface},
  previewImage: {width:'100%',flex:1},
  measurementResult: {gap:spacing.sm,paddingVertical:spacing.md,borderBottomWidth:1,borderColor:'#DCE2E7'},
  resultHeading: {flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:spacing.sm,flexWrap:'wrap'},
  resultValue: {...typography.labelLg,color:'#192D40',flexShrink:1,fontVariant:['tabular-nums']},
  resultRow: {flexDirection:'row',flexWrap:'wrap',gap:spacing.xs,alignItems:'baseline'},
  resultLabel: {...typography.bodyMd,color:colors.secondary,minWidth:96,flexShrink:1},
  resultText: {...typography.bodyMd,color:colors.neutral,flexGrow:1,flexShrink:1,flexBasis:180},
  serverPhoto: {alignItems:'center',justifyContent:'center',aspectRatio:4/3,backgroundColor:'#F3F5F6'},
  photoPlaceholder: {alignItems:'center',gap:spacing.xs,paddingHorizontal:spacing.xs,paddingBottom:32},
  placeholderLabel: {...typography.caption,color:colors.secondary,textAlign:'center'},
  placeholderCaption: {backgroundColor:'#E4E9ED'},
  viewPhotoBadge: {position:'absolute',top:6,right:6,backgroundColor:colors.surface,borderRadius:radius.full,padding:4},
  noticeContainer: {marginHorizontal:spacing.screenMargin,marginVertical:spacing.xs,borderRadius:radius.md,backgroundColor:colors.surface,overflow:'hidden'},
  noticeBanner: {flexDirection:'row',alignItems:'center',gap:spacing.sm,paddingLeft:spacing.sm,paddingVertical:spacing.xs,borderLeftWidth:3},
  noticeSummary: {...typography.caption,color:colors.secondary,marginTop:2},
  noticeToggle: {width:48,minHeight:48,alignItems:'center',justifyContent:'center',borderRadius:radius.md,backgroundColor:colors.surfaceAlt},
  noticeDetails: {maxHeight:160,paddingHorizontal:spacing.md,paddingBottom:spacing.sm},
  content: {
    paddingBottom: spacing.xl,
  },
  card: {
    marginBottom: 12,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },
  priorCard: { marginBottom: spacing.md, gap: spacing.xs, backgroundColor: colors.surfaceAlt },
  missingList: { gap: spacing.xs },
  taskSummary: {backgroundColor:'#F3F5F6',borderColor:'#DCE2E7'},
  compactAction: { alignSelf:'flex-start',maxWidth:'100%',minHeight:48,paddingVertical:spacing.xs,paddingHorizontal:12,backgroundColor:'#FBF8EE',borderColor:'#E8D9A8' },
  refreshAction: { minHeight:48, flexDirection:'row', gap:spacing.xs, paddingHorizontal:12, paddingVertical:spacing.xs, borderRadius:radius.md, alignItems:'center', justifyContent:'center', backgroundColor:colors.surface, borderWidth:1, borderColor:'#DCE2E7' },
  identity: {alignSelf:'flex-start',maxWidth:'100%',backgroundColor:'#E4E9ED',borderRadius:radius.sm,paddingHorizontal:spacing.sm,paddingVertical:spacing.xs},
  taskCode: {...typography.labelSm,lineHeight:18,color:'#192D40',flexShrink:1},
  taskTitle: {...typography.bodyMd,fontSize:16,lineHeight:24,color:'#192D40',fontWeight:'400'},
  taskStatusRow: {flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:spacing.sm,borderTopWidth:1,borderTopColor:colors.border,paddingTop:spacing.sm},
  actionLabel: {...typography.labelLg,color:colors.secondary},
  loadingRow: {flexDirection:'row',alignItems:'center',gap:spacing.sm,padding:spacing.md,marginBottom:spacing.md,backgroundColor:colors.surfaceAlt,borderRadius:radius.md},
  refreshPressed: { backgroundColor: '#F3ECD6' },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  actionButton: { flex: 1 },
  helpHeading: {flexDirection:"row",alignItems:"center",gap:spacing.sm},
  helpTitle: {...typography.labelLg,lineHeight:20,color:colors.neutral,flex:1},
  helpToggle: {minWidth:48,minHeight:48,alignItems:"center",justifyContent:"center",borderRadius:radius.md,backgroundColor:'#FBF8EE',borderWidth:1,borderColor:'#E8D9A8'},
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
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
    ...typography.labelLg,
    lineHeight:21,
    color: '#192D40',
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
  evidenceActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, alignItems: 'center' },
  photoGrid: {flexDirection:'row',flexWrap:'wrap',gap:spacing.sm},
  photoTile: {width:'48%',gap:spacing.xs},
  photoFrame: {aspectRatio:1,borderRadius:radius.md,overflow:'hidden',backgroundColor:colors.surfaceAlt,borderWidth:1,borderColor:'#DCE2E7'},
  photoImage: {width:'100%',height:'100%'},
  photoOverlay: {position:'absolute',top:0,left:0,right:0,bottom:0,alignItems:'center',justifyContent:'center'},
  photoOverlayBusy: {backgroundColor:'rgba(0,0,0,0.25)'},
  photoCaption: {position:'absolute',bottom:0,left:0,right:0,paddingVertical:6,paddingHorizontal:4,backgroundColor:'rgba(26,29,32,0.78)'},
  photoStatus: {...typography.caption,color:colors.surface,textAlign:'center'},
  verifiedBadge: {position:'absolute',top:6,left:6,backgroundColor:colors.surface,borderRadius:radius.full,padding:2},
  progressTrack: {position:'absolute',bottom:0,left:0,right:0,height:3,backgroundColor:'rgba(255,255,255,0.3)'},
  progressFill: {height:3,backgroundColor:colors.primary},
  removePhoto: {position:'absolute',right:0,top:0,width:48,height:48,borderRadius:radius.full,backgroundColor:colors.surface,alignItems:'center',justifyContent:'center'},
  errorPanel: { marginBottom: spacing.md, borderLeftWidth: 3, borderLeftColor: colors.error, gap: spacing.xs },
  successPanel: { marginBottom: spacing.md, borderLeftWidth: 3, borderLeftColor: colors.success, gap: spacing.xs },
  pendingPanel: { marginBottom: spacing.md, borderLeftWidth: 3, borderLeftColor: colors.warning, gap: spacing.xs },
  noticeMessage: { color: colors.neutral },
  errorHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  errorTitle: { ...typography.labelLg, color: colors.neutral },
  errorMessage: { ...typography.bodyMd, color: colors.neutral },
  detailToggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start', minHeight: 48, paddingHorizontal:spacing.sm, borderRadius:radius.md, backgroundColor:'#FBF8EE' },
  detailLabel: { ...typography.labelLg, color: colors.secondary },
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
    ...typography.bodyMd,
    color: colors.secondary,
  },
  centerText: {
    textAlign: 'center',
  },
  choiceRow: {
    flexDirection: 'column',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  photoProgressRing: {width:56,height:56,borderRadius:28,borderWidth:3,borderColor:'rgba(255,255,255,0.3)',backgroundColor:'rgba(26,29,32,0.72)',alignItems:'center',justifyContent:'center'},
  ringHalf: {position:'absolute',top:-3,width:28,height:56,overflow:'hidden'},
  ringRight: {right:-3}, ringLeft: {left:-3},
  ringArc: {position:'absolute',width:56,height:56,borderRadius:28,borderWidth:3,borderColor:'transparent',borderTopColor:colors.surface,borderRightColor:colors.surface},
  arcRight: {right:0}, arcLeft: {left:0},
  ringText: {...typography.labelSm,color:colors.surface},
  positionEditor: {gap:12,paddingBottom:spacing.md},
  positionIntro: {backgroundColor:'#FBF8EE',borderWidth:1,borderColor:'#E8D9A8',borderRadius:radius.lg,padding:spacing.md,gap:spacing.sm},
  positionOption: {minHeight:52,flexDirection:'row',alignItems:'center',gap:spacing.sm,padding:12,borderWidth:1,borderColor:colors.border,borderRadius:radius.md,backgroundColor:colors.surface},
  positionOptionSelected: {backgroundColor:'#F3ECD6',borderColor:'#8C6D1F'},
  positionSegment: {minHeight:48,backgroundColor:colors.surface,borderColor:colors.border,paddingHorizontal:12},
  positionChoiceLabel: {...typography.bodyMd,lineHeight:21,color:colors.secondary,flex:1},
  positionChoiceSelected: {fontWeight:'500',color:colors.neutral},
  positionSummary: {flexDirection:'row',alignItems:'center',gap:spacing.sm,paddingVertical:spacing.sm,borderTopWidth:1,borderTopColor:colors.border},
  positionHint: {flexDirection:'row',alignItems:'flex-start',gap:spacing.xs,padding:spacing.sm,borderRadius:radius.md,backgroundColor:colors.surfaceAlt},
  positionHintText: {...typography.caption,color:colors.secondary,flexShrink:1},
  choiceOption: {
    minHeight: 48,
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

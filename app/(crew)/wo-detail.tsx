import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Chip } from '../../src/components/Chip';
import { InputField } from '../../src/components/InputField';
import { Toast } from '../../src/components/Toast';
import { defectTypeLabel } from '../../src/constants/defect-types';
import { CREW_REPAIR_CORRECTION } from '../../src/constants/routes';
import {
  isRepairVersionConflict,
  repairCommandErrorMessage,
  withFreshItemVersion,
  useRepairBootstrap,
} from '../../src/hooks/useRepairBootstrap';
import {
  applyEligibility,
  computeArea,
  ELIGIBILITY_FAIL_CLOSED_MESSAGE,
  fetchRepairEligibility,
  getBeforeEvidenceCandidates,
  getCrewFieldSession,
  selectBeforeEvidence,
  startCrewFieldSession,
  updateCrewMeasurement,
  markAttemptStarted,
  markSessionSubmitted,
  EVIDENCE_REUSE_SOURCE_TAGS,
  type BeforeEvidenceCandidate,
} from '../../src/api/mock/crew-inspection';
import { CrewTaskBoundary, TASK_MODE_CHIP, useCrewIdentity } from './tasks';
import { useAuthStore } from '../../src/store/auth';
import { passwordSessionIdentity } from '../../src/api/authApi';
import { randomUUID } from 'expo-crypto';
import { openDatabase, initDatabase, saveDraft } from '../../src/offline/database';
import { createFieldCommand, executeFieldCommand, fieldCommandBlock, fieldCapabilityBlock, getFieldTaskStartOriginReal, validateCrewTaskDetail, type FieldCommandRecord, type FieldCommandAction, type CrewTask } from '../../src/api/crewApi';
import { crewTaskActionBlock, normalRepairBlock, type OperationalCrewTask } from '../../src/api/crewApi';
import {
  acceptFieldTaskReal,
  formatStrongIfMatch,
  getFieldInspectionTaskDetailReal,
  getRepairEligibilityReal,
  isConcurrencyConflict,
  isPreconditionRequired,
  newIdempotencyKey,
  rejectFieldTaskReal,
  startFieldTaskReal,
  submitRepairAssessmentReal,
  type FieldTaskViewFact,
} from '../../src/api/crewApi';
import { clearCommandKey, getOrCreateCommandKey } from '../../src/api/idempotency';
import { stableUuid } from '../../src/utils/uuid';
import { currentRepairIdentity, sameRepairIdentity, type RepairJournalRecord } from '../../src/api/crewRepairDraft';
import { prepareRepairAssessment, prepareRepairStart, dispatchRepair, readRepairFieldDraft, readRepairHistory, repairErrorMessage } from '../../src/api/crewRepairWorkflow';
import type { FieldDraft } from '../../src/api/crewFieldDraft';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

function parseDimension(value: string): number | null {
  const parsed = Number.parseFloat(value.replace(',', '.'));
  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function formatCapturedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return `${date.toLocaleDateString('vi-VN')} ${date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

/** Câu tiếng Việt cho lỗi API-081/091/093 — không lộ mã kỹ thuật lên màn hình. */
function fieldTaskActionMessage(error: unknown): string {
  const errorResponse = (
    error as { response?: { status?: number; data?: { code?: string } } } | undefined
  )?.response;
  const code = errorResponse?.data?.code;
  if (
    code === 'concurrency_conflict' ||
    code === 'precondition_required' ||
    errorResponse?.status === 409 ||
    errorResponse?.status === 412 ||
    isConcurrencyConflict(error) ||
    isPreconditionRequired(error)
  ) {
    return 'Nhiệm vụ vừa thay đổi trên máy chủ (phiên bản không khớp). Vui lòng tải lại rồi thử lại.';
  }
  if (code === 'idempotency_key_reused') {
    return 'Thao tác này đã được gửi trước đó. Vui lòng tải lại nhiệm vụ.';
  }
  if (errorResponse?.status === 403) {
    return 'Bạn không còn được giao xử lý nhiệm vụ này.';
  }
  if (errorResponse?.status === 404) {
    return 'Nhiệm vụ không còn tồn tại hoặc đã được điều phối lại.';
  }
  return 'Không gửi được thao tác. Vui lòng kiểm tra kết nối rồi thử lại.';
}

type EligibilityStatus = 'idle' | 'loading' | 'ready' | 'error';
interface EligibilityState {
  status: EligibilityStatus;
  eligible: boolean;
  missingReasons: string[];
  policyRevisionId: string | null;
  message: string | null;
}

const INITIAL_ELIGIBILITY: EligibilityState = {
  status: 'idle',
  eligible: false,
  missingReasons: [],
  policyRevisionId: null,
  message: null,
};

/**
 * `missingReasons` từ API-146 là MÃ MÁY (UPPER_SNAKE), không phải câu tiếng Việt.
 * Mã lạ ⇒ fail closed với câu chung, tuyệt đối không hiển thị mã thô cho Crew.
 */
const ELIGIBILITY_REASON_LABEL: Record<string, string> = {
  CURRENT_EXECUTION_AUTHORITY_DENIED:
    'Bạn không còn quyền thực hiện hạng mục này tại hiện trường; chuyển PM xử lý.',
  ROAD_HANDOVER_MAPPING_UNKNOWN: 'Chưa xác định được hồ sơ bàn giao tuyến đường.',
  NORMAL_FLOW_REQUIRES_SUPERVISOR_APPROVAL:
    'Nhiệm vụ không ở chế độ đo-kiểm-và-sửa; cần Giám sát/PM duyệt theo luồng thường.',
  POLICY_UNAVAILABLE: 'Máy chủ chưa công bố chính sách sửa nhanh đang áp dụng.',
  PINNED_POLICY_SOURCE_MISMATCH: 'Chính sách ghim không khớp nguồn hiện hành của máy chủ.',
  ASSESSMENT_REQUIRED: 'Chưa có ảnh hiện trạng hợp lệ để đối chiếu sửa nhanh.',
  ASSESSMENT_SOURCE_OR_LOCATION_UNVERIFIED:
    'Ảnh hiện trạng chưa xác thực được nguồn hoặc vị trí khuyết tật.',
  MEASUREMENT_SOURCE_MISMATCH: 'Nguồn số đo hiện trường không khớp với hồ sơ đánh giá.',
  POLICY_MEASUREMENT_SOURCE_NOT_UNIQUE: 'Số đo hiện trường có nhiều nguồn, chưa xác định duy nhất.',
  STOP_CONDITION_OBSERVATION_UNKNOWN: 'Chưa xác nhận được điều kiện dừng khẩn cấp tại hiện trường.',
  POLICY_THRESHOLDNOTMET: 'Kích thước hư hại vượt ngưỡng sửa nhanh của chính sách hiện hành.',
  POLICY_NOTCONFIGURED: 'Chính sách hiện hành không cấu hình cho loại khuyết tật này.',
  POLICY_STOPCONDITION: 'Hiện trường có điều kiện dừng khẩn cấp; không sửa nhanh tại chỗ.',
  POLICY_UNKNOWNMEASUREMENT:
    'Chưa ghi nhận đủ số đo hiện trường (chiều dài, chiều rộng, độ sâu).',
  POLICY_WRONGUNIT: 'Đơn vị số đo không khớp yêu cầu của chính sách.',
  FIRST_START_NOT_VERIFIED: 'Chưa xác thực thời điểm bắt đầu xử lý đầu tiên.',
  EXECUTION_WINDOW_EXPIRED: 'Đã quá thời hạn được phép sửa nhanh tại hiện trường.',
};

const ELIGIBILITY_REASON_FALLBACK =
  'Điều kiện sửa nhanh chưa đạt theo đánh giá của máy chủ; chuyển PM xử lý.';

function eligibilityReasonLabel(code: string): string {
  return ELIGIBILITY_REASON_LABEL[code] ?? ELIGIBILITY_REASON_FALLBACK;
}

export default function CrewWoDetailScreen() {
  return <CrewTaskBoundary operational={false}>{task => <CrewFieldActions task={task} />}</CrewTaskBoundary>;
}

/** Durable online command journal, separate from offline repair sync. Errors never fall back to memory. */
async function fieldJournal(actor: string, project: string, task: string) {
  const db = openDatabase();
  await initDatabase(db);
  const key = `t05a-field:${actor}:${project}:${task}`;
  return {
    read: async (): Promise<FieldCommandRecord | null> => {
      const row = await db.getFirstAsync<{ payload: string }>('SELECT payload FROM local_draft WHERE id = ?', key);
      if (!row) return null;
      const record = JSON.parse(row.payload) as FieldCommandRecord;
      if (record.actorId !== actor || record.projectId !== project || record.taskId !== task || !record.key || !record.scope ||
        !['pending','acknowledged','confirmed','rejected'].includes(record.phase)) throw new Error('field_journal_invalid');
      return record;
    },
    write: async (record: FieldCommandRecord) => saveDraft(db, key, 'T05A_FIELD_COMMAND', { ...record }),
  };
}

function currentCrewScope(): string | null {
  const { user, token, status } = useAuthStore.getState();
  const scope = passwordSessionIdentity(token);
  return user?.role_code === 'REPAIR_CREW' && !user.must_change_password && ['AUTHENTICATED','REFRESHING'].includes(status) &&
    scope && JSON.parse(scope)[0] === user.id ? scope : null;
}
function currentCrewActor(): string | null {
  return currentCrewScope() ? useAuthStore.getState().user?.id ?? null : null;
}

function CrewFieldActions({ task }: { task: CrewTask }) {
  const identity = useCrewIdentity();
  const [fresh, setFresh] = useState(task);
  const [record, setRecord] = useState<FieldCommandRecord | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState('');
  const scope = identity.scope;
  const actor = identity.user?.id ?? '';
  const apply = useCallback((result: FieldCommandRecord) => {
    if (currentCrewScope() !== scope) return;
    setRecord(result);
    if (result.task && result.etag) setFresh(previous => ({ ...previous, detail: result.task, status: result.task!.status ?? '', version: result.task!.version!, etag: result.etag }));
    setNotice(result.phase === 'rejected' ? 'Máy chủ từ chối lệnh (HTTP ' + result.rejectionStatus + '). Tải lại dữ liệu trước khi thử một lệnh mới.' :
      result.phase === 'confirmed' && result.readbackStatus === 200 ? 'Đã xác nhận trạng thái và phiên bản bằng dữ liệu mới từ máy chủ.' :
      result.phase === 'acknowledged' ? 'Máy chủ đã ghi nhận lệnh; chưa xác nhận được bằng GET. Giữ biên nhận để đối soát.' :
      'Chưa xác định được kết quả lệnh. Giữ nguyên lệnh cũ; tải lại để đối soát.');
  }, [scope]);
  useEffect(() => {
    let live = true;
    setFresh(task);setReady(false);setRecord(null);setNotice('');
    void (async () => {
      try {
        const journal = await fieldJournal(actor, task.projectId, task.id);
        const saved = await journal.read();
        if (!live || currentCrewScope() !== scope) return;
        if (saved) {
          const result = await executeFieldCommand(saved, { ...journal, currentScope: currentCrewScope, currentActor: currentCrewActor }, false);
          if (live) apply(result);
        }
        if (live && currentCrewScope() === scope) setReady(true);
      } catch { if (live && currentCrewScope() === scope) setNotice('Không đọc/đối soát được nhật ký lệnh. Tạm khóa gửi để tránh ghi trùng.'); }
    })();
    return () => { live = false; };
  }, [actor, scope, task, apply]);
  const run = async (action?: FieldCommandAction, replay = false) => {
    if ((!ready && !!action) || busy || !scope || currentCrewScope() !== scope) return;
    setBusy(true);setNotice('');
    try {
      const journal = await fieldJournal(actor, task.projectId, task.id);
      if (currentCrewScope() !== scope) return;
      const saved = await journal.read();
      if (currentCrewScope() !== scope) return;
      const unresolved = saved && !['confirmed','rejected'].includes(saved.phase);
      if (action && unresolved) throw new Error('field_command_pending');
      const command = action ? createFieldCommand({ task: fresh.detail!, etag: fresh.etag ?? '', actorId: actor, scope, action,
        reason: action === 'accept' ? 'Nhận nhiệm vụ hiện trường' : reason, key: newIdempotencyKey(),
        originId: action === 'start' ? randomUUID() : undefined, claimedAt: new Date().toISOString() }) : saved;
      if (!command) {
        const response = await getFieldInspectionTaskDetailReal(task.projectId, task.id);
        if (currentCrewScope() !== scope) return;
        validateCrewTaskDetail(response.data, response.etag, task.projectId, task.id, actor);
        setFresh(previous => ({ ...previous, detail: response.data, status: response.data.status ?? '', version: response.data.version!, etag: response.etag }));
        setNotice('Đã tải lại dữ liệu nhiệm vụ từ máy chủ.');
        setReady(true);
        return;
      }
      const result = await executeFieldCommand(command, { ...journal, currentScope: currentCrewScope, currentActor: currentCrewActor }, !!action || replay);
      apply(result);
      if (currentCrewScope() === scope) setReady(true);
    } catch (error) {
      if (currentCrewScope() === scope) {
        // Reload the persisted immutable intent even when POST has an unknown outcome.
        try { const saved = await (await fieldJournal(actor, task.projectId, task.id)).read(); if (currentCrewScope() === scope) setRecord(saved); } catch { setReady(false); }
        setNotice(fieldTaskActionMessage(error) + ' Không tạo lệnh mới khi kết quả cũ chưa rõ; dùng đối soát hoặc gửi lại đúng lệnh cũ.');
      }
    } finally { if (currentCrewScope() === scope) setBusy(false); }
  };
  const pending = !!record && (!['confirmed','rejected'].includes(record.phase) || (record.phase === 'rejected' && record.readbackStatus !== 200));
  const openField = async () => {
    if (busy || pending || !ready) return;
    setBusy(true);
    try {
      const response = await getFieldInspectionTaskDetailReal(task.projectId,task.id);
      if(currentCrewScope()!==scope)return;
      const reason=fieldCapabilityBlock(response.data,response.etag,actor,'review');
      if(reason)throw new Error(reason);
      const origin=await getFieldTaskStartOriginReal(task.projectId,task.id);
      if(currentCrewScope()!==scope)return;
      if(origin.id!==response.data.firstStartOriginId||origin.taskId!==task.id)throw new Error('First-start không khớp nhiệm vụ.');
      router.push({pathname:'/(crew)/field-review',params:{id:task.id,projectId:task.projectId}});
    }catch(error){if(currentCrewScope()===scope)setNotice((error as Error).message || 'Không xác nhận được điều kiện FIELD.');}
    finally{if(currentCrewScope()===scope)setBusy(false);}
  };
  const fieldBlock = !fresh.detail ? 'Chưa tải dữ liệu nhiệm vụ.' : fieldCapabilityBlock(fresh.detail,fresh.etag??'',actor,'review');
  const blocked = (action: FieldCommandAction) => !ready || busy || pending || !fresh.detail || !!fieldCommandBlock(fresh.detail, fresh.etag ?? '', actor, action);
  return (
    <SafeAreaScreen scroll header={<View style={styles.topBar}><Text style={typography.titleMd}>Chi tiết lệnh công tác</Text></View>}>
      <Card style={styles.card}>
        <Text style={typography.titleMd}>Nhiệm vụ hiện trường</Text>
        <Text selectable>Mã nhiệm vụ: {task.id}</Text>
        <Text selectable>Dự án: {task.projectId}</Text>
        <Text>Trạng thái: {fresh.status || 'Chưa có dữ liệu'}</Text>
        <Text>Chế độ BE: {task.rawMode || 'Chưa có dữ liệu'}</Text>
        <Text selectable>Phiên bản: {fresh.version}</Text>
        <Text>Mô tả: {task.description || 'Chưa có dữ liệu'}</Text>
        <Text>Thời hạn: {task.due_label || 'Chưa có dữ liệu'}</Text>
        <Text>WO / tuyến / GPS / loại khuyết tật: Chưa có dữ liệu từ máy chủ.</Text>
        <Text>{crewTaskActionBlock(task)}</Text>
        <Text>Nhận / từ chối / bắt đầu dùng assignment và phiên bản thật; không yêu cầu GPS.</Text>
        <NormalRepairBootstrap task={task} />
      </Card>
      <Card style={styles.taskActionCard}>
        <Text style={typography.titleMd}>Nhận / từ chối nhiệm vụ</Text>
        <InputField label="Lý do từ chối (1–2000 ký tự)" value={reason} onChangeText={setReason} multiline />
        <Button variant="primary" title="Nhận nhiệm vụ" disabled={blocked('accept')} loading={busy} onPress={() => void run('accept')} />
        <Button variant="secondary" title="Từ chối nhiệm vụ" disabled={blocked('reject') || !reason.trim() || reason.trim().length > 2000} onPress={() => void run('reject')} />
        <Button variant="secondary" title="Bắt đầu nhiệm vụ" disabled={blocked('start')} onPress={() => void run('start')} />
        {notice ? <Text accessibilityLiveRegion="polite">{notice}</Text> : null}
        {record?.origin ? <Text selectable>Mã first-start từ máy chủ: {record.origin.id}</Text> : null}
        <Button variant="secondary" title="Tải lại / đối soát" disabled={busy} onPress={() => void run()} />
        {record?.phase === 'pending' ? <Button variant="secondary" title="Gửi lại đúng lệnh cũ" disabled={busy || record.scope !== scope} onPress={() => void run(undefined, true)} /> : null}
      </Card>
      <Button variant="secondary" title="Dẫn đường" disabled={!fresh.coordinates} onPress={() => {
        if (fresh.coordinates) router.push({ pathname: '/(crew)/navigation', params: { id: fresh.id, projectId: fresh.projectId } });
      }} />
      {fieldBlock ? <Text>{fieldBlock}</Text> : null}
      <Button variant="secondary" title="Tác nghiệp hiện trường" disabled={!ready||busy||pending||!!fieldBlock} onPress={() => void openField()} />
      <Button variant="secondary" title="Danh sách nhiệm vụ" onPress={() => router.replace('/(crew)/tasks')} />
    </SafeAreaScreen>
  );
}

/** Explicit NORMAL commands only. Legacy repair content remains unmounted. */
export function NormalRepairBootstrap({ task }: { task: CrewTask }) {
  const result = useRepairBootstrap(task.id, { projectId: task.projectId });
  const identity=useCrewIdentity();
  const assessmentBlock=task.detail&&identity.user&&identity.scope?normalRepairBlock(task.detail,task.etag??'',identity.user.id,'assessment'):'Phiên Crew hoặc ngữ cảnh nhiệm vụ chưa hợp lệ.';
  const [history,setHistory]=useState<RepairJournalRecord[]>([]),[draft,setDraft]=useState<FieldDraft|null>(null);
  const [notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false);
  const active=useRef(false),lock=useRef(false);
  const load=useCallback(async()=>{
    const i=currentRepairIdentity(task.projectId,task.id);if(!i)return;
    setLoaded(false);setHistory([]);setDraft(null);setNotice('');
    try {
      const rows=await readRepairHistory(i),field=await readRepairFieldDraft(i);
      if(active.current&&sameRepairIdentity(i,currentRepairIdentity(task.projectId,task.id))){setHistory(rows);setDraft(field);setLoaded(true);}
    }catch(e){if(active.current&&sameRepairIdentity(i,currentRepairIdentity(task.projectId,task.id)))setNotice(repairErrorMessage(e));}
  },[task.id,task.projectId]);
  useFocusEffect(useCallback(()=>{active.current=true;void load();return()=>{active.current=false;};},[load]));
  const pending=history.find(c=>!['CONFIRMED','REJECTED'].includes(c.phase));
  const assessment=history.filter(c=>c.operation==='assessment'&&c.phase==='CONFIRMED').at(-1);
  const started=history.find(c=>c.operation==='start'&&c.phase==='CONFIRMED');
  const ready=assessment?.receipt?.data.readiness==='READY';
  const sourceReady=!!draft?.measurements.length&&!!draft.captures.some(c=>c.purpose!=='AFTER'&&c.verified&&c.upload?.fileId);
  const run=async(action:'assessment'|'start'|'replay')=>{
    if(lock.current)return;const i=currentRepairIdentity(task.projectId,task.id);if(!i)return;
    lock.current=true;setBusy(true);setNotice('');
    try {
      const command=action==='replay'?pending:action==='start'?await prepareRepairStart(i):await prepareRepairAssessment(i,await readRepairFieldDraft(i));
      if(!command)throw Error('repair_command_missing');
      const receipt=await dispatchRepair(i,command.key);
      if(active.current&&sameRepairIdentity(i,currentRepairIdentity(task.projectId,task.id)))setNotice(receipt.phase==='CONFIRMED'?'Đã lưu receipt máy chủ và đối chiếu ngữ cảnh hạng mục.':'Lệnh chưa được xác nhận; giữ nguyên để đối soát.');
    }catch(e){if(active.current&&sameRepairIdentity(i,currentRepairIdentity(task.projectId,task.id)))setNotice(repairErrorMessage(e));}
    finally{
      lock.current=false;
      if(active.current&&sameRepairIdentity(i,currentRepairIdentity(task.projectId,task.id))){
        setBusy(false);
        try{const rows=await readRepairHistory(i);if(active.current&&sameRepairIdentity(i,currentRepairIdentity(task.projectId,task.id)))setHistory(rows);}catch{/* Keep the error and disable new commands on failed reload. */if(active.current){setLoaded(false);setHistory([]);}}
        void result.reload();
      }
    }
  };
  return <View>
    <Text style={typography.titleMd}>Ngữ cảnh sửa chữa NORMAL</Text>
    {result.status === 'loading' ? <Text>Đang đọc ngữ cảnh từ máy chủ…</Text> : null}
    {result.status === 'error' ? <Text>Không xác nhận được ngữ cảnh sửa chữa. Vui lòng tải lại.</Text> : null}
    {result.status === 'ready' && !result.repairContext ? <Text>Máy chủ chưa cung cấp ngữ cảnh NORMAL đang được giao. FastTrack chưa được mở.</Text> : null}
    {result.repairContext ? <>
      <Text selectable>Hạng mục: {result.repairContext.itemId}</Text>
      <Text selectable>Binding: {result.repairContext.bindingId}</Text>
      <Text>Trạng thái hạng mục: {result.repairContext.status}</Text>
      <Text selectable>Phiên bản hạng mục: {result.itemVersion}</Text>
      <Text>Phương án: {result.repairContext.repairPlan}</Text>
      <Text>Checklist: {result.repairContext.checklistVersion}</Text>
    </> : null}
    <Text>Nguồn: API-080/094, số đo và ảnh từ nháp FIELD của phiên Crew hiện tại.</Text>
    <Text>Số đo đã lưu: {draft?.measurements.length??0}. Ảnh trước sửa/đo VERIFIED: {draft?.captures.filter(c=>c.purpose!=='AFTER'&&c.verified).length??0}.</Text>
    {!sourceReady?<Text>Cần lưu số đo thực và upload ảnh BEFORE/MEASUREMENT đến VERIFIED trong hồ sơ FIELD. Ảnh AFTER không được đưa vào đánh giá trước sửa.</Text>:null}
    <Button variant="secondary" title="Số đo / ảnh FIELD" disabled={busy||!task.detail?.firstStartOriginId} onPress={()=>router.push({pathname:'/(crew)/field-review',params:{id:task.id,projectId:task.projectId}})}/>
    {assessmentBlock&&!started?<Text>{assessmentBlock}</Text>:null}
    <Button variant="secondary" title="Gửi đánh giá trước sửa" disabled={busy||!loaded||!sourceReady||!!assessmentBlock||!!pending||(!!history.length&&assessment?.receipt?.data.readiness!=='INCOMPLETE')||result.status!=='ready'||result.repairContext?.status!=='Assigned'} onPress={()=>void run('assessment')}/>
    {history.map(c=><View key={c.key}>
      <Text>{c.operation==='assessment'?'Đánh giá':'Bắt đầu'}: {c.phase}</Text>
      {c.receipt?<><Text selectable>Receipt máy chủ: {String(c.receipt.data.id)}</Text><Text>{String(c.receipt.data.readiness??'Receipt execution-start')}</Text>
        {Array.isArray(c.receipt.data.missingReasons)?c.receipt.data.missingReasons.map(r=><Text key={String(r)}>{String(r)}</Text>):null}</>:null}
      {c.phase==='REJECTED'?<Text>Máy chủ đã từ chối lệnh HTTP {c.rejection?.status}. Giữ lịch sử để đối soát, không tạo key thay thế.</Text>:null}
    </View>)}
    {assessment&&!ready?<Text>Assessment còn INCOMPLETE. Sửa nháp FIELD theo missingReasons rồi chủ động gửi assessment mới; lịch sử cũ được giữ nguyên.</Text>:null}
    <Button variant="secondary" title="Bắt đầu thi công" disabled={busy||!loaded||!ready||!!pending||!!started||history.some(c=>c.operation==='start')||result.status!=='ready'} onPress={()=>void run('start')}/>
    {pending?<><Text>Chưa xác nhận được kết quả. Chỉ đối soát/gửi lại đúng lệnh đã lưu.</Text><Button variant="secondary" title="Đối soát / replay lệnh đã lưu" disabled={busy||!loaded} onPress={()=>void run('replay')}/></>:null}
    {started?<Text>Đã bắt đầu thi công. Đã có receipt BE và ngữ cảnh InProgress khớp phiên bản. Chức năng kết thúc chưa được mở.</Text>:null}
    <Text>FastTrack, kết thúc và nộp hồ sơ sửa chữa chưa được mở. Không sử dụng màn thi công legacy.</Text>
    {notice?<Text accessibilityLiveRegion="polite">{notice}</Text>:null}
    <Button variant="secondary" title="Tải lại ngữ cảnh sửa chữa" disabled={busy} loading={result.status === 'loading'} onPress={() => {void result.reload();void load();}} />
  </View>;
}
function CrewWoDetailContent({ task }: { task: OperationalCrewTask }) {
  const params = useLocalSearchParams<{ id?: string }>();
  const modeChip = TASK_MODE_CHIP[task.task_mode];

  const [session, setSession] = useState(() => getCrewFieldSession());
  const initialMeasurement = session?.measurement ?? { length_m: null, width_m: null, depth_cm: null };
  const [lengthText, setLengthText] = useState(() => (initialMeasurement.length_m !== null ? String(initialMeasurement.length_m) : ''));
  const [widthText, setWidthText] = useState(() => (initialMeasurement.width_m !== null ? String(initialMeasurement.width_m) : ''));
  const [depthText, setDepthText] = useState(() => (initialMeasurement.depth_cm !== null ? String(initialMeasurement.depth_cm) : ''));
  const [anchorLoading, setAnchorLoading] = useState(false);
  const [anchorError, setAnchorError] = useState<string | null>(null);

  const [fieldTask, setFieldTask] = useState<FieldTaskViewFact | null>(null);
  const [fieldTaskEtag, setFieldTaskEtag] = useState<string | null>(null);
  const [taskAction, setTaskAction] = useState<'accept' | 'reject' | 'start' | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [taskNotice, setTaskNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );

  const projectId = task.projectId || null;

  const loadFieldTask = useCallback(async () => {
    if (!projectId) {
      setTaskNotice({ type: 'error', message: 'Không xác định được dự án của nhiệm vụ.' });
      setFieldTask(null);
      setFieldTaskEtag(null);
      return;
    }
    try {
      const response = await getFieldInspectionTaskDetailReal(projectId, task.id);
      setFieldTask(response.data as unknown as FieldTaskViewFact);
      setFieldTaskEtag(response.etag);
    } catch {
      // Khi gọi thật lỗi, KHÔNG gọi mock thay thế để tránh thành công giả
      setFieldTask(null);
      setFieldTaskEtag(null);
      setTaskNotice({
        type: 'error',
        message: 'Không tải được thông tin nhiệm vụ từ máy chủ. Vui lòng kiểm tra kết nối.',
      });
    }
  }, [projectId, task.id]);

  useFocusEffect(
    useCallback(() => {
      void loadFieldTask();
    }, [loadFieldTask]),
  );

  useFocusEffect(
    useCallback(() => {
      const existing = getCrewFieldSession();
      if (existing && existing.task_id === task.id) {
        setSession(existing);
        if (existing.measurement.length_m !== null) setLengthText(String(existing.measurement.length_m));
        if (existing.measurement.width_m !== null) setWidthText(String(existing.measurement.width_m));
        if (existing.measurement.depth_cm !== null) setDepthText(String(existing.measurement.depth_cm));
      } else {
        const fresh = startCrewFieldSession({
          task_id: task.id,
          work_order_code: task.wo_code,
          task_mode: task.task_mode,
          defect_type_code: task.defect_type_code,
          coordinates: task.coordinates,
        });
        setSession(fresh);
        setLengthText('');
        setWidthText('');
        setDepthText('');
      }
    }, [task.id, task.wo_code, task.task_mode, task.defect_type_code, task.coordinates]),
  );

  const candidates = useMemo(
    () => getBeforeEvidenceCandidates(task.defect_type_code),
    [task.defect_type_code, session?.before_evidence_id],
  );

  const measurement = session?.measurement ?? { length_m: null, width_m: null, depth_cm: null };
  const area = useMemo(
    () => computeArea(measurement),
    [measurement.length_m, measurement.width_m],
  );
  const hasAllDimensions =
    measurement.length_m !== null && measurement.width_m !== null && measurement.depth_cm !== null;
  const needsEligibility = task.task_mode === 'INSPECT_AND_REPAIR';
  const [eligibility, setEligibility] = useState<EligibilityState>(INITIAL_ELIGIBILITY);

  // Đối chiếu điều kiện Sửa Nhanh với máy chủ (mock API-146). Máy chủ là authority;
  // mọi lỗi/abort đều FAIL CLOSED (coi như không đủ điều kiện), không tự tính ngưỡng ở client.
  useEffect(() => {
    if (!needsEligibility || !hasAllDimensions) {
      applyEligibility('PENDING', null);
      setSession(getCrewFieldSession());
      setEligibility(INITIAL_ELIGIBILITY);
      return;
    }
    let active = true;
    setEligibility((current) => ({ ...current, status: 'loading', eligible: false, message: null }));
    const timer = setTimeout(() => {
      void (async () => {
        try {
          // Thử gọi API-146 từ backend thật nếu nhiệm vụ có ngữ cảnh sửa chữa (repairContext)
          const pkgId = fieldTask?.repairContext?.packageId;
          const itmId = fieldTask?.repairContext?.itemId;
          if (projectId && pkgId && itmId) {
            try {
              const res = await getRepairEligibilityReal(projectId, pkgId, itmId);
              if (!active) return;
              const result = res.data;
              applyEligibility(result.eligible ? 'ELIGIBLE' : 'NOT_ELIGIBLE', result.policyRevisionId);
              setSession(getCrewFieldSession());
              setEligibility({
                status: 'ready',
                eligible: result.eligible,
                missingReasons: Array.from(new Set(result.missingReasons || [])),
                policyRevisionId: result.policyRevisionId,
                message: null,
              });
              return;
            } catch (err: unknown) {
              const status = (err as { response?: { status?: number } })?.response?.status;
              if (status === 403) {
                // Gap P5-G02: Crew không có quyền đọc trực tiếp Repair Item
                if (!active) return;
                applyEligibility('NOT_ELIGIBLE', null);
                setSession(getCrewFieldSession());
                setEligibility({
                  status: 'error',
                  eligible: false,
                  missingReasons: [],
                  policyRevisionId: null,
                  message:
                    'Không có quyền truy cập thẩm định sửa nhanh (Khoảng trống phân quyền P5-G02). Chuyển luồng thường cho PM.',
                });
                return;
              }
              if (status === 409) {
                if (!active) return;
                applyEligibility('NOT_ELIGIBLE', null);
                setSession(getCrewFieldSession());
                setEligibility({
                  status: 'error',
                  eligible: false,
                  missingReasons: [],
                  policyRevisionId: null,
                  message:
                    'Hồ sơ sửa chữa đang ở trạng thái không thể thẩm định lúc này. Chuyển luồng thường cho PM.',
                });
                return;
              }
            }
          }

          // Không tự ý gọi mock khi không có repairContext hoặc lỗi máy chủ
          if (!active) return;
          applyEligibility('NOT_ELIGIBLE', null);
          setSession(getCrewFieldSession());
          setEligibility({
            status: 'error',
            eligible: false,
            missingReasons: [],
            policyRevisionId: null,
            message: ELIGIBILITY_FAIL_CLOSED_MESSAGE,
          });
        } catch {
          if (!active) {
            return;
          }
          applyEligibility('NOT_ELIGIBLE', null);
          setSession(getCrewFieldSession());
          setEligibility({
            status: 'error',
            eligible: false,
            missingReasons: [],
            policyRevisionId: null,
            message: ELIGIBILITY_FAIL_CLOSED_MESSAGE,
          });
        }
      })();
    }, 400);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    needsEligibility,
    hasAllDimensions,
    task.id,
    task.task_mode,
    task.defect_type_code,
    measurement.length_m,
    measurement.width_m,
    measurement.depth_cm,
    fieldTask?.repairContext?.packageId,
    fieldTask?.repairContext?.itemId,
    projectId,
  ]);

  const handleMeasurement = useCallback(
    (patch: { length_m?: number | null; width_m?: number | null; depth_cm?: number | null }) => {
      updateCrewMeasurement(patch);
      setSession(getCrewFieldSession());
    },
    [],
  );

  const handleUseBefore = useCallback((candidate: BeforeEvidenceCandidate) => {
    selectBeforeEvidence(candidate);
    setSession(getCrewFieldSession());
  }, []);

  const handleCaptureBefore = () => {
    router.push({ pathname: '/(crew)/viewfinder', params: { id: task.id, mode: 'BEFORE' } });
  };

  const openGoogleMaps = () => {
    const { latitude, longitude } = task.coordinates;
    Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
    );
  };

  const handleAcceptFieldTask = async () => {
    if (!fieldTask || !fieldTaskEtag) {
      return;
    }
    if (!projectId) {
      setTaskNotice({ type: 'error', message: 'Không xác định được dự án của nhiệm vụ.' });
      return;
    }
    const keyScope = `crew:field-accept:${task.id}`;
    setTaskAction('accept');
    try {
      const idempotencyKey = getOrCreateCommandKey(keyScope);
      const realRes = await acceptFieldTaskReal(
        projectId,
        task.id,
        'Nhận nhiệm vụ hiện trường',
        fieldTaskEtag,
        idempotencyKey,
      );

      clearCommandKey(keyScope);
      setFieldTask(realRes.data as unknown as FieldTaskViewFact);
      setFieldTaskEtag(realRes.etag);
      setTaskNotice({ type: 'success', message: 'Đã nhận nhiệm vụ. Sẵn sàng đo kiểm hiện trường.' });
    } catch (error) {
      clearCommandKey(keyScope);
      // Kiểm tra 400 validation error xem phiên bản có bị thay đổi không
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 400 && projectId) {
        try {
          const fresh = await getFieldInspectionTaskDetailReal(projectId, task.id);
          if (fresh.etag && fresh.etag.replace(/"/g, '') !== fieldTaskEtag.replace(/"/g, '')) {
            setFieldTask(fresh.data as unknown as FieldTaskViewFact);
            setFieldTaskEtag(fresh.etag);
            setTaskNotice({
              type: 'error',
              message: 'Nhiệm vụ vừa thay đổi trên máy chủ (phiên bản không khớp). Vui lòng tải lại.',
            });
            return;
          }
        } catch {
          // ignore
        }
      }
      setTaskNotice({ type: 'error', message: fieldTaskActionMessage(error) });
      void loadFieldTask();
    } finally {
      setTaskAction(null);
    }
  };

  const handleRejectFieldTask = async () => {
    if (!fieldTask || !fieldTaskEtag) {
      return;
    }
    const reason = rejectReason.trim();
    if (!reason) {
      setTaskNotice({ type: 'error', message: 'Vui lòng nêu lý do từ chối nhiệm vụ.' });
      return;
    }
    if (!projectId) {
      setTaskNotice({ type: 'error', message: 'Không xác định được dự án của nhiệm vụ.' });
      return;
    }
    const keyScope = `crew:field-reject:${task.id}`;
    setTaskAction('reject');
    try {
      const idempotencyKey = getOrCreateCommandKey(keyScope);
      const realRes = await rejectFieldTaskReal(
        projectId,
        task.id,
        reason,
        fieldTaskEtag,
        idempotencyKey,
      );

      clearCommandKey(keyScope);
      setFieldTask(realRes.data as unknown as FieldTaskViewFact);
      setFieldTaskEtag(realRes.etag);
      setRejectOpen(false);
      setRejectReason('');
      setTaskNotice({ type: 'success', message: 'Đã gửi lý do từ chối tới điều phối viên.' });
    } catch (error) {
      clearCommandKey(keyScope);
      // Kiểm tra 400 validation error xem phiên bản có bị thay đổi không
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 400 && projectId) {
        try {
          const fresh = await getFieldInspectionTaskDetailReal(projectId, task.id);
          if (fresh.etag && fresh.etag.replace(/"/g, '') !== fieldTaskEtag.replace(/"/g, '')) {
            setFieldTask(fresh.data as unknown as FieldTaskViewFact);
            setFieldTaskEtag(fresh.etag);
            setTaskNotice({
              type: 'error',
              message: 'Nhiệm vụ vừa thay đổi trên máy chủ (phiên bản không khớp). Vui lòng tải lại.',
            });
            return;
          }
        } catch {
          // ignore
        }
      }
      setTaskNotice({ type: 'error', message: fieldTaskActionMessage(error) });
      void loadFieldTask();
    } finally {
      setTaskAction(null);
    }
  };

  const handleStartFieldTask = async () => {
    if (!fieldTask || !fieldTaskEtag) return;
    if (!projectId) {
      setTaskNotice({ type: 'error', message: 'Không xác định được dự án của nhiệm vụ.' });
      return;
    }
    const keyScope = `crew:field-start:${task.id}`;
    setTaskAction('start');
    try {
      const idempotencyKey = getOrCreateCommandKey(keyScope);
      const res = await startFieldTaskReal(
        projectId,
        task.id,
        {
          originId: stableUuid(`crew:field-start-origin:${task.id}`),
          claimedAt: new Date().toISOString(),
          deviceId: 'mobile-app',
        },
        fieldTaskEtag,
        idempotencyKey,
      );
      clearCommandKey(keyScope);
      setFieldTask((prev) =>
        prev
          ? {
              ...prev,
              status: 'InProgress',
              firstStartOriginId: res.data.id,
              version: res.etag,
            }
          : null,
      );
      setFieldTaskEtag(res.etag);
      setTaskNotice({ type: 'success', message: 'Đã ghi nhận bắt đầu công việc tại hiện trường.' });
    } catch (err) {
      clearCommandKey(keyScope);
      setTaskNotice({ type: 'error', message: fieldTaskActionMessage(err) });
      void loadFieldTask();
    } finally {
      setTaskAction(null);
    }
  };

  const beforeSelected = Boolean(session?.before_evidence_id);
  const measureReady = hasAllDimensions;
  const fastTrackEligible = eligibility.status === 'ready' && eligibility.eligible;
  const eligibilityPending = needsEligibility && hasAllDimensions && eligibility.status !== 'ready';

  const handlePrimaryAction = async () => {
    if (!hasAllDimensions) {
      return;
    }
    if (task.task_mode === 'MEASURE_ONLY') {
      if (!beforeSelected) {
        return;
      }
      markSessionSubmitted();
      router.push({ pathname: '/(crew)/complete', params: { id: task.id } });
      return;
    }
    if (fastTrackEligible) {
      if (!beforeSelected) {
        return;
      }
      // C-04: đọc lại API-080 ngay trước khi vào luồng sửa để chắc chắn có hạng mục sửa chữa
      // (itemVersion) còn hiệu lực. Không có anchor → chặn tại chỗ, không tự chế mã phiên bản.
      setAnchorLoading(true);
      try {
        await withFreshItemVersion(task.id, (command) => Promise.resolve(command.headers));
        // Gọi API-156: nộp đánh giá hiện trường trước khi bắt đầu thi công
        if (projectId && fieldTask?.repairContext) {
          const freshTask = await getFieldInspectionTaskDetailReal(projectId, task.id);
          const itemVersion = freshTask.data.repairContext?.itemVersion ?? fieldTaskEtag;
          if (itemVersion) {
            await submitRepairAssessmentReal(
              projectId,
              fieldTask.repairContext.packageId,
              fieldTask.repairContext.itemId,
              task.id,
              {
                originId: stableUuid(`crew:assessment-origin:${task.id}`),
                fieldFirstStartId: fieldTask.firstStartOriginId ?? task.id,
                measurements: [
                  {
                    sampleId: stableUuid(`sample:length:${task.id}`),
                    type: 'DepressionDepth',
                    value: measurement.length_m,
                    state: 'KNOWN',
                    dimension: 'LENGTH',
                    unit: 'm',
                    instrument: 'Thước đo thép',
                    method: 'Thủ công',
                  },
                  {
                    sampleId: stableUuid(`sample:width:${task.id}`),
                    type: 'DepressionDepth',
                    value: measurement.width_m,
                    state: 'KNOWN',
                    dimension: 'LENGTH',
                    unit: 'm',
                    instrument: 'Thước đo thép',
                    method: 'Thủ công',
                  },
                  {
                    sampleId: stableUuid(`sample:depth:${task.id}`),
                    type: 'DepressionDepth',
                    value: measurement.depth_cm,
                    state: 'KNOWN',
                    dimension: 'LENGTH',
                    unit: 'cm',
                    instrument: 'Thước đo thép',
                    method: 'Thủ công',
                  },
                ],
                deviceId: 'mobile-app',
              },
              itemVersion,
              newIdempotencyKey(),
            );
          }
        }
      } catch (error) {
        setAnchorError(
          isRepairVersionConflict(error)
            ? 'Hạng mục sửa chữa vừa thay đổi trên máy chủ. Vui lòng tải lại rồi thử lại.'
            : repairCommandErrorMessage(error),
        );
        return;
      } finally {
        setAnchorLoading(false);
      }
      markAttemptStarted();
      router.push({ pathname: '/(crew)/progress', params: { id: task.id } });
      return;
    }
    markSessionSubmitted();
    router.push({ pathname: '/(crew)/complete', params: { id: task.id } });
  };

  const primaryLabel =
    task.task_mode === 'MEASURE_ONLY'
      ? 'Gửi kết quả đo cho PM'
      : fastTrackEligible
        ? 'Tiến hành sửa nhanh tại chỗ'
        : 'Gửi kết quả đo cho PM';

  const primaryDisabled = !measureReady || !beforeSelected || eligibilityPending;
  const primaryBlockedReason = !measureReady
    ? 'Cần nhập đủ 3 kích thước để tiếp tục'
    : !beforeSelected
      ? 'Chưa có ảnh hiện trạng trước khi sửa.'
      : eligibilityPending
        ? 'Đang đối chiếu điều kiện sửa nhanh với máy chủ...'
        : null;

  return (
    <SafeAreaScreen
      scroll
      header={
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Quay lại"
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
              hitSlop={8}
            >
              <MaterialIcons name="arrow-back" size={20} color={colors.neutral} />
            </Pressable>
            <Text style={[typography.titleMd, styles.topBarTitle]}>Chi tiết lệnh công tác</Text>
          </View>
          <Chip variant={modeChip.variant} label={modeChip.label} uppercase={false} />
        </View>
      }
    >
      {/* CARD 1: Thông tin kỹ thuật (gom 2 nhóm: Vị trí + Thời hạn) */}
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <MaterialIcons name="build" size={16} color={colors.brandGold} />
            <Text style={[typography.titleMd, styles.cardTitleText]}>Thông tin kỹ thuật</Text>
          </View>
          <Text style={[typography.labelSm, styles.taskCode]}>
            Lệnh số {task.wo_code.replace('#HH-WO-', '')}
          </Text>
        </View>

        <Text style={[typography.titleMd, styles.defectTitle]}>
          {defectTypeLabel(task.defect_type_code)} — {task.chainage} Tuyến {task.route_code}
        </Text>

        {/* Nhóm 1: Vị trí hiện trường */}
        <View style={styles.groupSection}>
          <Text style={[typography.labelSm, styles.groupHeaderTitle]}>VỊ TRÍ HIỆN TRƯỜNG</Text>
          <View style={styles.infoList}>
            <View style={styles.infoRow}>
              <MaterialIcons name="alt-route" size={16} color={colors.brandGold} />
              <Text style={[typography.bodyMd, styles.infoText]}>
                Tuyến đường: <Text style={styles.strong}>{task.route_code}</Text> • Phân đoạn{' '}
                <Text style={styles.strong}>{task.section_name}</Text> • Lý trình{' '}
                <Text style={styles.strong}>{task.chainage}</Text>
              </Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons name="location-on" size={16} color={colors.brandGold} />
              <Text style={[typography.bodyMd, styles.infoText]}>
                Vị trí: <Text style={styles.strong}>{task.defect_location}</Text> ({task.locality})
              </Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons name="navigation" size={16} color={colors.brandGold} />
              <View style={styles.coordWrap}>
                <Text style={[typography.bodyMd, styles.infoText]}>Tọa độ WGS84: </Text>
                <Text
                  selectable={true}
                  style={[typography.bodyMd, styles.strong, styles.coordValue]}
                >
                  {task.coordinates.latitude.toFixed(6)}° B, {task.coordinates.longitude.toFixed(6)}° Đ
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Nhóm 2: Thời hạn & Yêu cầu */}
        <View style={styles.groupSection}>
          <Text style={[typography.labelSm, styles.groupHeaderTitle]}>THỜI HẠN & MÔ TẢ</Text>
          <View style={styles.infoList}>
            <View style={styles.infoRow}>
              <MaterialIcons name="info-outline" size={16} color={colors.brandGold} />
              <Text style={[typography.bodyMd, styles.infoText]}>
                Loại lỗi: <Text style={styles.strong}>{defectTypeLabel(task.defect_type_code)}</Text>
              </Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons
                name={task.due_urgency === 'urgent' ? 'alarm' : 'access-time'}
                size={16}
                color={task.due_urgency === 'urgent' ? colors.error : colors.brandGold}
              />
              <Text style={[typography.bodyMd, styles.infoText]}>
                Thời hạn:{' '}
                <Text
                  style={[
                    styles.strong,
                    task.due_urgency === 'urgent' ? styles.dueUrgent : null,
                  ]}
                >
                  {task.due_label}
                </Text>
              </Text>
            </View>
          </View>
          <Text style={[typography.bodyMd, styles.descriptionText]}>{task.description}</Text>
        </View>

        {/* Nút Google Maps secondary */}
        <Button
          variant="secondary"
          title="Dẫn đường Google Maps"
          icon={<MaterialIcons name="directions" size={18} color={colors.neutral} />}
          onPress={openGoogleMaps}
          style={styles.mapsButton}
        />
      </Card>

      {/* CARD 2: Ảnh hiện trạng đối chứng */}
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <MaterialIcons name="photo-camera" size={16} color={colors.brandGold} />
            <Text style={[typography.titleMd, styles.cardTitleText]}>Ảnh hiện trạng</Text>
          </View>
          <Text style={[typography.labelSm, styles.taskCode]}>Đối chứng trước sửa</Text>
        </View>

        {beforeSelected && session?.before_source ? (
          <View style={styles.selectedBefore}>
            <MaterialIcons name="check-circle" size={18} color={colors.success} />
            <Text style={[typography.bodyMd, styles.selectedBeforeText]}>
              Đã chọn: {EVIDENCE_REUSE_SOURCE_TAGS[session.before_source]}
            </Text>
          </View>
        ) : null}

        {candidates.length === 0 ? (
          <View style={styles.noCandidate}>
            <MaterialIcons name="info-outline" size={16} color={colors.secondary} />
            <Text style={[typography.caption, styles.noCandidateText]}>
              Chưa có ảnh nào từ Phản ánh hoặc Drone khớp vị trí này. Hãy chụp ảnh hiện trạng mới tại hiện trường.
            </Text>
          </View>
        ) : (
          candidates.map((candidate) => {
            const isSelected = session?.before_evidence_id === candidate.id;
            return (
              <View key={candidate.id} style={styles.candidateRow}>
                {candidate.local_uri ? (
                  <Image
                    source={{ uri: candidate.local_uri }}
                    style={styles.candidateThumb}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.candidateThumb, styles.candidateThumbEmpty]}>
                    <MaterialIcons name="image" size={28} color={colors.secondary} />
                    <Text style={[typography.caption, styles.candidateEmptyText]}>
                      Chưa có ảnh xem trước
                    </Text>
                  </View>
                )}
                <View style={styles.candidateInfo}>
                  <View style={styles.sourceTagBadge}>
                    <MaterialIcons name="photo-library" size={12} color={colors.brandGold} />
                    <Text
                      style={[typography.labelSm, styles.candidateSourceTag]}
                      numberOfLines={1}
                    >
                      [{EVIDENCE_REUSE_SOURCE_TAGS[candidate.source]}]
                    </Text>
                  </View>

                  <Text style={[typography.bodyMd, styles.candidateLabelText]}>
                    {candidate.source_label}
                  </Text>

                  <View style={styles.candidateMetaRow}>
                    <Text style={[typography.caption, styles.candidateMeta]} numberOfLines={1}>
                      Chụp {formatCapturedAt(candidate.captured_at)}
                    </Text>
                    <Text style={[typography.caption, styles.candidateMeta]} numberOfLines={1}>
                      {candidate.coordinates.latitude.toFixed(5)}° B,{' '}
                      {candidate.coordinates.longitude.toFixed(5)}° Đ
                    </Text>
                  </View>
                </View>
                <Button
                  variant={isSelected ? 'primary' : 'secondary'}
                  title={isSelected ? 'Đang sử dụng' : 'Dùng ảnh này'}
                  onPress={() => handleUseBefore(candidate)}
                />
              </View>
            );
          })
        )}

        <Button
          variant="secondary"
          title="Chụp ảnh hiện trạng mới tại hiện trường"
          icon={<MaterialIcons name="photo-camera" size={18} color={colors.neutral} />}
          onPress={handleCaptureBefore}
          style={styles.captureButton}
        />
        <Text style={[typography.caption, styles.hintText]}>
          Dùng lại ảnh khi hiện trường không thay đổi so với ảnh Phản ánh hoặc Drone; chụp mới khi hiện trường đã thay đổi.
        </Text>
      </Card>

      {/* CARD 3: Kích thước hư hại */}
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <MaterialIcons name="aspect-ratio" size={16} color={colors.brandGold} />
            <Text style={[typography.titleMd, styles.cardTitleText]}>
              Kích thước hư hại
            </Text>
          </View>
          <Text style={[typography.labelSm, styles.taskCode]}>TCVN 10380</Text>
        </View>

        {/* 3 ô nhập dài/rộng/sâu cao tối thiểu 48px dễ bấm */}
        <View style={styles.measureGrid}>
          <View style={styles.measureCol}>
            <InputField
              label="Chiều dài"
              value={lengthText}
              onChangeText={(value) => {
                setLengthText(value);
                handleMeasurement({ length_m: parseDimension(value) });
              }}
              placeholder="0.0"
              keyboardType="decimal-pad"
              unit="m"
              minHeight={48}
            />
          </View>
          <View style={styles.measureCol}>
            <InputField
              label="Chiều rộng"
              value={widthText}
              onChangeText={(value) => {
                setWidthText(value);
                handleMeasurement({ width_m: parseDimension(value) });
              }}
              placeholder="0.0"
              keyboardType="decimal-pad"
              unit="m"
              minHeight={48}
            />
          </View>
          <View style={styles.measureCol}>
            <InputField
              label="Độ sâu"
              value={depthText}
              onChangeText={(value) => {
                setDepthText(value);
                handleMeasurement({ depth_cm: parseDimension(value) });
              }}
              placeholder="0.0"
              keyboardType="decimal-pad"
              unit="cm"
              minHeight={48}
            />
          </View>
        </View>

        {/* Box diện tích L x W */}
        <View style={styles.areaBox}>
          <Text style={[typography.caption, styles.areaLabel]}>Diện tích tự động tính (L × W)</Text>
          <Text style={[typography.titleLg, styles.areaValue]}>
            {area === null ? '—' : `${area.toFixed(2)} m²`}
          </Text>
        </View>

        {/* Ghi chú: ngưỡng nằm trong policy revision trên máy chủ, KHÔNG hardcode ở app */}
        <Text style={[typography.caption, styles.policyText]}>
          Điều kiện sửa nhanh do máy chủ đối chiếu theo policy revision hiện hành.
        </Text>

        {/* Phản hồi trạng thái eligibility (từ máy chủ) */}
        {task.task_mode === 'MEASURE_ONLY' ? (
          <View style={styles.noticeWarn}>
            <MaterialIcons name="lock" size={16} color={colors.warning} />
            <Text style={[typography.caption, styles.noticeWarnText]}>
              {'Nhiệm vụ này chỉ cho phép đo kiểm; không sửa tại chỗ.'}
            </Text>
          </View>
        ) : !hasAllDimensions ? (
          <Text style={[typography.caption, styles.hintText]}>
            Nhập đủ 3 kích thước để hệ thống đối chiếu điều kiện sửa nhanh với máy chủ.
          </Text>
        ) : eligibility.status === 'loading' || eligibility.status === 'idle' ? (
          <View style={styles.noticeInfo}>
            <MaterialIcons name="sync" size={16} color={colors.secondary} />
            <Text style={[typography.caption, styles.noticeInfoText]}>
              Đang đối chiếu điều kiện sửa nhanh với máy chủ...
            </Text>
          </View>
        ) : eligibility.status === 'error' ? (
          <View style={styles.noticeFail}>
            <Chip variant="policy-fail" label="[Vượt Policy - Chuyển PM]" uppercase={false} />
            <View style={styles.policyGuideRow}>
              <MaterialIcons name="info-outline" size={14} color={colors.secondary} />
              <Text style={[typography.caption, styles.policyGuideText]}>
                {eligibility.message ?? ELIGIBILITY_FAIL_CLOSED_MESSAGE}
              </Text>
            </View>
          </View>
        ) : eligibility.eligible ? (
          <View style={styles.noticePass}>
            <Chip variant="policy-pass" label="[Đạt Policy Sửa Nhanh]" uppercase={false} />
          </View>
        ) : (
          <View style={styles.noticeFail}>
            <Chip variant="policy-fail" label="[Vượt Policy - Chuyển PM]" uppercase={false} />
            {eligibility.missingReasons.length > 0 ? (
              <View style={styles.reasonList}>
                {eligibility.missingReasons.map((reason) => (
                  <View key={reason} style={styles.policyGuideRow}>
                    <MaterialIcons name="info-outline" size={14} color={colors.secondary} />
                    <Text style={[typography.caption, styles.policyGuideText]}>
                      {eligibilityReasonLabel(reason)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.policyGuideRow}>
                <MaterialIcons name="info-outline" size={14} color={colors.secondary} />
                <Text style={[typography.caption, styles.policyGuideText]}>
                  Kích thước vượt ngưỡng sửa nhanh; lưu số đo và gửi báo cáo về PM.
                </Text>
              </View>
            )}
          </View>
        )}
      </Card>

      {/* C-04: nhận / từ chối nhiệm vụ do điều phối viên giao (API-081 / API-091) */}
      {fieldTask?.status?.toUpperCase() === 'ASSIGNED' ? (
        <Card style={styles.taskActionCard}>
          <View style={styles.taskActionHeader}>
            <MaterialIcons name="assignment-turned-in" size={20} color={colors.brandGold} />
            <Text style={[typography.titleMd, styles.taskActionTitle]}>Xác nhận nhiệm vụ</Text>
          </View>
          <Text style={[typography.caption, styles.taskActionHint]}>
            Nhận việc để mở khóa đo kiểm hiện trường. Nếu không thể thực hiện, nêu rõ lý do để điều
            phối viên giao lại.
          </Text>

          {rejectOpen ? (
            <View style={styles.taskActionReject}>
              <InputField
                label="Lý do từ chối"
                value={rejectReason}
                onChangeText={setRejectReason}
                placeholder="Ví dụ: sai vị trí, thiếu thiết bị đo..."
                multiline
              />
              <View style={styles.taskActionRow}>
                <View style={styles.taskActionButton}>
                  <Button
                    variant="secondary"
                    title="Huỷ"
                    onPress={() => {
                      setRejectOpen(false);
                      setRejectReason('');
                    }}
                  />
                </View>
                <View style={styles.taskActionButton}>
                  <Button
                    variant="secondary"
                    title="Gửi lý do từ chối"
                    onPress={handleRejectFieldTask}
                    loading={taskAction === 'reject'}
                    disabled={taskAction !== null}
                  />
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.taskActionRow}>
              <View style={styles.taskActionButton}>
                <Button
                  variant="secondary"
                  title="Từ chối nhiệm vụ"
                  onPress={() => setRejectOpen(true)}
                  disabled={taskAction !== null}
                />
              </View>
              <View style={styles.taskActionButton}>
                <Button
                  variant="primary"
                  title="Nhận nhiệm vụ"
                  onPress={handleAcceptFieldTask}
                  loading={taskAction === 'accept'}
                  disabled={taskAction !== null}
                />
              </View>
            </View>
          )}
        </Card>
      ) : fieldTask?.status?.toUpperCase() === 'ACCEPTED' ? (
        <View style={styles.taskStatusBlock}>
          <View style={[styles.taskStatusNote, styles.taskStatusNoteInline]}>
            <MaterialIcons name="check-circle" size={16} color={colors.success} />
            <Text style={[typography.caption, styles.taskStatusNoteText]}>
              Đã nhận nhiệm vụ — sẵn sàng đo kiểm hiện trường.
            </Text>
          </View>
          <Button
            variant="primary"
            title="Bắt đầu thực hiện tại hiện trường"
            onPress={handleStartFieldTask}
            loading={taskAction === 'start'}
            disabled={taskAction !== null}
          />
        </View>
      ) : fieldTask?.status?.toUpperCase() === 'IN_PROGRESS' || fieldTask?.status?.toUpperCase() === 'INPROGRESS' ? (
        <View style={styles.taskStatusNote}>
          <MaterialIcons name="play-circle" size={16} color={colors.primary} />
          <Text style={[typography.caption, styles.taskStatusNoteText]}>
            Đang thực hiện tại hiện trường. Nhập số đo và chọn ảnh để hoàn tất.
          </Text>
        </View>
      ) : fieldTask?.status?.toUpperCase() === 'SUBMITTED' ? (
        <View style={styles.taskStatusBlock}>
          <View style={[styles.taskStatusNote, styles.taskStatusNoteInline]}>
            <MaterialIcons name="hourglass-bottom" size={16} color={colors.warning} />
            <Text style={[typography.caption, styles.taskStatusNoteText]}>
              Đã gửi kết quả hiện trường, đang chờ PM xem xét.
            </Text>
          </View>
          <Button
            variant="secondary"
            title="Xem hồ sơ & gửi bổ sung"
            onPress={() =>
              router.push({ pathname: '/(crew)/field-review', params: { id: task.id } })
            }
          />
        </View>
      ) : fieldTask?.status?.toUpperCase() === 'SUPPLEMENTREQUIRED' ? (
        <View style={styles.taskStatusBlock}>
          <View style={[styles.taskStatusNote, styles.taskStatusNoteInline]}>
            <MaterialIcons name="announcement" size={16} color={colors.error} />
            <Text style={[typography.caption, styles.taskStatusNoteText]}>
              PM yêu cầu bổ sung hồ sơ. Nhấn nút dưới để xem chi tiết và bổ sung.
            </Text>
          </View>
          <Button
            variant="primary"
            title="Xem yêu cầu & gửi bổ sung"
            onPress={() =>
              router.push({ pathname: '/(crew)/field-review', params: { id: task.id } })
            }
          />
        </View>
      ) : fieldTask?.status?.toUpperCase() === 'REJECTED' ? (
        <View style={styles.taskStatusNote}>
          <MaterialIcons name="block" size={16} color={colors.error} />
          <Text style={[typography.caption, styles.taskStatusNoteText]}>
            Bạn đã từ chối nhiệm vụ này. Điều phối viên sẽ giao lại cho người khác.
          </Text>
        </View>
      ) : null}

      {/* CTA cuối: Chỉ đường (flex 1) + Tiến hành sửa nhanh (flex 2) + lý do disable */}
      <View style={styles.ctaContainer}>
        <View style={styles.ctaRow}>
          <View style={styles.ctaSecondary}>
            <Button
              variant="secondary"
              title="Chỉ đường"
              onPress={() => router.push({ pathname: '/(crew)/navigation', params: { id: task.id } })}
            />
          </View>
          <View style={styles.ctaPrimary}>
            <Button
              variant="primary"
              title={primaryLabel}
              onPress={handlePrimaryAction}
              disabled={primaryDisabled}
              loading={anchorLoading}
            />
          </View>
        </View>

        {/* C-08: đính chính một lượt sửa đã gửi (chỉ nhiệm vụ đo-kiểm-và-sửa). */}
        {task.task_mode === 'INSPECT_AND_REPAIR' ? (
          <Button
            variant="text"
            title="Đính chính lượt sửa đã gửi"
            onPress={() =>
              router.push({ pathname: CREW_REPAIR_CORRECTION, params: { id: task.id } })
            }
            style={styles.correctionButton}
          />
        ) : null}

        {primaryDisabled ? (
          <View style={styles.disabledReasonBox}>
            <MaterialIcons name="info-outline" size={14} color={colors.error} />
            <Text style={[typography.caption, styles.disabledReasonText]}>
              {primaryBlockedReason}
            </Text>
          </View>
        ) : null}
      </View>

      {anchorError ? <Toast type="error" message={anchorError} /> : null}
      {taskNotice ? (
        <Toast key={taskNotice.message} type={taskNotice.type} message={taskNotice.message} />
      ) : null}
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    backgroundColor: colors.surfaceAlt,
  },
  topBarTitle: {
    color: colors.neutral,
  },
  card: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.cardPadding,
    ...Platform.select({
      ios: {
        shadowColor: '#1A1D20',
        shadowOpacity: 0.08,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
    minWidth: 0,
  },
  cardTitleText: {
    color: colors.neutral,
    flexShrink: 1,
  },
  taskCode: {
    color: colors.secondary,
    flexShrink: 0,
  },
  defectTitle: {
    color: colors.neutral,
    marginTop: spacing.sm,
  },
  groupSection: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  groupHeaderTitle: {
    color: colors.secondary,
    marginBottom: spacing.xs,
  },
  infoList: {
    gap: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  infoText: {
    flex: 1,
    color: colors.neutral,
  },
  coordWrap: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  coordValue: {
    color: colors.neutral,
  },
  strong: {
    fontFamily: 'Roboto-Medium',
  },
  dueUrgent: {
    color: colors.error,
  },
  descriptionText: {
    color: colors.secondary,
    marginTop: spacing.xs,
  },
  mapsButton: {
    marginTop: spacing.md,
  },
  selectedBefore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: '#E9F7EC',
  },
  selectedBeforeText: {
    flex: 1,
    color: colors.success,
  },
  candidateRow: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    gap: spacing.sm,
  },
  candidateThumb: {
    width: '100%',
    height: 150,
    borderRadius: radius.md,
    backgroundColor: colors.border,
  },
  candidateThumbEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    gap: 6,
  },
  candidateEmptyText: {
    color: colors.secondary,
  },
  candidateInfo: {
    gap: spacing.xs,
  },
  sourceTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    maxWidth: '100%',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    backgroundColor: '#FEF9E7',
  },
  candidateSourceTag: {
    flexShrink: 1,
    color: colors.brandGold,
  },
  candidateLabelText: {
    color: colors.neutral,
    flexShrink: 1,
  },
  candidateMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  candidateMeta: {
    color: colors.secondary,
    flexShrink: 1,
  },
  noCandidate: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  noCandidateText: {
    flex: 1,
    color: colors.secondary,
  },
  captureButton: {
    marginTop: spacing.md,
  },
  hintText: {
    color: colors.secondary,
    marginTop: spacing.xs,
  },
  measureGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  measureCol: {
    flex: 1,
    minWidth: 0,
  },
  noticeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  noticeInfoText: {
    flex: 1,
    color: colors.secondary,
  },
  reasonList: {
    gap: spacing.xs,
  },
  areaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs,
  },
  areaLabel: {
    color: colors.secondary,
  },
  areaValue: {
    color: colors.neutral,
  },
  policyText: {
    color: colors.secondary,
    marginTop: spacing.sm,
  },
  noticePass: {
    marginTop: spacing.md,
    alignItems: 'flex-start',
  },
  noticeFail: {
    marginTop: spacing.md,
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  policyGuideRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  policyGuideText: {
    flex: 1,
    color: colors.secondary,
  },
  noticeWarn: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.warning,
    backgroundColor: 'rgba(245,158,11,0.1)',
  },
  noticeWarnText: {
    flex: 1,
    color: colors.brandGold,
  },
  /* C-04: thẻ nhận / từ chối nhiệm vụ FIELD */
  taskActionCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.cardPadding,
  },
  taskActionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  taskActionTitle: {
    color: colors.neutral,
  },
  taskActionHint: {
    color: colors.secondary,
    marginTop: spacing.xs,
  },
  taskActionReject: {
    marginTop: spacing.sm,
  },
  taskActionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  taskActionButton: {
    flex: 1,
  },
  taskStatusNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  taskStatusBlock: {
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  taskStatusNoteInline: {
    marginBottom: 0,
  },
  taskStatusNoteText: {
    flex: 1,
    color: colors.secondary,
  },
  /* paddingBottom 48: nhô CTA + dòng lý do disable khỏi gesture bar Android & BottomNav */
  ctaContainer: {
    paddingTop: spacing.xs,
    paddingBottom: 48,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  ctaSecondary: {
    flex: 1,
  },
  correctionButton: {
    marginTop: spacing.xs,
  },
  ctaPrimary: {
    flex: 2,
  },
  disabledReasonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  disabledReasonText: {
    color: colors.error,
    textAlign: 'center',
  },
});

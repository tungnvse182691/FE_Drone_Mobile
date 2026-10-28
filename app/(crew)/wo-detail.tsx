import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { InputField } from '../../src/components/InputField';
import { useRepairBootstrap } from '../../src/hooks/useRepairBootstrap';
import { CrewTaskBoundary, useCrewIdentity } from './tasks';
import { useAuthStore } from '../../src/store/auth';
import { passwordSessionIdentity } from '../../src/api/authApi';
import { randomUUID } from 'expo-crypto';
import { openDatabase, initDatabase, saveDraft } from '../../src/offline/database';
import { createFieldCommand, executeFieldCommand, fieldCommandBlock, fieldCapabilityBlock, getFieldTaskStartOriginReal,
  validateCrewTaskDetail, crewTaskActionBlock, normalRepairBlock, getFieldInspectionTaskDetailReal,
  isConcurrencyConflict, isPreconditionRequired, newIdempotencyKey,
  type FieldCommandRecord, type FieldCommandAction, type CrewTask } from '../../src/api/crewApi';
import { currentRepairIdentity, sameRepairIdentity, type RepairJournalRecord } from '../../src/api/crewRepairDraft';
import { prepareRepairAssessment, prepareRepairStart, prepareRepairFinish, prepareRepairAttempt, dispatchRepair, readRepairFieldDraft, readRepairHistory, repairErrorMessage } from '../../src/api/crewRepairWorkflow';
import { prepareFieldRepairClaim, type FieldDraft } from '../../src/api/crewFieldDraft';
import { spacing, typography } from '../../src/design-tokens';

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
        <RepairContractStatus task={fresh} />
        {fresh.detail?.mode === 'NORMAL' ? <NormalRepairBootstrap task={fresh} /> : null}
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

/** Read-only D/E capability status. Never derive repair admission from task state. */
export function RepairContractStatus({ task }: { task: CrewTask }) {
  return <View>
    {task.detail?.mode === 'CONDITIONAL_FT' ? <>
      <Text style={typography.titleMd}>FastTrack chưa thể khởi tạo</Text>
      <Text>Máy chủ chưa cung cấp nguồn bootstrap Crew cho FastTrack: package/item, binding và itemVersion hiện tại. Không dùng ngữ cảnh NORMAL thay thế.</Text>
      <Text>ETag eligibility không phải phiên bản hạng mục. Chưa thể đọc eligibility nếu chưa xác nhận được định danh hạng mục từ nguồn Crew hợp lệ.</Text>
      <Text>Thi công đang khóa; cần policy, authorization, coverage, first-start, thời hạn và stop conditions được máy chủ xác nhận. eligible=true riêng lẻ không mở quyền thi công.</Text>
      <Button variant="secondary" title="Thi công FastTrack" disabled onPress={() => {}} />
    </> : null}
    <Text>Bổ sung sửa chữa cần quyết định PM và current intake thực. Trạng thái nhiệm vụ không thay thế yêu cầu PM.</Text>
    <Button variant="secondary" title="Kiểm tra yêu cầu bổ sung sửa chữa" onPress={() => router.push({
      pathname: '/(crew)/repair-correction', params: { id: task.id, projectId: task.projectId },
    })} />
  </View>;
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
  const finished=history.find(c=>c.operation==='finish'&&c.phase==='CONFIRMED');
  const intake=history.find(c=>c.operation==='attempt'&&c.phase==='CONFIRMED');
  const rejected=history.some(c=>c.phase==='REJECTED');
  const ready=assessment?.receipt?.data.readiness==='READY';
  const sourceReady=!!draft?.measurements.length&&!!draft.captures.some(c=>c.purpose!=='AFTER'&&c.verified&&c.upload?.fileId);
  const run=async(action:'assessment'|'start'|'finish'|'claim'|'attempt'|'replay')=>{
    if(lock.current)return;const i=currentRepairIdentity(task.projectId,task.id);if(!i)return;
    lock.current=true;setBusy(true);setNotice('');
    try {
      if(action==='claim') {
        const field=await prepareFieldRepairClaim(i);
        if(active.current&&sameRepairIdentity(i,currentRepairIdentity(task.projectId,task.id))){setDraft(field);router.push({pathname:'/(crew)/viewfinder',params:{id:task.id,projectId:task.projectId,mode:'AFTER'}});}
        return;
      }
      const command=action==='replay'?pending:action==='start'?await prepareRepairStart(i):action==='finish'?await prepareRepairFinish(i):action==='attempt'?await prepareRepairAttempt(i):await prepareRepairAssessment(i,await readRepairFieldDraft(i));
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
      <Text>{{assessment:'Đánh giá',start:'Bắt đầu',finish:'Kết thúc thi công',attempt:'Nộp hồ sơ',supplement:'Bổ sung'}[c.operation]}: {c.phase}</Text>
      {c.receipt?<><Text selectable>Receipt máy chủ: {String(c.receipt.data.id??c.receipt.data.attemptId)}</Text><Text>{String(c.receipt.data.readiness??c.receipt.data.intakeReadiness??'Biên nhận thi công')}</Text>
        {Array.isArray(c.receipt.data.missingReasons)?c.receipt.data.missingReasons.map(r=><Text key={String(r)}>{String(r)}</Text>):null}</>:null}
      {c.phase==='REJECTED'?<Text>Máy chủ đã từ chối lệnh HTTP {c.rejection?.status}. Giữ lịch sử để đối soát, không tạo key thay thế.</Text>:null}
    </View>)}
    {assessment&&!ready?<Text>Assessment còn INCOMPLETE. Sửa nháp FIELD theo missingReasons rồi chủ động gửi assessment mới; lịch sử cũ được giữ nguyên.</Text>:null}
    <Button variant="secondary" title="Bắt đầu thi công" disabled={busy||!loaded||!ready||!!pending||!!started||history.some(c=>c.operation==='start')||result.status!=='ready'} onPress={()=>void run('start')}/>
    {pending?<><Text>Chưa xác nhận được kết quả. Chỉ đối soát/gửi lại đúng lệnh đã lưu.</Text><Button variant="secondary" title="Đối soát / replay lệnh đã lưu" disabled={busy||!loaded} onPress={()=>void run('replay')}/></>:null}
    {started&&!finished?<Text>Đã bắt đầu thi công. Chỉ bấm kết thúc sau khi hoàn tất thi công thực tế.</Text>:null}
    <Button variant="secondary" title="Kết thúc thi công" disabled={busy||!loaded||!started||!!finished||!!pending||rejected||history.some(c=>c.operation==='finish')||result.status!=='ready'||result.repairContext?.status!=='InProgress'} onPress={()=>void run('finish')}/>
    {finished?<Text>Đã thi công xong theo biên nhận máy chủ. Hồ sơ chưa được PM xác nhận.</Text>:null}
    <Button variant="secondary" title="Chụp AFTER / lập hồ sơ sửa chữa" disabled={busy||!loaded||!finished||!!pending||rejected||!!intake||!!draft?.command} onPress={()=>void run('claim')}/>
    {draft?.repairClaim?<Button variant="secondary" title="Xem hồ sơ sửa chữa đã lưu" disabled={busy} onPress={()=>router.push({pathname:'/(crew)/field-review',params:{id:task.id,projectId:task.projectId}})}/>:null}
    <Button variant="secondary" title="Nộp hồ sơ chờ PM đánh giá" disabled={busy||!loaded||!finished||!!pending||rejected||!!intake||draft?.command?.phase!=='confirmed'||!draft?.repairClaim} onPress={()=>void run('attempt')}/>
    {intake?<Text>Đã gửi hồ sơ vào tiếp nhận. Đang chờ PM đánh giá; chưa được PM xác nhận.</Text>:null}
    <Text>FastTrack và màn thi công legacy vẫn khóa. Gửi hồ sơ không đồng nghĩa được nghiệm thu.</Text>
    {notice?<Text accessibilityLiveRegion="polite">{notice}</Text>:null}
    <Button variant="secondary" title="Tải lại ngữ cảnh sửa chữa" disabled={busy} loading={result.status === 'loading'} onPress={() => {void result.reload();void load();}} />
  </View>;
}
const styles = StyleSheet.create({
  topBar: { padding: spacing.md },
  card: { marginBottom: spacing.md },
  taskActionCard: { marginBottom: spacing.md, gap: spacing.sm },
});

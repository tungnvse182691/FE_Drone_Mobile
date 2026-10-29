import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { MaterialIcons } from '@expo/vector-icons';
import { Chip } from '../../src/components/Chip';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { InputField } from '../../src/components/InputField';
import { useRepairBootstrap } from '../../src/hooks/useRepairBootstrap';
import { CrewTaskBoundary, useCrewIdentity, crewStatusLabel, crewModeLabel } from './tasks';
import { useAuthStore } from '../../src/store/auth';
import { passwordSessionIdentity } from '../../src/api/authApi';
import { randomUUID } from 'expo-crypto';
import { openDatabase, initDatabase, saveDraft } from '../../src/offline/database';
import { createFieldCommand, executeFieldCommand, fieldCommandBlock, fieldCapabilityBlock, getFieldTaskStartOriginReal,
  validateCrewTaskDetail, normalRepairBlock, getFieldInspectionTaskDetailReal,
  isConcurrencyConflict, isPreconditionRequired, newIdempotencyKey,
  type FieldCommandRecord, type FieldCommandAction, type CrewTask } from '../../src/api/crewApi';
import { currentRepairIdentity, sameRepairIdentity, type RepairJournalRecord } from '../../src/api/crewRepairDraft';
import { prepareRepairAssessment, prepareRepairStart, prepareRepairFinish, prepareRepairAttempt, dispatchRepair, readRepairFieldDraft, readRepairHistory, repairErrorMessage } from '../../src/api/crewRepairWorkflow';
import { prepareFieldRepairClaim, type FieldDraft } from '../../src/api/crewFieldDraft';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { CrewTaskFacts } from '../../src/components/crew/CrewTaskFacts';

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
  const [showTechnical, setShowTechnical] = useState(false);
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
  const actionReason = (action: FieldCommandAction) => {
    if (!ready) return 'Đang kiểm tra nhật ký thao tác. Chọn tải lại nếu chưa hoàn tất.';
    if (busy) return 'Đang xử lý thao tác. Vui lòng chờ kết quả.';
    if (pending) return 'Cần đối soát lệnh đã lưu trước khi thực hiện thao tác mới.';
    if (!fresh.detail) return 'Chưa tải đủ thông tin nhiệm vụ.';
    const block = fieldCommandBlock(fresh.detail, fresh.etag ?? '', actor, action);
    if (block) return block;
    if (action === 'reject' && (!reason.trim() || reason.trim().length > 2000)) return 'Nhập lý do từ chối từ 1 đến 2000 ký tự.';
    return action === 'accept' ? 'Có thể nhận nhiệm vụ.' : action === 'reject' ? 'Có thể từ chối nhiệm vụ với lý do đã nhập.' : 'Có thể bắt đầu nhiệm vụ.';
  };
  return (
    <SafeAreaScreen scroll header={<AppHeader subtitle="Chi tiết nhiệm vụ" />}>
      <Button variant="text" title="Quay lại danh sách" icon={<MaterialIcons name="arrow-back" size={18} color={colors.secondary} />} onPress={() => router.replace('/(crew)/tasks')} />
      <Card style={[styles.card, styles.hero]}>
        <View style={styles.sectionHeading}><View style={styles.iconBox}><MaterialIcons name="assignment" size={26} color={colors.brandGold} /></View>
          <View style={styles.flex}><Text style={styles.eyebrow}>CÔNG VIỆC ĐƯỢC GIAO</Text><Text style={typography.titleLg}>{fresh.title || 'Nhiệm vụ hiện trường'}</Text></View></View>
        <View style={styles.chips}><Chip variant={fresh.status.toUpperCase() === 'COMPLETED' ? 'approved' : 'status-pending'} label={crewStatusLabel(fresh.status)} uppercase={false} /></View>
        <Text style={styles.body}>{crewModeLabel(fresh.rawMode)}</Text>
        {fresh.status.toUpperCase() === 'SUBMITTED' ? <Text style={styles.hint}>Kết quả đã được gửi. Theo dõi phản hồi và yêu cầu bổ sung của nhiệm vụ.</Text> : null}
      </Card>
      <Card style={styles.card}>
        <View style={styles.sectionHeading}><MaterialIcons name="description" size={22} color={colors.brandGold} /><Text style={typography.titleMd}>Thông tin nhiệm vụ</Text></View>
        <Text style={styles.body}>{fresh.detail?.instructions || fresh.description || 'Chưa có hướng dẫn bổ sung cho nhiệm vụ này.'}</Text>
        <View style={styles.factRow}><MaterialIcons name="event" size={20} color={colors.secondary} /><View style={styles.flex}><Text style={styles.hint}>Thời hạn hoàn thành</Text><Text style={styles.body}>{fresh.due_label || 'Chưa có thời hạn'}</Text></View></View>
        {fresh.wo_code ? <Text style={styles.body}>Lệnh công tác: {fresh.wo_code}</Text> : null}
        <View style={styles.factRow}><MaterialIcons name="place" size={20} color={colors.secondary} /><View style={styles.flex}><Text style={styles.hint}>Vị trí hiện trường</Text><Text style={styles.body}>{[fresh.route_code, fresh.section_name, fresh.chainage].filter(Boolean).join(' • ') || 'Chưa có thông tin tuyến đường'}</Text>
          <Text style={styles.hint}>{fresh.coordinates ? `${fresh.coordinates.latitude}, ${fresh.coordinates.longitude}` : 'Chưa có tọa độ để dẫn đường. Bạn vẫn có thể xem nhiệm vụ.'}</Text></View></View>
      </Card>
      <CrewTaskFacts key={JSON.stringify([scope,task.projectId,task.id])} projectId={task.projectId} taskId={task.id} />
      <Card style={styles.taskActionCard}>
        <View style={styles.sectionHeading}><MaterialIcons name="assignment-turned-in" size={22} color={colors.brandGold} /><Text style={typography.titleMd}>Thao tác nhiệm vụ</Text></View>
        <Text style={styles.hint}>Các nút chỉ khả dụng khi nhiệm vụ và quyền được giao đáp ứng điều kiện.</Text>
        {!ready ? <Text style={styles.hint}>Đang kiểm tra nhật ký thao tác. Nếu chưa tải được, chọn tải lại / đối soát bên dưới.</Text> : null}
        {pending ? <Text style={styles.hint}>Còn thao tác chưa đối soát xong. Giữ nguyên lệnh và kiểm tra kết quả trước khi thao tác tiếp.</Text> : null}
        <Text style={styles.hint}>Nhận nhiệm vụ: {actionReason('accept')}</Text>
        <Text style={styles.hint}>Từ chối nhiệm vụ: {actionReason('reject')}</Text>
        {!blocked('reject') && <InputField label="Lý do từ chối (1–2000 ký tự)" value={reason} onChangeText={setReason} multiline />}
        <Button variant="secondary" title="Nhận nhiệm vụ" disabled={blocked('accept')} loading={busy} onPress={() => void run('accept')} />
        <Button variant="secondary" title="Từ chối nhiệm vụ" disabled={blocked('reject') || !reason.trim() || reason.trim().length > 2000} onPress={() => void run('reject')} />
        <Text style={styles.hint}>Bắt đầu nhiệm vụ: {actionReason('start')}</Text>
        <Button variant="secondary" title="Bắt đầu nhiệm vụ" disabled={blocked('start')} onPress={() => void run('start')} />
        {notice ? <Text accessibilityLiveRegion="polite">{notice}</Text> : null}

        <Button variant="secondary" title="Tải lại / đối soát" disabled={busy} onPress={() => void run()} />
        {record?.phase === 'pending' ? <Button variant="secondary" title="Gửi lại đúng lệnh cũ" disabled={busy || record.scope !== scope} onPress={() => void run(undefined, true)} /> : null}
      </Card>
      <Card style={styles.taskActionCard}>
      <View style={styles.sectionHeading}><MaterialIcons name="explore" size={22} color={colors.brandGold} /><Text style={typography.titleMd}>Tại hiện trường</Text></View>
      {!fresh.coordinates ? <Text style={styles.hint}>Dẫn đường chưa khả dụng vì chưa có tọa độ nhiệm vụ.</Text> : null}
      <Button variant="secondary" title="Dẫn đường" disabled={!fresh.coordinates} onPress={() => {
        if (fresh.coordinates) router.push({ pathname: '/(crew)/navigation', params: { id: fresh.id, projectId: fresh.projectId } });
      }} />
      {fieldBlock ? <Text>{fieldBlock}</Text> : null}
      <Button variant="primary" title="Tác nghiệp hiện trường" disabled={!ready||busy||pending||!!fieldBlock} onPress={() => void openField()} />
      </Card>
      <Card style={styles.taskActionCard}>
        <RepairContractStatus task={fresh} />
        {fresh.detail?.mode === 'NORMAL' ? <NormalRepairBootstrap task={fresh} /> : null}
      </Card>
      <Card style={styles.taskActionCard}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: showTechnical }} onPress={() => setShowTechnical(v => !v)} style={styles.sectionHeading}>
          <MaterialIcons name="info-outline" size={20} color={colors.secondary} /><Text style={[typography.labelLg, styles.flex]}>Chi tiết kỹ thuật</Text><MaterialIcons name={showTechnical ? 'expand-less' : 'expand-more'} size={22} color={colors.secondary} />
        </Pressable>
        {showTechnical ? <View style={{ gap: spacing.sm }}><Text selectable style={styles.hint}>Mã nhiệm vụ: {fresh.id}</Text><Text selectable style={styles.hint}>Dự án: {fresh.projectId}</Text><Text selectable style={styles.hint}>Phiên bản: {fresh.version}</Text><Text style={styles.hint}>Trạng thái nguồn: {fresh.status} · {fresh.rawMode}</Text>{record?.origin ? <Text selectable style={styles.hint}>Mã bắt đầu: {record.origin.id}</Text> : null}</View> : null}
      </Card>
      <Button variant="secondary" title="Danh sách nhiệm vụ" onPress={() => router.replace('/(crew)/tasks')} />
    </SafeAreaScreen>
  );
}

/** Read-only D/E capability status. Never derive repair admission from task state. */
export function RepairContractStatus({ task }: { task: CrewTask }) {
  return <View style={{ gap: spacing.sm }}>
    {task.detail?.mode === 'CONDITIONAL_FT' ? <>
      <Text style={typography.titleMd}>Sửa nhanh chưa sẵn sàng</Text>
      <Text>Chưa có đủ thông tin phân công hạng mục để kiểm tra điều kiện sửa nhanh.</Text>
      <Text>Chỉ có thể thi công khi hệ thống xác nhận đủ điều kiện và quyền xử lý.</Text>
      <Text>Bạn vẫn có thể xem thông tin nhiệm vụ. Chức năng sửa nhanh tiếp tục được khóa.</Text>
      <Button variant="secondary" title="Thi công FastTrack" disabled onPress={() => {}} />
    </> : null}
    <Text>Hồ sơ sửa chữa chỉ được bổ sung khi có yêu cầu phù hợp từ người quản lý.</Text>
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
  const [storedHistory,setHistory]=useState<RepairJournalRecord[]>([]),[storedDraft,setDraft]=useState<FieldDraft|null>(null);
  const [notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false);
  const [showRepairTechnical,setShowRepairTechnical]=useState(false);
  const [historyIdentity,setHistoryIdentity]=useState<ReturnType<typeof currentRepairIdentity>>(null);
  const [confirmation,setConfirmation]=useState<{identity:NonNullable<ReturnType<typeof currentRepairIdentity>>;key:string}|null>(null);
  const live=currentRepairIdentity(task.projectId,task.id);
  const history=sameRepairIdentity(historyIdentity??{actor:'',scope:'',environment:'',projectId:'',taskId:''},live)?storedHistory:[];
  const draft=sameRepairIdentity(historyIdentity??{actor:'',scope:'',environment:'',projectId:'',taskId:''},live)?storedDraft:null;
  const active=useRef(false),lock=useRef(false);
  const load=useCallback(async()=>{
    const i=currentRepairIdentity(task.projectId,task.id);if(!i)return;
    setLoaded(false);setBusy(false);setHistory([]);setHistoryIdentity(null);setConfirmation(null);setDraft(null);setNotice('');
    try {
      const rows=await readRepairHistory(i);
      if(!active.current||!sameRepairIdentity(i,currentRepairIdentity(task.projectId,task.id)))return;
      setHistoryIdentity(i);setHistory(rows);setLoaded(true);
      try {
        const field=await readRepairFieldDraft(i);
        if(active.current&&sameRepairIdentity(i,currentRepairIdentity(task.projectId,task.id)))setDraft(field);
      }catch{
        if(active.current&&sameRepairIdentity(i,currentRepairIdentity(task.projectId,task.id)))setNotice('Nháp FIELD cũ được giữ riêng để đối soát. Lịch sử repair không bị xóa; không tự nhận nháp phiên cũ.');
      }
    }catch(e){if(active.current&&sameRepairIdentity(i,currentRepairIdentity(task.projectId,task.id)))setNotice(repairErrorMessage(e));}
  },[task.id,task.projectId,identity.scope,identity.user?.id,live?.environment]);
  useFocusEffect(useCallback(()=>{active.current=true;void load();return()=>{active.current=false;};},[load]));
  const pending=history.find(c=>!['CONFIRMED','REJECTED'].includes(c.phase));
  const assessment=history.filter(c=>c.operation==='assessment'&&c.phase==='CONFIRMED').at(-1);
  const started=history.find(c=>c.operation==='start'&&c.phase==='CONFIRMED');
  const finished=history.find(c=>c.operation==='finish'&&c.phase==='CONFIRMED');
  const intake=history.find(c=>c.operation==='attempt'&&c.phase==='CONFIRMED');
  const rejected=history.some(c=>c.phase==='REJECTED');
  const ready=assessment?.receipt?.data.readiness==='READY';
  const sourceReady=!!historyIdentity&&sameRepairIdentity(historyIdentity,live)&&!!draft?.measurements.length&&!!draft.captures.some(c=>c.purpose!=='AFTER'&&c.verified&&c.upload?.fileId);
  const run=async(action:'assessment'|'start'|'finish'|'claim'|'attempt'|'replay')=>{
    if(lock.current)return;const i=currentRepairIdentity(task.projectId,task.id);if(!i)return;
    if(action==='replay'&&(!confirmation||confirmation.key!==pending?.key||!sameRepairIdentity(confirmation.identity,i)))return;
    setConfirmation(null);
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
        try{const rows=await readRepairHistory(i);if(active.current&&sameRepairIdentity(i,currentRepairIdentity(task.projectId,task.id)))setHistory(rows);}catch{/* Keep the error and disable new commands on failed reload. */if(active.current&&sameRepairIdentity(i,currentRepairIdentity(task.projectId,task.id))){setLoaded(false);setHistory([]);}}
        if(active.current&&sameRepairIdentity(i,currentRepairIdentity(task.projectId,task.id)))void result.reload();
      }
    }
  };
  return <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
    <Text style={typography.titleMd}>Sửa chữa theo kế hoạch</Text>
    {result.status === 'loading' ? <Text>Đang đọc ngữ cảnh từ máy chủ…</Text> : null}
    {result.status === 'error' ? <Text>Không xác nhận được ngữ cảnh sửa chữa. Vui lòng tải lại.</Text> : null}
    {result.status === 'ready' && !result.repairContext ? <Text>Chưa có hạng mục sửa chữa được liên kết hợp lệ với nhiệm vụ này. Các thao tác sửa chữa chưa khả dụng.</Text> : null}
    {result.repairContext ? <>
      <Text style={styles.body}>Phương án: {result.repairContext.repairPlan || 'Chưa có hướng dẫn'}</Text>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: showRepairTechnical }} style={styles.sectionHeading} onPress={()=>setShowRepairTechnical(v=>!v)}><Text style={[styles.hint,styles.flex]}>Chi tiết kỹ thuật sửa chữa</Text><MaterialIcons name={showRepairTechnical?'expand-less':'expand-more'} size={20} color={colors.secondary}/></Pressable>
      {showRepairTechnical ? <View style={{gap:spacing.xs}}>
        <Text selectable style={styles.hint}>Hạng mục: {result.repairContext.itemId}</Text>
        <Text selectable style={styles.hint}>Liên kết phân công: {result.repairContext.bindingId}</Text>
        <Text selectable style={styles.hint}>Phiên bản hạng mục: {result.itemVersion}</Text>
        <Text style={styles.hint}>Trạng thái nguồn: {result.repairContext.status} · Checklist: {result.repairContext.checklistVersion}</Text>
      </View> : null}
    </> : null}

    <Text>Số đo đã lưu: {draft?.measurements.length??0}. Ảnh trước sửa/đo VERIFIED: {draft?.captures.filter(c=>c.purpose!=='AFTER'&&c.verified).length??0}.</Text>
    {!sourceReady?<Text>Cần lưu số đo thực và upload ảnh BEFORE/MEASUREMENT đến VERIFIED trong hồ sơ FIELD. Ảnh AFTER không được đưa vào đánh giá trước sửa.</Text>:null}
    <Button variant="secondary" title="Số đo / ảnh FIELD" disabled={busy||!task.detail?.firstStartOriginId} onPress={()=>router.push({pathname:'/(crew)/field-review',params:{id:task.id,projectId:task.projectId}})}/>
    {assessmentBlock&&!started?<Text>{assessmentBlock}</Text>:null}
    <Button variant="secondary" title="Gửi đánh giá trước sửa" disabled={busy||!loaded||!sourceReady||!!assessmentBlock||!!pending||(!!history.length&&assessment?.receipt?.data.readiness!=='INCOMPLETE')||result.status!=='ready'||result.repairContext?.status!=='Assigned'} onPress={()=>void run('assessment')}/>
    {history.map(c=><View key={c.key}>
      <Text style={styles.body}>{{assessment:'Đánh giá',start:'Bắt đầu',finish:'Kết thúc thi công',attempt:'Nộp hồ sơ',supplement:'Bổ sung'}[c.operation]}: {{PREPARED:'Đã lưu lệnh',PENDING:'Đang chờ xác nhận',IN_FLIGHT:'Đang gửi',UNKNOWN_OUTCOME:'Chưa rõ kết quả',ACKNOWLEDGED:'Đã ghi nhận',CONFIRMED:'Đã đối soát',REJECTED:'Bị từ chối'}[c.phase] ?? 'Cần đối soát'}</Text>
      {c.receipt?<><Text style={styles.hint}>Biên nhận máy chủ đã lưu.</Text>{showRepairTechnical ? <Text selectable style={styles.hint}>Mã biên nhận: {String(c.receipt.data.id??c.receipt.data.attemptId)}</Text> : null}<Text>{String(c.receipt.data.readiness??c.receipt.data.intakeReadiness??'Biên nhận thi công')}</Text>
        {Array.isArray(c.receipt.data.missingReasons)?c.receipt.data.missingReasons.map(r=><Text key={String(r)}>{String(r)}</Text>):null}</>:null}
      {c.phase==='REJECTED'?<Text>Máy chủ đã từ chối lệnh HTTP {c.rejection?.status}. Giữ lịch sử để đối soát, không tạo key thay thế.</Text>:null}
    </View>)}
    {assessment&&!ready?<Text>Assessment còn INCOMPLETE. Sửa nháp FIELD theo missingReasons rồi chủ động gửi assessment mới; lịch sử cũ được giữ nguyên.</Text>:null}
    <Button variant="secondary" title="Bắt đầu thi công" disabled={busy||!loaded||!ready||!!pending||!!started||history.some(c=>c.operation==='start')||result.status!=='ready'} onPress={()=>void run('start')}/>
    {pending?<><Text>Chưa xác nhận được kết quả. Chỉ đối soát/gửi lại đúng lệnh đã lưu.</Text><Button variant="secondary" title="Đối soát / replay lệnh đã lưu" disabled={busy||!loaded} onPress={()=>{const i=currentRepairIdentity(task.projectId,task.id);if(i&&pending)setConfirmation({identity:i,key:pending.key});}}/></>:null}
    {confirmation&&sameRepairIdentity(confirmation.identity,live)?<View>
      <Text accessibilityRole="alert">Đối soát có thể POST lại đúng lệnh đã lưu. Nếu máy chủ chưa ghi lệnh, thao tác này có thể thực thi lần đầu. Payload, key và phiên bản gốc được giữ nguyên.</Text>
      <Button variant="secondary" title="Xác nhận đối soát lệnh gốc" disabled={busy||!loaded} onPress={()=>void run('replay')}/>
      <Button variant="secondary" title="Hủy đối soát" disabled={busy} onPress={()=>setConfirmation(null)}/>
    </View>:null}
    {started&&!finished?<Text>Đã bắt đầu thi công. Chỉ bấm kết thúc sau khi hoàn tất thi công thực tế.</Text>:null}
    <Button variant="secondary" title="Kết thúc thi công" disabled={busy||!loaded||!started||!!finished||!!pending||rejected||history.some(c=>c.operation==='finish')||result.status!=='ready'||result.repairContext?.status!=='InProgress'} onPress={()=>void run('finish')}/>
    {finished?<Text>Đã thi công xong theo biên nhận máy chủ. Hồ sơ chưa được PM xác nhận.</Text>:null}
    <Button variant="secondary" title="Chụp AFTER / lập hồ sơ sửa chữa" disabled={busy||!loaded||!finished||!!pending||rejected||!!intake||!!draft?.command} onPress={()=>void run('claim')}/>
    {draft?.repairClaim?<Button variant="secondary" title="Xem hồ sơ sửa chữa đã lưu" disabled={busy} onPress={()=>router.push({pathname:'/(crew)/field-review',params:{id:task.id,projectId:task.projectId}})}/>:null}
    <Button variant="secondary" title="Nộp hồ sơ chờ PM đánh giá" disabled={busy||!loaded||!finished||!!pending||rejected||!!intake||draft?.command?.phase!=='confirmed'||!draft?.repairClaim} onPress={()=>void run('attempt')}/>
    {intake?<Text>Đã gửi hồ sơ vào tiếp nhận. Đang chờ PM đánh giá; chưa được PM xác nhận.</Text>:null}
    <Text>Gửi hồ sơ không đồng nghĩa đã được nghiệm thu. Theo dõi kết quả đánh giá của người quản lý.</Text>
    {notice?<Text accessibilityLiveRegion="polite">{notice}</Text>:null}
    <Button variant="secondary" title="Tải lại ngữ cảnh sửa chữa" disabled={busy} loading={result.status === 'loading'} onPress={() => {void result.reload();void load();}} />
  </View>;
}
const styles = StyleSheet.create({
  topBar: { padding: spacing.md },
  card: { marginBottom: spacing.md, gap: spacing.md, borderWidth: 1, borderColor: colors.border },
  hero: { borderLeftWidth: 4, borderLeftColor: colors.primary },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBox: { padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  flex: { flex: 1 },
  eyebrow: { ...typography.labelSm, color: colors.secondary, marginBottom: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  body: { ...typography.bodyMd, color: colors.neutral },
  hint: { ...typography.caption, color: colors.secondary },
  factRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  taskActionCard: { marginBottom: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: colors.border },
});

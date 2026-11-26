import { fastTrackReason } from '../../src/api/crewFastTrackFeedback';
import { useRepairBootstrap } from '../../src/hooks/useRepairBootstrap';
import { CrewRepairFacts } from '../../src/components/crew/CrewRepairFacts';
import { currentRepairIdentity, sameRepairIdentity, repairAssessmentMatchesDraft, type RepairJournalRecord } from '../../src/api/crewRepairDraft';
import { prepareRepairAssessment, prepareRepairStart, prepareRepairFinish, prepareRepairAttempt, dispatchRepair, resolveRepairRejection, readRepairFieldDraft, readRepairHistory, repairErrorMessage } from '../../src/api/crewRepairWorkflow';
import { prepareFieldRepairClaim, type FieldDraft } from '../../src/api/crewFieldDraft';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { MaterialIcons } from '@expo/vector-icons';
import { Chip } from '../../src/components/Chip';
import { CrewTaskStatus } from '../../src/components/CrewTaskStatus';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { InputField } from '../../src/components/InputField';
import { CrewTaskBoundary, useCrewIdentity, crewStatusLabel, crewModeLabel, crewDateTime } from './tasks';
import { useAuthStore } from '../../src/store/auth';
import { passwordSessionIdentity } from '../../src/api/authApi';
import { randomUUID } from 'expo-crypto';
import { openDatabase, initDatabase } from '../../src/offline/database';
import { repairSupplementBlock, createFieldCommand, executeFieldCommand, fieldCommandBlock, fieldCapabilityBlock, getFieldTaskStartOriginReal,
  validateCrewTaskDetail, repairExecutionBlock, getFieldInspectionTaskDetailReal,
  fastTrackRepairBlock, isRepairItemVersion,
  isConcurrencyConflict, isPreconditionRequired, newIdempotencyKey,
  type FieldCommandRecord, type FieldCommandAction, type CrewTask } from '../../src/api/crewApi';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { CrewTaskFacts } from '../../src/components/crew/CrewTaskFacts';
import { CrewOfflinePreparation } from '../../src/components/crew/CrewOfflinePreparation';
import { CrewOfflineFieldTask } from '../../src/components/crew/CrewOfflineFieldTask';
import { currentQueueIdentity } from '../../src/offline/upload-queue';
import { openOfflineJournal, writeOnlineFieldJournal } from '../../src/api/crewOfflineJournal';
import { CrewFastTrackEligibility } from '../../src/components/crew/CrewFastTrackEligibility';
import { CrewContentTransition, CrewPressable } from '../../src/components/crew/CrewMotion';

/** Câu tiếng Việt cho lỗi API-081/091/093 — không lộ mã kỹ thuật lên màn hình. */
function fieldTaskActionMessage(error: unknown, phase: 'journal' | 'read' | 'reconcile' | 'send' | 'replay' = 'send'): string {
  const errorResponse = (
    error as { response?: { status?: number; data?: { code?: string } } } | undefined
  )?.response;
  const code = errorResponse?.data?.code;
  const context = phase === 'journal' ? 'Không đọc được nhật ký lệnh.' : phase === 'read' ? 'Không đọc được dữ liệu nhiệm vụ.' :
    phase === 'reconcile' ? 'Không đối soát được lệnh đã lưu.' : 'Không gửi/xác nhận được thao tác.';
  if (code === 'idempotency_key_reused') {
    return context + ' Khóa lệnh đã được sử dụng. Giữ nguyên lệnh cũ để đối soát.';
  }
  if (
    code === 'concurrency_conflict' ||
    code === 'precondition_required' ||
    errorResponse?.status === 409 ||
    errorResponse?.status === 412 ||
    isConcurrencyConflict(error) ||
    isPreconditionRequired(error)
  ) {
    return context + ' Nhiệm vụ hoặc điều kiện phiên bản đã thay đổi. Vui lòng tải lại để kiểm tra.';
  }
  if (errorResponse?.status === 401) return context + ' Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.';
  if (errorResponse?.status === 403) {
    return context + ' Bạn không có quyền hoặc không còn được giao xử lý nhiệm vụ này.';
  }
  if (errorResponse?.status === 404) {
    return context + ' Nhiệm vụ không còn tồn tại hoặc đã được điều phối lại.';
  }
  return context + ' Dữ liệu đã lưu được giữ nguyên. Vui lòng kiểm tra lại trước khi tiếp tục.';
}

/** Localize this known sandbox fixture only; preserve authored repair instructions. */
export function crewRepairPlanLabel(value?: string | null): string {
  if (value === 'QA concrete surface repair with safety boundary' || value === 'QA concrete surface repair and temporary safety boundary')
    return 'Phương án thử nghiệm: sửa chữa bề mặt bê tông, có khoanh vùng an toàn.';
  return value || 'Chưa có hướng dẫn';
}

export default function CrewWoDetailScreen() {
  const params=useLocalSearchParams<{offline?:string;id?:string;projectId?:string}>();
  if(params.offline==='1')return <CrewOfflineFieldTask key={JSON.stringify([params.projectId,params.id])} projectId={typeof params.projectId==='string'?params.projectId:''} taskId={typeof params.id==='string'?params.id:''}/>;
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
    write: async (record: FieldCommandRecord) => writeOnlineFieldJournal(db,record),
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

/** Presentation only: existing command/capability guards remain the authority. */
export function crewDetailPresentation(status: string | null | undefined, commandBlock: (action: FieldCommandAction) => string | null, reviewBlock: string | null) {
  const states: Record<string, { summary: string; commands: FieldCommandAction[]; fieldLabel?: string }> = {
    NewAssigned: { summary: 'Nhiệm vụ mới được giao. Kiểm tra hướng dẫn trước khi nhận hoặc từ chối.', commands: ['accept', 'reject'] },
    Accepted: { summary: 'Bạn đã nhận nhiệm vụ. Bắt đầu khi sẵn sàng đo kiểm tại hiện trường.', commands: ['start'] },
    InProgress: { summary: 'Đang đo kiểm. Tiếp tục ghi nhận số đo và bằng chứng hiện trường.', commands: [], fieldLabel: 'Tác nghiệp hiện trường' },
    Submitted: { summary: 'Đã gửi hồ sơ đo kiểm, chưa phải xác nhận hoàn tất sửa chữa. Xem hồ sơ và theo dõi phản hồi.', commands: [], fieldLabel: 'Xem hồ sơ đã gửi' },
    SupplementRequired: { summary: 'Nhiệm vụ cần bổ sung hồ sơ. Xem yêu cầu và kiểm tra điều kiện trước khi bổ sung.', commands: [], fieldLabel: 'Xem hồ sơ cần bổ sung' },
    Completed: { summary: 'Nhiệm vụ đã hoàn thành. Xem hồ sơ và kết quả xử lý bên dưới.', commands: [], fieldLabel: 'Xem hồ sơ kết quả' },
    Rejected: { summary: 'Nhiệm vụ đã bị từ chối. Xem thông tin và lịch sử xử lý.', commands: [] },
    Cancelled: { summary: 'Nhiệm vụ đã hủy. Thông tin và lịch sử được giữ để tra cứu.', commands: [] },
  };
  const state = states[status ?? ''];
  return { summary: state?.summary ?? 'Chưa xác nhận được trạng thái nhiệm vụ. Tải lại để kiểm tra; chưa thể thao tác.',
    commands: (state?.commands ?? []).filter(action => !commandBlock(action)),
    fieldLabel: state?.fieldLabel && !reviewBlock ? state.fieldLabel : null };
}

function CrewFieldActions({ task }: { task: CrewTask }) {
  const router = useRouter();
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
    setNotice(result.phase === 'rejected' ? 'Máy chủ từ chối lệnh. Tải lại dữ liệu trước khi thử một lệnh mới.' :
      result.phase === 'confirmed' && result.readbackStatus === 200 ? '' :
      result.phase === 'acknowledged' ? 'Máy chủ đã ghi nhận lệnh; chưa đối chiếu được dữ liệu đọc lại. Giữ biên nhận để đối soát.' :
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
    let phase: 'journal' | 'read' | 'reconcile' | 'send' | 'replay' = 'journal';
    try {
      const journal = await fieldJournal(actor, task.projectId, task.id);
      if (currentCrewScope() !== scope) return;
      const saved = await journal.read();
      if (currentCrewScope() !== scope) return;
      const unresolved = saved && !['confirmed','rejected'].includes(saved.phase);
      if (action && unresolved) throw new Error('field_command_pending');
      if(action){
        const owner=currentQueueIdentity();if(!owner)throw Error('crew_session_changed');
        const offline=await (await openOfflineJournal(owner)).list();
        if(offline.some(r=>r.projectId===task.projectId&&r.proof.fieldStartTaskId===task.id&&r.phase!=='RECONCILED'))throw Error('field_command_pending');
        if(currentCrewScope()!==scope)return;
      }
      const command = action ? createFieldCommand({ task: fresh.detail!, etag: fresh.etag ?? '', actorId: actor, scope, action,
        reason: action === 'accept' ? 'Nhận nhiệm vụ hiện trường' : reason, key: newIdempotencyKey(),
        originId: action === 'start' ? randomUUID() : undefined, claimedAt: new Date().toISOString() }) : saved;
      if (!command) {
        phase = 'read';
        const response = await getFieldInspectionTaskDetailReal(task.projectId, task.id);
        if (currentCrewScope() !== scope) return;
        validateCrewTaskDetail(response.data, response.etag, task.projectId, task.id, actor);
        setFresh(previous => ({ ...previous, detail: response.data, status: response.data.status ?? '', version: response.data.version!, etag: response.etag }));
        setNotice('');
        setReady(true);
        return;
      }
      phase = action ? 'send' : replay ? 'replay' : 'reconcile';
      const result = await executeFieldCommand(command, { ...journal, currentScope: currentCrewScope, currentActor: currentCrewActor }, !!action || replay);
      apply(result);
      if (currentCrewScope() === scope) setReady(true);
    } catch (error) {
      if (currentCrewScope() === scope) {
        // Reload the persisted immutable intent even when POST has an unknown outcome.
        try { const saved = await (await fieldJournal(actor, task.projectId, task.id)).read(); if (currentCrewScope() === scope) setRecord(saved); } catch { setReady(false); }
        setNotice(fieldTaskActionMessage(error, phase) + ' Không tạo lệnh mới khi kết quả cũ chưa rõ; dùng đối soát hoặc gửi lại đúng lệnh cũ.');
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
      if(origin.id!==response.data.firstStartOriginId||origin.taskId!==task.id)throw new Error('Mốc bắt đầu đầu tiên không khớp nhiệm vụ.');
      router.push({pathname:'/(crew)/field-review',params:{id:task.id,projectId:task.projectId}});
    }catch(error){if(currentCrewScope()===scope)setNotice(fieldTaskActionMessage(error, 'read'));}
    finally{if(currentCrewScope()===scope)setBusy(false);}
  };
  const fieldBlock = !fresh.detail ? 'Chưa tải dữ liệu nhiệm vụ.' : fieldCapabilityBlock(fresh.detail,fresh.etag??'',actor,'review');
  const blocked = (action: FieldCommandAction) => !ready || busy || pending || !fresh.detail || !!fieldCommandBlock(fresh.detail, fresh.etag ?? '', actor, action);
  const presentation = crewDetailPresentation(fresh.status, action => !fresh.detail ? 'Chưa có dữ liệu' : fieldCommandBlock(fresh.detail, fresh.etag ?? '', actor, action), fieldBlock);
  return (
    <SafeAreaScreen scroll header={<AppHeader subtitle="Chi tiết nhiệm vụ" />}>
      <CrewContentTransition ready={ready}>
      <CrewPressable accessibilityRole="button" accessibilityLabel="Quay lại danh sách" testID="crew-detail-back" style={styles.backRow} onPress={() => router.replace('/(crew)/tasks')}>
        <MaterialIcons name="arrow-back" size={20} color={colors.secondary} /><Text style={[typography.labelLg, { color: colors.secondary }]}>Quay lại danh sách</Text>
      </CrewPressable>
      <Card style={[styles.card, styles.detailCard, styles.detailHero]}>
        <Text selectable style={styles.detailId}>{fresh.wo_code || `ID nhiệm vụ: ${fresh.id.slice(0,8)}`}</Text>
        <Text style={styles.detailTitle}>{fresh.title || 'Nhiệm vụ hiện trường'}</Text>
        <View style={styles.chips}>
          <CrewTaskStatus status={fresh.status} label={crewStatusLabel(fresh.status)} />
          <Chip variant="measure-only" label={crewModeLabel(fresh.rawMode)} uppercase={false} />
        </View>
      </Card>
      <Card style={[styles.card, styles.detailCard, styles.detailState]}>
        <View style={styles.sectionHeading}>
          <Text style={[styles.detailTasteHeading,styles.detailStateHeading,styles.flex]}>Tình trạng hiện tại</Text>
          <CrewPressable accessibilityRole="button" accessibilityLabel="Tải lại / đối soát" accessibilityState={{disabled:busy,busy}} testID="crew-detail-refresh" disabled={busy} style={[styles.refreshButton,styles.detailRefresh]} onPress={()=>void run()}>
            {busy?<ActivityIndicator size="small" color="#E8CA69"/>:<MaterialIcons name="refresh" size={24} color="#E8CA69"/>}
          </CrewPressable>
        </View>
        <Text style={styles.detailStateBody}>{presentation.summary}</Text>
        {!ready ? <Text style={styles.detailStateHint}>Đang kiểm tra nhật ký thao tác. Nếu chưa hoàn tất, chọn tải lại / đối soát.</Text> : null}
        {pending ? <Text accessibilityRole="alert" style={styles.detailStateBody}>Còn thao tác chưa đối soát xong. Giữ nguyên lệnh và kiểm tra kết quả trước khi thao tác tiếp.</Text> : null}
        {presentation.commands.includes('accept') ? <Button variant="secondary" style={styles.detailPrimary} disabledStyle={styles.detailPrimaryDisabled} disabledTextStyle={styles.detailPrimaryDisabledText} title="Nhận nhiệm vụ" disabled={blocked('accept')} loading={busy} onPress={() => void run('accept')} /> : null}
        {presentation.commands.includes('reject') ? <>
          {!blocked('reject') && <View style={styles.detailSecondarySurface}><InputField label="Lý do từ chối (1–2000 ký tự)" value={reason} onChangeText={setReason} multiline /></View>}
          <Button variant="secondary" style={styles.detailSecondary} title="Từ chối nhiệm vụ" disabled={blocked('reject') || !reason.trim() || reason.trim().length > 2000} onPress={() => void run('reject')} />
        </> : null}
        {presentation.commands.includes('start') ? <Button variant="secondary" style={styles.detailPrimary} disabledStyle={styles.detailPrimaryDisabled} disabledTextStyle={styles.detailPrimaryDisabledText} title="Bắt đầu nhiệm vụ" disabled={blocked('start')} onPress={() => void run('start')} /> : null}
        {presentation.fieldLabel ? <Button variant="secondary" style={styles.detailPrimary} disabledStyle={styles.detailPrimaryDisabled} disabledTextStyle={styles.detailPrimaryDisabledText} title={presentation.fieldLabel} disabled={!ready||busy||pending||!!fieldBlock} onPress={() => void openField()} /> : null}
        {!presentation.commands.length && !presentation.fieldLabel && fieldBlock ? <Text style={styles.detailStateHint}>Thao tác hiện trường chưa khả dụng với trạng thái hoặc điều kiện hiện tại.</Text> : null}
        {notice ? <Text accessibilityLiveRegion="polite" style={styles.detailStateBody}>{notice}</Text> : null}
        {record?.phase === 'pending' ? <Button variant="secondary" style={styles.detailSecondary} title="Gửi lại đúng lệnh cũ" disabled={busy || record.scope !== scope} onPress={() => void run(undefined, true)} /> : null}
      </Card>
      <Card style={[styles.card, styles.detailCard]}>
        <View style={styles.detailSectionTitle}><View style={styles.detailAccent}/><Text style={[styles.detailTasteHeading,styles.flex]}>Thông tin nhiệm vụ</Text></View>
        <View style={styles.factRow}><View style={styles.flex}><Text style={styles.hint}>Hướng dẫn</Text><Text style={styles.body}>{fresh.detail?.instructions || fresh.description || 'Chưa có hướng dẫn bổ sung cho nhiệm vụ này.'}</Text></View></View>
        <View style={styles.detailDeadline}><Text style={styles.hint}>Thời hạn hoàn thành (giờ Việt Nam)</Text><Text style={styles.detailDeadlineValue}>{fresh.due_label ? crewDateTime(fresh.due_label) : 'Chưa có thời hạn'}</Text></View>
        {fresh.wo_code ? <Text style={styles.body}>Lệnh công tác: {fresh.wo_code}</Text> : null}
        <View style={styles.factRow}><View style={styles.flex}><Text style={styles.hint}>Vị trí hiện trường</Text><Text style={styles.body}>{[fresh.route_code, fresh.section_name, fresh.chainage].filter(Boolean).join(' • ') || 'Chưa có thông tin tuyến đường'}</Text>
          <Text style={styles.hint}>{fresh.coordinates ? `${fresh.coordinates.latitude}, ${fresh.coordinates.longitude}` : 'Chưa có tọa độ dẫn đường'}</Text></View></View>
        {fresh.coordinates ? <Button variant="secondary" title="Dẫn đường" onPress={() => router.push({ pathname: '/(crew)/navigation', params: { id: fresh.id, projectId: fresh.projectId } })} /> : null}
      </Card>
      <CrewTaskFacts key={JSON.stringify([scope,task.projectId,task.id])} projectId={task.projectId} taskId={task.id} />
      <CrewOfflinePreparation key={JSON.stringify([scope,task.projectId,task.id])} projectId={task.projectId} taskId={task.id} serverVersion={fresh.detail?.version ?? undefined}/>
      {fresh.detail?.repairContext?<CrewRepairFacts key={JSON.stringify([scope,task.projectId,task.id,fresh.detail.repairContext.bindingId])} projectId={task.projectId} taskId={task.id}/>:null}
      <Card style={[styles.taskActionCard, styles.detailCard]}>
        <Text style={styles.detailTasteHeading}>Hồ sơ liên quan</Text>
        <CrewPressable accessibilityRole="button" accessibilityLabel="Khuyết tật thuộc nhiệm vụ" style={({pressed})=>[styles.linkRow,styles.detailLink,pressed&&styles.detailLinkPressed]} onPress={()=>router.push({pathname:'/(crew)/report-defect',params:{id:task.id,projectId:task.projectId}})}>
          <Text style={[styles.body,styles.flex]}>Khuyết tật thuộc nhiệm vụ</Text><MaterialIcons name="chevron-right" size={22} color={colors.secondary}/>
        </CrewPressable>
      </Card>
      {fresh.detail?.mode === 'NORMAL' ? <Card style={[styles.taskActionCard,styles.detailCard]}><NormalRepairBootstrap task={fresh} stage="overview" /></Card> : null}
      {fresh.detail?.mode === 'CONDITIONAL_FT' ? <Card style={[styles.taskActionCard,styles.detailCard]}><FastTrackRepairSummary task={fresh} /></Card> : null}
      <Card style={[styles.taskActionCard,styles.detailCard]}>
        <CrewPressable accessibilityRole="button" accessibilityState={{ expanded: showTechnical }} onPress={() => setShowTechnical(v => !v)} style={styles.sectionHeading}>
          <Text style={[typography.labelLg, styles.flex]}>Chi tiết kỹ thuật</Text><MaterialIcons name={showTechnical ? 'expand-less' : 'expand-more'} size={22} color={colors.secondary} />
        </CrewPressable>
        {showTechnical ? <View style={styles.technicalPanel}><Text style={styles.hint}>Mã nhiệm vụ</Text><Text selectable style={styles.body}>{fresh.id}</Text><Text style={styles.hint}>Dự án</Text><Text selectable style={styles.body}>{fresh.projectId}</Text><Text style={styles.hint}>Phiên bản</Text><Text selectable style={styles.body}>{fresh.version}</Text><Text style={styles.hint}>Trạng thái nguồn</Text><Text style={styles.body}>{fresh.status} · {fresh.rawMode}</Text>{record?.rejectionStatus ? <Text style={styles.hint}>Mã phản hồi máy chủ: {record.rejectionStatus}</Text> : null}{record?.origin ? <Text selectable style={styles.hint}>Mã bắt đầu: {record.origin.id}</Text> : null}</View> : null}
      </Card>
      </CrewContentTransition>
    </SafeAreaScreen>
  );
}

/** Read-only D/E capability status. Never derive repair admission from task state. */
export function RepairContractStatus({ task }: { task: CrewTask }) {
  const router = useRouter();
  return <View style={{ gap: spacing.sm }}>
    {task.detail?.mode === 'CONDITIONAL_FT' ? FastTrackRepairSummary({ task }) : null}
    <Text>Hồ sơ sửa chữa chỉ được bổ sung khi có yêu cầu phù hợp từ người quản lý.</Text>
    <Button variant="secondary" title="Kiểm tra yêu cầu bổ sung sửa chữa" onPress={() => router.push({
      pathname: '/(crew)/repair-correction', params: { id: task.id, projectId: task.projectId },
    })} />
  </View>;
}

/** Validate the supplied FastTrack context before mounting the explicit repair workflow. */
export function FastTrackRepairSummary({ task }: { task: CrewTask }) {
  const detail = task.detail;
  if (detail?.mode !== 'CONDITIONAL_FT') return null;
  const ctx = detail.repairContext;
  const valid = !!ctx && ctx.mode === 'FAST_TRACK' && [ctx.packageId, ctx.itemId, ctx.bindingId].every(v =>
    typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) &&
    isRepairItemVersion(ctx.itemVersion) && !!ctx.repairPlan?.trim() && !!ctx.checklistVersion?.trim();
  if (!ctx) return <>
    <Text style={typography.titleMd}>Sửa nhanh chưa sẵn sàng</Text>
    <Text>Chưa có ngữ cảnh sửa chữa nhanh hiện hành được máy chủ cung cấp cho nhiệm vụ này.</Text>
    <Text>Chưa có đủ thông tin phân công hạng mục để kiểm tra điều kiện sửa nhanh.</Text>
    <Text>Chỉ có thể thi công khi hệ thống xác nhận đủ điều kiện và quyền xử lý.</Text>
    <Button variant="secondary" title="Thi công sửa chữa nhanh" disabled onPress={() => {}} />
  </>;
  if (!valid) return <>
    <Text style={typography.titleMd}>Sửa nhanh chưa sẵn sàng</Text>
    <Text>Ngữ cảnh sửa chữa nhanh từ máy chủ không hợp lệ; chưa thể hiển thị như nguồn tác nghiệp.</Text>
    <Text>Chưa có đủ thông tin phân công hạng mục để kiểm tra điều kiện sửa nhanh.</Text>
    <Text>Chỉ có thể thi công khi hệ thống xác nhận đủ điều kiện và quyền xử lý.</Text>
    <Button variant="secondary" title="Thi công sửa chữa nhanh" disabled onPress={() => {}} />
  </>;
  return <>
    <Text style={typography.titleMd}>Sửa chữa nhanh, có điều kiện</Text>
    <Text style={styles.hint}>Kiểm tra điều kiện trước sửa, ghi nhận thi công và gửi hồ sơ để quản lý đánh giá.</Text>
    <NormalRepairBootstrap task={task} stage="overview" />
  </>;
}

// PRE_EXECUTION uses FieldInspectionWorkflowRepository.ReadinessAsync on BE.
// These labels explain the receipt; they never grant execution authority.
function repairAssessmentReasonLabel(reason: string): string {
  return fastTrackReason(reason).message;
}

/** Explicit online repair commands. Legacy repair content remains unmounted. */
export function NormalRepairBootstrap({ task, stage='all' }: { task: CrewTask; stage?:'all'|'progress'|'closeout'|'overview' }) {
  const router = useRouter();
  const result = useRepairBootstrap(task.id, { projectId: task.projectId });
  const identity=useCrewIdentity();
  const assessmentBlock=task.detail&&identity.user&&identity.scope?repairExecutionBlock(task.detail,task.etag??'',identity.user.id,'assessment'):'Phiên đội sửa chữa hoặc ngữ cảnh nhiệm vụ chưa hợp lệ.';
  const fastTrack=task.detail?.mode==='CONDITIONAL_FT';
  const supplementAllowed=task.detail?.repairContext?.attempt?.review?.decision==='SUPPLEMENT'&&!!identity.user&&!!identity.scope&&!repairSupplementBlock(task.detail,task.etag??'',identity.user.id);
  const [storedHistory,setHistory]=useState<RepairJournalRecord[]>([]),[storedDraft,setDraft]=useState<FieldDraft|null>(null);
  const [notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false);
  const [showRepairTechnical,setShowRepairTechnical]=useState(false);
  const [historyIdentity,setHistoryIdentity]=useState<ReturnType<typeof currentRepairIdentity>>(null);
  const [confirmation,setConfirmation]=useState<{identity:NonNullable<ReturnType<typeof currentRepairIdentity>>;key:string;kind?:'resolve'}|null>(null);
  const [showRepairSteps,setShowRepairSteps]=useState(false);
  const [showCloseoutEvidence,setShowCloseoutEvidence]=useState(false);
  const [showBeforeEvidence,setShowBeforeEvidence]=useState(false);
  const live=currentRepairIdentity(task.projectId,task.id);
  const history=sameRepairIdentity(historyIdentity??{actor:'',scope:'',environment:'',projectId:'',taskId:''},live)?storedHistory:[];
  const draft=sameRepairIdentity(historyIdentity??{actor:'',scope:'',environment:'',projectId:'',taskId:''},live)?storedDraft:null;
  const active=useRef(false),lock=useRef(false);
  const load=useCallback(async()=>{
    const i=currentRepairIdentity(task.projectId,task.id);if(!i)return;
    setLoaded(false);setBusy(false);setHistory([]);setHistoryIdentity(null);setConfirmation(null);setDraft(null);setNotice('');
    try {
      const rows=await readRepairHistory(i,undefined,true);
      if(!active.current||!sameRepairIdentity(i,currentRepairIdentity(task.projectId,task.id)))return;
      setHistoryIdentity(i);setHistory(rows);setLoaded(true);
      try {
        const field=await readRepairFieldDraft(i);
        if(active.current&&sameRepairIdentity(i,currentRepairIdentity(task.projectId,task.id)))setDraft(field);
      }catch{
        if(active.current&&sameRepairIdentity(i,currentRepairIdentity(task.projectId,task.id)))setNotice('Nháp đo kiểm cũ được giữ riêng để đối soát. Lịch sử sửa chữa không bị xóa; không tự nhận nháp phiên cũ.');
      }
    }catch(e){if(active.current&&sameRepairIdentity(i,currentRepairIdentity(task.projectId,task.id)))setNotice(repairErrorMessage(e));}
  },[task.id,task.projectId,identity.scope,identity.user?.id,live?.environment]);
  useFocusEffect(useCallback(()=>{active.current=true;void load();return()=>{active.current=false;};},[load]));
  const pending=history.find(c=>!['CONFIRMED','REJECTED'].includes(c.phase));
  const assessment=history.filter(c=>c.operation==='assessment'&&c.phase==='CONFIRMED').at(-1);
  const started=history.find(c=>c.operation==='start'&&c.phase==='CONFIRMED');
  const finished=history.find(c=>c.operation==='finish'&&c.phase==='CONFIRMED');
  const intake=history.find(c=>c.operation==='attempt'&&c.phase==='CONFIRMED');
  // Current API-080 decision takes precedence over historical intake readiness.
  const currentContext=result.status==='ready'?result.repairContext:null;
  // Server readback is available across devices; it does not grant mutation authority.
  const serverSubmitted=!!currentContext?.attempt?.attemptId&&!!currentContext.attempt.effectiveSubmissionId;
  const finalConfirmed=currentContext?.status==='Confirmed'&&currentContext.finalDecision?.result==='CONFIRMED';
  const pmAccepted=currentContext?.attempt?.review?.decision==='ACCEPT';
  const closeoutMessage=finalConfirmed?'Đã nghiệm thu. Hạng mục đã có xác nhận cuối từ người có thẩm quyền.':
    pmAccepted?'PM đã chấp nhận hồ sơ. Đang chờ xác nhận nghiệm thu cuối.':
    currentContext?.attempt?.review?.decision==='SUPPLEMENT'?'Quản lý yêu cầu bổ sung hồ sơ. Mở yêu cầu bổ sung để xem nội dung.':
    !currentContext?'Tải lại để xem kết quả đánh giá mới nhất.':
    serverSubmitted||intake?'Đã tiếp nhận hồ sơ. Đang chờ quản lý đánh giá.':
    finished?'Đã kết thúc thi công. Cần gửi hồ sơ để quản lý đánh giá.':'Chưa kết thúc thi công.';
  const activeHistory=history.filter(c=>!c.rejectionResolved);
  const rejectedCommand=activeHistory.find(c=>c.phase==='REJECTED');
  const rejected=!!rejectedCommand;
  const ready=assessment?.receipt?.data.readiness==='READY';
  const assessmentChanged=!!assessment&&!!draft&&!repairAssessmentMatchesDraft(assessment.payload,draft);
  const incomplete=assessment?.receipt?.data.readiness==='INCOMPLETE';
  const assessmentReasons=Array.isArray(assessment?.receipt?.data.missingReasons)
    ? [...new Set(assessment.receipt.data.missingReasons.filter((r):r is string=>typeof r==='string').map(repairAssessmentReasonLabel))] : [];
  const beforeCaptures=draft?.captures.filter(c=>c.purpose!=='AFTER')??[];
  const sourceReady=!!historyIdentity&&sameRepairIdentity(historyIdentity,live)&&!!draft?.measurements.length&&beforeCaptures.length>0&&beforeCaptures.every(c=>c.verified&&c.upload?.fileId);
  const run=async(action:'assessment'|'start'|'finish'|'claim'|'attempt'|'replay'|'resolve')=>{
    if(lock.current)return;const i=currentRepairIdentity(task.projectId,task.id);if(!i)return;
    if(action==='replay'&&(!confirmation||confirmation.key!==pending?.key||!sameRepairIdentity(confirmation.identity,i)))return;
    if(action==='resolve'&&(!confirmation||confirmation.kind!=='resolve'||confirmation.key!==rejectedCommand?.key||!sameRepairIdentity(confirmation.identity,i)))return;
    setConfirmation(null);
    lock.current=true;setBusy(true);setNotice('');
    try {
      if(action==='resolve'){await resolveRepairRejection(i,rejectedCommand!.key);if(active.current&&sameRepairIdentity(i,currentRepairIdentity(task.projectId,task.id)))setNotice('Đã đối chiếu điều kiện và ghi nhận xác nhận của bạn. Có thể chuẩn bị lại thao tác phù hợp; lệnh cũ được giữ nguyên.');return;}
      if(action==='claim') {
        const field=await prepareFieldRepairClaim(i);
        if(active.current&&sameRepairIdentity(i,currentRepairIdentity(task.projectId,task.id))){setDraft(field);router.push({pathname:'/(crew)/viewfinder',params:{id:task.id,projectId:task.projectId,mode:'AFTER'}});}
        return;
      }
      const command=action==='replay'?pending:action==='start'?await prepareRepairStart(i):action==='finish'?await prepareRepairFinish(i):action==='attempt'?await prepareRepairAttempt(i):await prepareRepairAssessment(i,await readRepairFieldDraft(i));
      if(!command)throw Error('repair_command_missing');
      const receipt=await dispatchRepair(i,command.key);
      if(active.current&&sameRepairIdentity(i,currentRepairIdentity(task.projectId,task.id))&&receipt.phase==='CONFIRMED'&&action==='start'){
        setShowRepairSteps(false);setShowBeforeEvidence(false);
      }
      if(active.current&&sameRepairIdentity(i,currentRepairIdentity(task.projectId,task.id)))setNotice(receipt.phase==='CONFIRMED'?'Đã lưu biên nhận máy chủ và đối chiếu hạng mục.':'Lệnh chưa được xác nhận; giữ nguyên để đối soát.');
    }catch(e){if(active.current&&sameRepairIdentity(i,currentRepairIdentity(task.projectId,task.id)))setNotice(repairErrorMessage(e));}
    finally{
      lock.current=false;
      if(active.current&&sameRepairIdentity(i,currentRepairIdentity(task.projectId,task.id))){
        setBusy(false);
        try{
          const rows=await readRepairHistory(i,undefined,true);
          const field=await readRepairFieldDraft(i);
          if(active.current&&sameRepairIdentity(i,currentRepairIdentity(task.projectId,task.id))){setHistory(rows);setDraft(field);}
        }catch{/* Keep the error and disable new commands on failed reload. */if(active.current&&sameRepairIdentity(i,currentRepairIdentity(task.projectId,task.id))){setLoaded(false);}}
        if(active.current&&sameRepairIdentity(i,currentRepairIdentity(task.projectId,task.id)))void result.reload();
      }
    }
  };
  const renderHistory=(rows:RepairJournalRecord[],detailed:boolean)=>rows.map(c=><Card key={c.key} style={styles.card}>
      <Text style={styles.body}>{{assessment:'Đánh giá',start:'Bắt đầu',finish:'Kết thúc thi công',attempt:'Nộp hồ sơ',supplement:'Bổ sung'}[c.operation]}: {{PREPARED:'Đã lưu lệnh',PENDING:'Đang chờ xác nhận',IN_FLIGHT:'Đang gửi',UNKNOWN_OUTCOME:'Chưa rõ kết quả',ACKNOWLEDGED:'Đã ghi nhận',CONFIRMED:'Đã đối soát',REJECTED:'Bị từ chối'}[c.phase] ?? 'Cần đối soát'}</Text>
      {c.receipt?<><Text style={styles.hint}>Biên nhận máy chủ đã lưu.</Text>{detailed ? <Text selectable style={styles.hint}>Mã biên nhận: {String(c.receipt.data.id??c.receipt.data.attemptId)}</Text> : null}<Text>{(c.receipt.data.readiness??c.receipt.data.intakeReadiness)==='READY'?'Đủ thông tin theo máy chủ':(c.receipt.data.readiness??c.receipt.data.intakeReadiness)==='INCOMPLETE'?'Còn thiếu thông tin':'Đã ghi nhận mốc thi công'}</Text>
        {detailed&&Array.isArray(c.receipt.data.missingReasons)?c.receipt.data.missingReasons.map(r=><Text key={String(r)}>{String(r)}</Text>):null}</>:null}
      {c.phase==='REJECTED'&&c.rejectionResolved?<Text>Đã giải quyết bằng chứng từ chối; lệnh gốc được giữ trong lịch sử.</Text>:null}
      {c.phase==='REJECTED'&&!c.rejectionResolved?<Text>Máy chủ đã từ chối thao tác. Lịch sử được giữ nguyên; cần kiểm tra quyền và điều kiện trước khi tiếp tục.</Text>:null}
    </Card>);
  return <View style={{ gap: spacing.sm }}>
    <View style={styles.sectionHeading}><Text style={[styles.detailHeading,styles.flex]}>{stage==='closeout'?'Hồ sơ sau thi công':stage==='progress'?'Các mốc thi công':fastTrack?'Sửa chữa nhanh':'Sửa chữa theo kế hoạch'}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Tải lại ngữ cảnh sửa chữa" accessibilityState={{disabled:busy||result.status==='loading',busy:busy||result.status==='loading'}} disabled={busy||result.status==='loading'} style={styles.refreshButton} onPress={()=>{void result.reload();void load();}}>
        {busy||result.status==='loading'?<ActivityIndicator size="small" color={colors.brandGold}/>:<MaterialIcons name="refresh" size={24} color={colors.brandGold}/>}</Pressable>
    </View>
    {supplementAllowed?<Button variant="primary" title="Xem yêu cầu bổ sung" onPress={()=>router.push({pathname:'/(crew)/repair-correction',params:{id:task.id,projectId:task.projectId}})}/>:null}
    {stage!=='overview'&&stage!=='closeout'?<Card style={[styles.repairStepCard,started&&!finished&&styles.repairActiveCard]}>
      <View style={styles.sectionHeading}>
        <View style={styles.flex}><Text style={styles.hint}>Bước hiện tại</Text><Text style={styles.progressTitle}>{!loaded?'Đang đọc tiến trình…':finished?'Hồ sơ sau thi công':started?'Đang thi công':assessmentChanged?'Cần gửi lại đánh giá':ready?(task.detail?.mode==='CONDITIONAL_FT'?'Kiểm tra điều kiện sửa nhanh':'Sẵn sàng thi công'):incomplete?'Cần bổ sung đánh giá':sourceReady?'Đánh giá trước sửa':'Chuẩn bị số đo và ảnh'}</Text></View>
        <MaterialIcons name={finished?'task-alt':started?'construction':'assignment'} size={22} color={started&&!finished?'#1D4ED8':colors.secondary}/>
      </View>
      <Text style={styles.hint}>{!loaded?'Chờ đối chiếu dữ liệu đã lưu.':finished?closeoutMessage:started?'Chỉ kết thúc khi công việc tại hiện trường đã hoàn tất.':assessmentChanged?'Nháp đã thay đổi. Gửi lại đánh giá để máy chủ kiểm tra số đo, ảnh và vị trí mới.':ready?(task.detail?.mode==='CONDITIONAL_FT'?'Đã có đánh giá. Kiểm tra điều kiện bên dưới; chỉ bắt đầu khi máy chủ xác nhận đủ điều kiện.':'Đánh giá đã đủ thông tin. Có thể bắt đầu khi sẵn sàng tại hiện trường.'):incomplete?'Bổ sung mục còn thiếu rồi gửi đánh giá lại.':sourceReady?'Số đo và ảnh đã sẵn sàng để gửi đánh giá.':'Lưu số đo và tải ảnh trước sửa để tiếp tục.'}</Text>
      <CrewPressable accessibilityRole="button" accessibilityLabel={showRepairSteps?'Thu gọn các bước':'Xem các bước'} accessibilityState={{expanded:showRepairSteps}} onPress={()=>setShowRepairSteps(v=>!v)} style={[styles.repairDisclosure,styles.progressDisclosure]}>
        <Text style={typography.labelLg}>{showRepairSteps?'Thu gọn các bước':'Xem các bước'}</Text><MaterialIcons name={showRepairSteps?'expand-less':'expand-more'} size={22} color={colors.secondary}/>
      </CrewPressable>
      {showRepairSteps?[
        {title:'Số đo và ảnh trước sửa',done:sourceReady||!!assessment||!!started||!!finished,detail:'Lưu số đo, tải ảnh trước sửa và chờ xác minh.'},
        {title:'Đánh giá trước sửa',done:(ready&&!assessmentChanged)||!!started||!!finished,detail:assessment&&!ready?'Cần bổ sung theo kết quả đánh giá.':'Máy chủ kiểm tra điều kiện trước khi thi công.'},
        {title:'Thi công',done:!!finished,detail:started&&!finished?'Đã bắt đầu. Bấm kết thúc khi sửa xong.':'Bắt đầu khi sẵn sàng, kết thúc khi đã sửa xong.'},
        {title:'Ảnh sau và hồ sơ hoàn tất',done:!!intake,detail:'Chụp ảnh sau sửa rồi nộp hồ sơ cho quản lý.'},
      ].map((step,index)=><View key={step.title} style={styles.repairStepRow}>
        <View style={[styles.repairStepNumber,step.done&&styles.repairStepDone]}>
          {step.done?<MaterialIcons name="check" size={18} color={colors.surface}/>:<Text style={styles.hint}>{index+1}</Text>}
        </View>
        <View style={styles.flex}><Text style={typography.labelLg}>{step.title}{step.done?' · Đã xong':''}</Text><Text style={styles.hint}>{step.detail}</Text></View>
      </View>):null}
    </Card>:null}
    <View style={stage==='progress'?styles.progressWork:undefined}>
    {stage==='progress'&&started?<Pressable accessibilityRole="button" accessibilityLabel="Hồ sơ trước sửa" accessibilityState={{expanded:showBeforeEvidence}} style={styles.repairDisclosure} onPress={()=>setShowBeforeEvidence(v=>!v)}><MaterialIcons name="fact-check" size={22} color={colors.secondary}/><Text style={[typography.labelLg,styles.flex]}>Hồ sơ trước sửa</Text><MaterialIcons name={showBeforeEvidence?'expand-less':'expand-more'} size={22} color={colors.secondary}/></Pressable>:stage==='progress'?<Text style={styles.detailHeading}>Hồ sơ trước sửa</Text>:null}
    {stage==='overview' && result.repairContext ? <>
      <View style={styles.overviewLinks}>
        {([
          {title:'Theo dõi thi công',icon:'construction',path:'/(crew)/progress'},
          {title:'Hồ sơ hoàn tất thi công',icon:'task-alt',path:'/(crew)/complete'},
          ...(!fastTrack?[{title:'Kiểm tra yêu cầu bổ sung sửa chữa',icon:'playlist-add-check',path:'/(crew)/repair-correction'}] as const:[]),
        ] as const).map(link=><CrewPressable key={link.path} accessibilityRole="button" accessibilityLabel={link.title} style={({pressed})=>[styles.overviewLink,pressed&&styles.linkPressed]} onPress={()=>router.push({pathname:link.path,params:{id:task.id,projectId:task.projectId}})}>
          <MaterialIcons name={link.icon} size={22} color={colors.brandGold}/><Text style={[styles.body,styles.flex]}>{link.title}</Text><MaterialIcons name="chevron-right" size={22} color={colors.secondary}/>
        </CrewPressable>)}
      </View>
    </> : null}
    {result.status === 'loading' ? <Text>Đang đọc ngữ cảnh từ máy chủ…</Text> : null}
    {result.status === 'error' ? <Text>Không xác nhận được ngữ cảnh sửa chữa. Vui lòng tải lại.</Text> : null}
    {result.status === 'ready' && !result.repairContext ? <Text>Chưa có hạng mục sửa chữa được liên kết hợp lệ với nhiệm vụ này. Các thao tác sửa chữa chưa khả dụng.</Text> : null}
    {stage!=='closeout'&&stage!=='overview'?<>
    {(!started||stage!=='progress'||showBeforeEvidence)?<>
    <View style={[styles.repairStats,styles.progressStats]}>
      <View style={styles.progressStat}><View style={styles.statHeading}><MaterialIcons name="straighten" size={20} color={colors.secondary}/><Text style={styles.progressTitle}>{draft?.measurements.length??0}</Text></View><Text style={styles.hint}>Số đo đã lưu</Text></View>
      <View style={styles.progressStat}><View style={styles.statHeading}><MaterialIcons name="photo-library" size={20} color={colors.secondary}/><Text style={styles.progressTitle}>{draft?.captures.filter(c=>c.purpose!=='AFTER'&&c.verified).length??0}</Text></View><Text style={styles.hint}>Ảnh đã xác minh</Text></View>
    </View>
    <CrewPressable accessibilityRole="button" accessibilityLabel="Số đo / ảnh hiện trường"
      accessibilityHint="Mở số đo, vị trí và ảnh của nhiệm vụ này"
      accessibilityState={{disabled:busy||!task.detail?.firstStartOriginId}}
      disabled={busy||!task.detail?.firstStartOriginId}
      style={({pressed})=>[styles.fieldEvidenceLink,pressed&&styles.linkPressed,(busy||!task.detail?.firstStartOriginId)&&styles.fieldEvidenceDisabled]}
      onPress={()=>router.push({pathname:'/(crew)/field-review',params:{id:task.id,projectId:task.projectId}})}>
      <View style={styles.fieldEvidenceIcon}><MaterialIcons name="perm-media" size={24} color={colors.brandGold}/></View>
      <View style={styles.flex}><Text style={styles.fieldEvidenceTitle}>Số đo / ảnh hiện trường</Text><Text style={styles.fieldEvidenceHint}>Xem số đo, vị trí và ảnh đã lưu</Text></View>
      <MaterialIcons name="chevron-right" size={24} color={colors.secondary}/>
    </CrewPressable>
    </>:null}
    {assessmentBlock&&!started?<View style={styles.repairNotice}><MaterialIcons name="info-outline" size={18} color={colors.secondary}/><Text style={[styles.hint,styles.flex]}>{assessmentBlock}</Text></View>:null}
    {assessmentChanged&&!started&&!finished?<Text accessibilityRole="alert" style={styles.hint}>Số đo, ảnh hoặc vị trí đã thay đổi trong nháp. Đánh giá cũ chưa bao gồm thay đổi này; cần gửi lại để máy chủ kiểm tra trước khi thi công.</Text>:null}
    {sourceReady&&(!ready||assessmentChanged)&&!started&&!finished?<Button variant="primary" title={assessment?'Gửi lại đánh giá trước sửa':'Gửi đánh giá trước sửa'} disabled={busy||!loaded||!sourceReady||!!assessmentBlock||!!pending||rejected||activeHistory.some(c=>c.operation!=='assessment')||result.status!=='ready'||result.repairContext?.status!=='Assigned'} onPress={()=>void run('assessment')}/>:null}
    </>:null}
    {renderHistory(history.filter(c=>c.phase!=='CONFIRMED'),false)}
    {stage!=='closeout'&&stage!=='overview'?<>
    {assessment&&!ready?<View style={styles.repairNotice}><MaterialIcons name="info-outline" size={20} color={colors.secondary}/><View style={[styles.flex,{gap:spacing.sm}]}><Text style={typography.labelLg}>Đánh giá cần bổ sung</Text>{assessmentReasons.length?assessmentReasons.map(reason=><Text key={reason} style={styles.body}>{reason}</Text>):<Text style={styles.body}>Chưa có lý do cụ thể. Tải lại để kiểm tra.</Text>}<Button variant="text" title="Mở hồ sơ để bổ sung" disabled={busy} onPress={()=>router.push({pathname:'/(crew)/field-review',params:{id:task.id,projectId:task.projectId}})}/></View></View>:null}
    {fastTrack?<Card style={styles.card}><CrewFastTrackEligibility key={JSON.stringify([task.projectId,task.id,result.itemVersion,assessment?.key])} projectId={task.projectId} taskId={task.id}/><Text style={styles.hint}>Khi bắt đầu, ứng dụng kiểm tra lại điều kiện với máy chủ. Nếu còn thiếu, thi công chưa được mở.</Text></Card>:null}
    {ready&&!assessmentChanged&&!started&&!finished?<Button variant="primary" title="Bắt đầu thi công" disabled={busy||!loaded||!draft||!ready||!!pending||rejected||!!started||activeHistory.some(c=>c.operation==='start')||result.status!=='ready'||result.repairContext?.status!=='Assigned'} onPress={()=>void run('start')}/>:null}
    </>:null}
    {rejectedCommand?<View><Text>Thao tác bị từ chối. Cần đọc lại điều kiện hiện hành và xác nhận giải quyết lệnh cũ trước khi chuẩn bị lệnh mới. Lệnh chưa rõ kết quả không dùng cách này.</Text><Button variant="secondary" title="Kiểm tra để chuẩn bị lại thao tác bị từ chối" disabled={busy||!loaded} onPress={()=>{const i=currentRepairIdentity(task.projectId,task.id);if(i)setConfirmation({identity:i,key:rejectedCommand.key,kind:'resolve'});}}/></View>:null}
    {pending?<><Text>Chưa xác nhận được kết quả. Chỉ đối soát/gửi lại đúng lệnh đã lưu.</Text><Button variant="secondary" title="Đối soát / gửi lại lệnh đã lưu" disabled={busy||!loaded} onPress={()=>{const i=currentRepairIdentity(task.projectId,task.id);if(i&&pending)setConfirmation({identity:i,key:pending.key});}}/></>:null}
    {confirmation&&sameRepairIdentity(confirmation.identity,live)?<View>
      {confirmation.kind==='resolve'?<><Text accessibilityRole="alert">Xác nhận kiểm tra bằng chứng từ chối ở lần gửi đầu, quyền, liên kết và phiên bản hiện tại. Thao tác này không gửi lệnh sửa chữa; lịch sử cũ được giữ nguyên.</Text><Button variant="secondary" title="Xác nhận giải quyết lệnh bị từ chối" disabled={busy||!loaded} onPress={()=>void run('resolve')}/></>:<>
      <Text accessibilityRole="alert">Đối soát có thể gửi lại đúng lệnh đã lưu. Nếu máy chủ chưa ghi lệnh, thao tác này có thể thực thi lần đầu. Nội dung, khóa chống trùng và phiên bản gốc được giữ nguyên.</Text>
      <Button variant="secondary" title="Xác nhận đối soát lệnh gốc" disabled={busy||!loaded} onPress={()=>void run('replay')}/>
      </>}
      <Button variant="secondary" title="Hủy đối soát" disabled={busy} onPress={()=>setConfirmation(null)}/>
    </View>:null}
    {stage!=='closeout'&&stage!=='overview'?<>
    {started&&!finished?<Button variant="primary" title="Kết thúc thi công" disabled={busy||!loaded||!started||!!finished||!!pending||rejected||activeHistory.some(c=>c.operation==='finish')||result.status!=='ready'||result.repairContext?.status!=='InProgress'} onPress={()=>void run('finish')}/>:null}
    </>:null}
    {stage!=='progress'&&stage!=='overview'?<>
    <Card style={styles.repairWorkCard}>
    <View style={styles.closeoutHeading}><View style={[styles.closeoutIcon,{backgroundColor:finalConfirmed||pmAccepted?"#E8F5E9":serverSubmitted||intake?"#FBF8EE":"#F8F9FA"}]}><MaterialIcons name={finalConfirmed||pmAccepted?"check-circle":serverSubmitted||intake?"upload-file":"construction"} size={24} color={finalConfirmed||pmAccepted?"#166534":serverSubmitted||intake?colors.brandGold:colors.secondary}/></View><Text style={[styles.progressTitle,styles.flex]}>{finalConfirmed?'Đã nghiệm thu':pmAccepted?'Hồ sơ đã được chấp nhận':serverSubmitted||intake?'Đã gửi hồ sơ':draft?.command?.phase==='confirmed'?'Gửi hồ sơ hoàn tất':draft?.repairClaim?'Hoàn thiện ảnh sau sửa':'Thêm ảnh sau sửa'}</Text></View>
    <Text style={styles.hint}>{closeoutMessage}</Text>
    {!finalConfirmed&&!pmAccepted&&!serverSubmitted?<>
    {!finished?<Text style={styles.hint}>Ảnh sau sửa sẽ mở khi kết thúc thi công.</Text>:!intake&&!draft?.command&&!draft?.repairClaim?<Button variant="primary" title="Chụp ảnh sau sửa" disabled={busy||!loaded||!finished||!!pending||rejected||!!intake||!!draft?.command} onPress={()=>void run('claim')}/>:null}
    </>:null}
    {draft?.repairClaim&&!intake&&!serverSubmitted?<Button variant={draft.command?.phase==='confirmed'?'text':'primary'} title="Mở ảnh và hồ sơ" disabled={busy} onPress={()=>router.push({pathname:'/(crew)/field-review',params:{id:task.id,projectId:task.projectId}})}/>:null}
    {!finalConfirmed&&!pmAccepted&&!serverSubmitted?<>
    {finished&&draft?.command?.phase==='confirmed'&&draft.repairClaim&&!intake?<Button variant="primary" title="Gửi hồ sơ hoàn tất" disabled={busy||!loaded||!finished||!!pending||rejected||!!intake||draft?.command?.phase!=='confirmed'||!draft?.repairClaim} onPress={()=>void run('attempt')}/>:null}
    </>:null}
    </Card>
    </>:null}
    {stage==='closeout'?<View style={styles.repairWorkCard}>
      <View style={styles.closeoutHeading}><Text style={[typography.labelLg,styles.flex]}>Số đo và ảnh</Text><Text style={styles.hint}>{serverSubmitted?'Đã gửi':'Bản lưu trên máy'}</Text></View>
      {!serverSubmitted?<>
        <View style={styles.repairStats}>{[
          {label:'Số đo',value:draft?.measurements.length??0},
          {label:'Ảnh trước',value:draft?.captures.filter(c=>c.purpose==='BEFORE'&&c.verified&&c.upload?.fileId).length??0},
          {label:'Ảnh sau',value:draft?.captures.filter(c=>c.purpose==='AFTER'&&c.verified&&c.upload?.fileId).length??0},
        ].map(stat=><View key={stat.label} style={styles.closeoutStat}><Text style={styles.progressTitle}>{stat.value}</Text><Text style={styles.hint}>{stat.label}</Text></View>)}</View>
        <CrewPressable accessibilityRole="button" accessibilityLabel="Chi tiết bản lưu số đo và ảnh" accessibilityState={{expanded:showCloseoutEvidence}} style={[styles.repairDisclosure,styles.progressDisclosure]} onPress={()=>setShowCloseoutEvidence(v=>!v)}><Text style={styles.progressTitle}>Chi tiết bản lưu</Text><MaterialIcons name={showCloseoutEvidence?'expand-less':'expand-more'} size={22} color={colors.secondary}/></CrewPressable>
        {showCloseoutEvidence?<RepairFieldSummary draft={draft}/>:null}
      </>:null}
      <Button style={styles.compactAction} variant="text" title="Xem số đo và ảnh" disabled={busy||!task.detail?.firstStartOriginId} onPress={()=>router.push({pathname:'/(crew)/field-review',params:{id:task.id,projectId:task.projectId}})}/>
    </View>:null}
    {stage==='progress'&&finished?<Button variant="secondary" title="Mở hồ sơ sau thi công" onPress={()=>router.push({pathname:'/(crew)/complete',params:{id:task.id,projectId:task.projectId}})}/>:null}
    {stage==='closeout'&&!finished&&!serverSubmitted?<Button style={styles.compactAction} variant="secondary" title="Xem các mốc thi công" onPress={()=>router.push({pathname:'/(crew)/progress',params:{id:task.id,projectId:task.projectId}})}/>:null}
    {notice&&notice!=='Đã lưu biên nhận máy chủ và đối chiếu hạng mục.'?<View style={styles.repairNotice}><MaterialIcons name="info-outline" size={20} color={colors.secondary}/><Text style={[styles.hint,styles.flex]} accessibilityLiveRegion="polite">{notice}</Text></View>:null}
    </View>
    {result.repairContext ? <>
      {stage==='overview'?<View style={styles.overviewPlan}><Text style={typography.labelLg}>Phương án xử lý</Text><Text style={styles.body}>{crewRepairPlanLabel(result.repairContext.repairPlan)}</Text></View>:null}
      <Button style={styles.repairTechnicalLink} variant="text" icon={<MaterialIcons name={showRepairTechnical?'expand-less':'history'} size={20} color={colors.secondary}/>} title={showRepairTechnical?'Thu gọn thông tin':stage==='closeout'?'Phương án và lịch sử':'Xem lịch sử và thông tin kỹ thuật'} onPress={()=>setShowRepairTechnical(v=>!v)}/>
      {showRepairTechnical ? <View style={styles.technicalPanel}>
        {stage!=='overview'?<View style={styles.repairPlan}><Text style={typography.labelLg}>Phương án xử lý</Text><Text style={styles.body}>{crewRepairPlanLabel(result.repairContext.repairPlan)}</Text></View>:null}
        {renderHistory(history,true)}
        {notice==='Đã lưu biên nhận máy chủ và đối chiếu hạng mục.'?<Text style={styles.hint} accessibilityLiveRegion="polite">{notice}</Text>:null}
        <View style={styles.technicalHeading}><MaterialIcons name="link" size={20} color="#1D4ED8"/><Text style={typography.labelLg}>Thông tin liên kết</Text></View>
        <View style={styles.technicalStatus}><MaterialIcons name="info-outline" size={18} color="#1D4ED8"/><Text style={styles.technicalStatusText}>{({Assigned:'Đã phân công',InProgress:'Đang thi công',Confirmed:'Đã xác nhận'} as Record<string,string>)[result.repairContext.status]??'Đã đọc trạng thái từ máy chủ'}</Text></View>
        {[
          ['Hạng mục',result.repairContext.itemId],
          ['Liên kết phân công',result.repairContext.bindingId],
          ['Phiên bản hạng mục',result.itemVersion],
          ['Phiên bản bộ kiểm tra',result.repairContext.checklistVersion],
        ].map(([label,value])=><View key={label} style={styles.technicalFact}><Text style={styles.hint}>{label}</Text><Text selectable style={styles.technicalValue}>{value}</Text></View>)}
      </View> : null}
    </> : null}


  </View>;
}

/** Read-only summary of the already scoped FIELD source; never a readiness gate. */
export function RepairFieldSummary({draft}:{draft:FieldDraft|null}) {
  const before=draft?.captures.filter(c=>c.purpose==='BEFORE'&&c.verified&&c.upload?.fileId).length??0;
  const after=draft?.captures.filter(c=>c.purpose==='AFTER'&&c.verified&&c.upload?.fileId).length??0;
  return <View style={{gap:spacing.sm}}>
      <Text style={styles.progressTitle}>Số đo và ảnh</Text>
      <Text style={styles.hint}>Bản lưu trên thiết bị; chưa thay cho hồ sơ được máy chủ tiếp nhận.</Text>
      {draft?.measurements.length?draft.measurements.map(m=><View key={m.sampleId}>
        <Text style={styles.body}>{({Area:'Diện tích hư hại',SlabFaultingHeight:'Độ chênh tấm',ShoulderErosionExtent:'Kích thước xói lở',DepressionLength:'Chiều dài chỗ lõm',DepressionWidth:'Chiều rộng chỗ lõm',DepressionDepth:'Độ sâu chỗ lõm'} as Record<string,string>)[m.type]??'Số đo hiện trường'}: {m.state==='KNOWN'&&typeof m.value==='number'&&Number.isFinite(m.value)&&m.unit?`${m.value} ${m.unit}`:m.unknownReason||'Chưa có giá trị và đơn vị được xác nhận'}</Text>
      </View>):<Text style={styles.body}>Chưa có số đo trong hồ sơ đo kiểm hiện tại.</Text>}
    <View style={styles.evidenceCounts}>
      <Text style={styles.body}>{`Trước sửa: ${before} ảnh đã xác minh`}</Text>
      <Text style={styles.body}>{`Sau sửa: ${after} ảnh đã xác minh`}</Text>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  fieldEvidenceLink: { minHeight: 72, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  fieldEvidenceIcon: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  fieldEvidenceTitle: { ...typography.labelLg, color: colors.neutral, flexShrink: 1 },
  fieldEvidenceHint: { ...typography.caption, color: colors.secondary, marginTop: spacing.xs },
  fieldEvidenceDisabled: { opacity: 0.5 },
  detailCard: { borderColor: '#DCE2E7', borderRadius: 16, marginBottom: 16, gap: 16, padding: 16 },
  detailHero: { backgroundColor: colors.surface, gap: 12 },
  detailTitle: { ...typography.titleLg, lineHeight: 28, color: '#192D40' },
  detailHeading: { ...typography.labelLg, fontSize: 14, lineHeight: 21, color: '#192D40' },
  detailTasteHeading: { ...typography.titleMd, lineHeight: 24, color: '#192D40' },
  detailId: { ...typography.labelLg, lineHeight: 21, color: '#526170' },
  detailState: { backgroundColor: '#192D40', borderColor: '#192D40' },
  detailStateHeading: { color: '#FFFFFF' },
  detailStateBody: { ...typography.bodyMd, lineHeight: 23, color: '#E0E7EC' },
  detailStateHint: { ...typography.caption, lineHeight: 19, color: '#CDD7DF' },
  detailPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  detailPrimaryDisabled: { backgroundColor: '#486072', borderColor: '#6B8294', opacity: 1 },
  detailPrimaryDisabledText: { color: '#FFFFFF' },
  detailSecondary: { backgroundColor: '#F3F5F6', borderColor: '#DCE2E7' },
  detailSecondarySurface: { backgroundColor: colors.surface, padding: 12, borderRadius: radius.md },
  detailRefresh: { backgroundColor: '#243D51', borderWidth: 1, borderColor: '#486072' },
  detailSectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailAccent: { width: 3, height: 18, borderRadius: 2, backgroundColor: colors.primary },
  detailDeadline: { gap: 6, borderTopWidth: 1, borderTopColor: '#DCE2E7', paddingTop: 16 },
  detailDeadlineValue: { ...typography.titleMd, lineHeight: 24, fontVariant: ['tabular-nums'], color: '#192D40' },
  detailLinkPressed: { backgroundColor: '#E4E9ED' },
  detailLink: { backgroundColor: '#F3F5F6', borderRadius: radius.md, minHeight: 48, padding: 12 },
  overviewLinks: { gap: spacing.sm },
  overviewLink: { minHeight: 48, padding: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: '#FBF8EE', borderRadius: radius.md, borderWidth: 1, borderColor: '#E8D9A8', overflow: 'hidden' },
  overviewPlan: { gap: spacing.xs, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  repairActiveCard: {backgroundColor:'#EDF2F5',borderColor:'#DCE2E7',borderLeftColor:'#C9A227',borderLeftWidth:3},
  closeoutHeading: {flexDirection:"row",alignItems:"center",flexWrap:"wrap",gap:spacing.sm},
  closeoutIcon: {padding:spacing.xs,borderRadius:radius.md},
  closeoutStat: {flexGrow:1,flexBasis:80,minWidth:0,gap:spacing.xs,padding:spacing.sm,borderRadius:6,backgroundColor:'#F3F5F6'},
  evidenceCounts: {gap:spacing.xs,borderTopWidth:1,borderTopColor:colors.border,paddingTop:spacing.sm},
  repairWorkCard: {backgroundColor:colors.surface,borderWidth:1,borderColor:'#DCE2E7',borderRadius:radius.lg,padding:16,gap:12,marginBottom:4},
  repairNotice: {flexDirection:'row',alignItems:'flex-start',gap:spacing.sm,backgroundColor:colors.surfaceAlt,borderRadius:radius.md,padding:spacing.sm},
  compactAction: {alignSelf:"flex-start",maxWidth:"100%",backgroundColor:"#FBF8EE"},
  repairTechnicalLink: {borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface},
  repairStepCard: {gap:12, borderWidth:1, borderColor:'#DCE2E7', backgroundColor:'#F3F5F6', padding:16, marginBottom:4},
  progressTitle: {...typography.labelLg,lineHeight:21,color:'#192D40',fontVariant:['tabular-nums']},
  progressDisclosure: {paddingHorizontal:12,borderWidth:1,borderColor:'#DCE2E7',backgroundColor:colors.surface,borderRadius:radius.md},
  progressWork: {padding:16,gap:12,backgroundColor:colors.surface,borderRadius:radius.lg,borderWidth:1,borderColor:'#DCE2E7'},
  progressStats: {gap:12,paddingVertical:spacing.sm,borderTopWidth:1,borderTopColor:colors.border},
  progressStat: {flexGrow:1,flexBasis:120,minWidth:0,gap:spacing.xs},
  repairDisclosure: {minHeight:48, flexDirection:'row', alignItems:'center', justifyContent:'space-between', gap:spacing.sm},
  repairStepRow: {flexDirection:'row', gap:12, alignItems:'flex-start', paddingVertical:8},
  repairStepNumber: {width:24,height:24,borderRadius:6,backgroundColor:'#E4E9ED',alignItems:'center',justifyContent:'center'},
  repairStepDone: {backgroundColor:colors.success},
  repairStats: {flexDirection:'row',flexWrap:'wrap',gap:spacing.sm,paddingVertical:spacing.xs},
  repairStat: {flexGrow:1,flexBasis:120,minWidth:0,padding:spacing.sm,gap:spacing.xs,backgroundColor:colors.surfaceAlt,borderRadius:radius.md},
  statHeading:{flexDirection:'row',alignItems:'center',gap:spacing.sm},
  repairPlan: {gap:spacing.sm,padding:spacing.md,marginTop:spacing.md,borderWidth:1,borderColor:colors.border},

  backRow: { alignSelf: 'flex-start', minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm, paddingHorizontal: spacing.sm },
  topBar: { padding: spacing.md },
  card: { marginBottom: spacing.md, gap: spacing.md, borderWidth: 1, borderColor: '#E8D9A8', borderRadius: radius.lg },
  hero: { backgroundColor: '#FFFCF4' },
  sectionHeading: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  refreshButton: { minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: '#FFF8E5' },
  iconBox: { padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  flex: { flex: 1, minWidth: 0 },
  eyebrow: { ...typography.labelSm, color: colors.secondary, marginBottom: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  body: { ...typography.bodyMd, color: colors.neutral },
  hint: { ...typography.caption, color: colors.secondary },
  factRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  taskActionCard: { marginBottom: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: '#E8D9A8', borderRadius: radius.lg },
  linkGroup:{borderWidth:1,borderColor:'#E8D9A8',borderRadius:radius.lg,overflow:'hidden'},
  linkRow:{minHeight:56,padding:spacing.md,flexDirection:'row',alignItems:'center',gap:spacing.sm,backgroundColor:'#FFFCF4'},
  linkPressed:{backgroundColor:'#F6ECCD'},
  planPanel:{gap:spacing.sm,padding:spacing.md,backgroundColor:colors.surfaceAlt,borderRadius:radius.md,marginTop:spacing.sm},
  technicalPanel:{padding:spacing.md,gap:spacing.sm,backgroundColor:colors.surface,borderWidth:1,borderColor:'#D8E4F7',borderRadius:radius.lg},
  technicalHeading:{flexDirection:'row',alignItems:'center',gap:spacing.sm,paddingBottom:spacing.xs},
  technicalStatus:{flexDirection:'row',alignItems:'center',gap:spacing.xs,padding:spacing.sm,backgroundColor:'#EAF2FF',borderRadius:radius.md},
  technicalStatusText:{...typography.labelSm,color:'#1D4ED8',flexShrink:1},
  technicalFact:{gap:spacing.xs,paddingVertical:spacing.sm,borderTopWidth:1,borderTopColor:colors.border},
  technicalValue:{...typography.caption,color:colors.neutral},
});

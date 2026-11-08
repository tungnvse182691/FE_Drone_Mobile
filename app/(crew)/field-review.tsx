import React, { useCallback, useRef, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { randomUUID } from 'expo-crypto';
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
import { readFieldRecovery, reconcileFieldDraft, currentFieldContext, openFieldRuntime, loadFieldDraft, measurementTemplate, saveFieldMeasurements,
  uploadFieldCapture, submitFieldDraft, acknowledgeFieldResult, fieldDraftPending, fieldErrorMessage, downloadFieldPhoto,
  type FieldDraft } from '../../src/api/crewFieldDraft';
import { prepareRepairSupplement, dispatchRepair, readRepairHistory, repairRuntime, repairErrorMessage } from '../../src/api/crewRepairWorkflow';
import { currentRepairIdentity, type RepairJournalRecord } from '../../src/api/crewRepairDraft';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

/** Display only: stored instrument and backend free text are never rewritten. */
export function crewInstrumentLabel(value: string): string {
  return value === 'RULER' ? 'Thước đo' : value || 'Chưa có thông tin';
}

export function measurementValidationMessage(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  const number = Number(raw.replace(',', '.'));
  return Number.isFinite(number) && number >= 0 ? null : 'Nhập một số từ 0 trở lên.';
}

export function fieldEvidenceStatus(capture: { verified?: boolean; completed?: boolean; upload?: unknown }) {
  if (capture.verified) return { label: 'Máy chủ đã xác minh', variant: 'approved' as const };
  if (capture.completed) return { label: 'Đã tải lên, chờ xác minh', variant: 'status-pending' as const };
  if (capture.upload) return { label: 'Đang tải lên', variant: 'status-pending' as const };
  return { label: 'Đã lưu trên thiết bị', variant: 'status-pending' as const };
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
  const [busy,setBusy]=useState(false), busyRef=useRef(false);
  const [loading,setLoading]=useState(true), [error,setError]=useState('');
  const [replayConfirmed,setReplayConfirmed]=useState<{key:string;context:string}|null>(null);
  const [repairRecovery,setRepairRecovery]=useState<RepairJournalRecord|null>(null);
  const [repairRecoveryConfirmed,setRepairRecoveryConfirmed]=useState<{key:string;context:string}|null>(null);
  const [notice,setNotice]=useState(''),[preview,setPreview]=useState<string|null>(null);
  const active=useRef(true);
  const context=()=>currentFieldContext(task.projectId,task.id);
  const current=(c: NonNullable<ReturnType<typeof context>>)=>active.current&&JSON.stringify(context())===JSON.stringify(c);
  const loadRepairRecovery=useCallback(async(c:NonNullable<ReturnType<typeof context>>,fieldSubmissionId?:string)=>{
    if(!supplementMode){setRepairRecovery(null);return;}
    const i=currentRepairIdentity(task.projectId,task.id);if(!i){setRepairRecovery(null);return;}
    try {
      const rows=await readRepairHistory(i,repairRuntime(i),true);
      const row=rows.filter(value=>value.operation==='supplement'&&(!fieldSubmissionId||value.payload.fieldSubmissionId===fieldSubmissionId)).at(-1)??null;
      if(current(c))setRepairRecovery(row);
    } catch(e) { if(current(c)) setNotice(repairErrorMessage(e)); }
  },[supplementMode,task.id,task.projectId]);
  const load=useCallback(async()=>{
    const c=currentFieldContext(task.projectId,task.id);if(!c)return;
    setLoading(true);setError('');setReplayConfirmed(null);setRepairRecoveryConfirmed(null);setRepairRecovery(null);setDraft(null);setLatest(null);setPreview(null);
    try {
      const runtime=await openFieldRuntime(c);
      let saved:FieldDraft;try{saved=await loadFieldDraft(c,runtime);}catch(error){
        if(!current(c))return;const recovery=await readFieldRecovery(c);saved=recovery.draft;
      }
      const fresh=await getFieldInspectionTaskDetailReal(task.projectId,task.id);
      validateCrewTaskDetail(fresh.data,fresh.etag,task.projectId,task.id,c.actor);
      const previous=fresh.data.latestSubmissionId ? (await getFieldSubmissionDetailReal(task.projectId,task.id,fresh.data.latestSubmissionId)).data : null;
      if(previous&&(previous.taskId!==task.id||previous.id!==fresh.data.latestSubmissionId))throw Error('field_lineage_invalid');
      if(!current(c))return;
      setDraft(saved);setLatest(previous);
      await loadRepairRecovery(c,saved.result?.id);
      setLocationProof(saved.locationProof);setChainage(saved.locationProof?.observedChainageMeters==null?'':String(saved.locationProof.observedChainageMeters));
      setRawValues({});
      const initial=measurementTemplate(fresh.data.requiredMeasurementType,randomUUID());
      setMeasurements(saved.measurements.length?saved.measurements:previous?.measurements?.length?previous.measurements:initial?[initial]:[]);
    } catch(e){if(current(c)){setDraft(null);setError(fieldErrorMessage(e));}}
    finally{if(current(c))setLoading(false);}
  },[loadRepairRecovery,task.id,task.projectId,identity.scope]);
  useFocusEffect(useCallback(()=>{active.current=true;void load();return()=>{active.current=false;};},[load]));
  const block=!identity.user||!identity.scope||!task.detail?'Phiên đội sửa chữa không hợp lệ.':fieldCapabilityBlock(task.detail,task.etag??'',identity.user.id,'submit');
  const captureBlock=!identity.user||!task.detail?'Phiên đội sửa chữa không hợp lệ.':fieldCapabilityBlock(task.detail,task.etag??'',identity.user.id,'capture');
  const frozen=!!draft?.command;
  const normalMeasurement=task.detail?.mode==='NORMAL'&&!draft?.repairClaim&&!supplementMode;
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
      try{const saved=await loadFieldDraft(c,await openFieldRuntime(c));if(current(c)){setDraft(saved);await loadRepairRecovery(c,saved.result?.id);}}catch{/* keep explicit error; never reset an unresolved command */}
    }}finally{busyRef.current=false;if(current(c))setBusy(false);}
  };
  const update=(index:number,change:Partial<FieldMeasurementInput>)=>{if(busy||frozen)return;setMeasurements(values=>values.map((v,i)=>i===index?{...v,...change}:v));};
  const mode=TASK_MODE_CHIP[task.task_mode];
  return <SafeAreaScreen scroll header={<AppHeader subtitle="Hồ sơ hiện trường" showBack onBack={()=>router.back()} />}>
    <View style={styles.content}>
      <Card style={styles.card}><Text style={typography.titleMd}>{task.title||'Nhiệm vụ hiện trường'}</Text><Chip label={mode.label} variant={mode.variant}/>
        <Text>{task.wo_code||'Chưa có mã công việc từ máy chủ'}</Text>
        <Text>{supplementMode?'Bản bổ sung FIELD cho yêu cầu SUPPLEMENT. Chỉ dùng số đo và bằng chứng thật đã được máy chủ xác minh.':draft?.repairClaim?'Hồ sơ sửa chữa theo kế hoạch: ảnh sau sửa và số đo thực. Gửi hồ sơ đo kiểm chưa phải tiếp nhận sửa chữa hay quản lý xác nhận.':'Kết quả đo kiểm hiện trường.'}</Text></Card>
      {loading?<Text>Đang tải hồ sơ…</Text>:null}
      {error?<Text accessibilityLiveRegion="polite">{error}</Text>:null}
      <Button variant="secondary" title="Tải lại hồ sơ / trạng thái" disabled={busy} onPress={()=>void load()}/>
      {latest?<Card style={styles.card}><View style={styles.summaryHeader}><View style={styles.flex}><Text style={styles.sectionTitle}>Lượt gửi #{latest.revision}</Text><Text style={styles.muted}>Kết quả đọc lại từ máy chủ, chưa phải nghiệm thu.</Text></View><Chip label={fieldSubmissionReadinessLabel(latest.readiness)} variant={latest.readiness==='READY'?'approved':'status-pending'} uppercase={false}/></View>{latest.missingReasons?.length?<Text>Máy chủ yêu cầu kiểm tra thêm số đo, ảnh hoặc bằng chứng vị trí. Hồ sơ đã gửi được giữ nguyên.</Text>:null}
        {(latest.evidence??[]).filter(e=>e.fileId).map(e=><Button key={e.captureOriginId} variant="secondary" title={`Xem ảnh ${e.purpose==='AFTER'?'sau sửa':e.purpose==='BEFORE'?'hiện trạng':'đo kiểm'} riêng tư`} disabled={busy} onPress={()=>void run('download',e.fileId!)}/>)}</Card>:<Text>Chưa có lượt gửi từ máy chủ.</Text>}
      {preview?<Image source={{uri:preview}} style={{width:'100%',height:240}} resizeMode="contain"/>:null}
      {draft?<>
        <Card style={styles.card}><Text style={styles.sectionTitle}>Số đo hiện trường</Text>
          {!measurements.length?<Text>Chưa có loại đo được máy chủ hỗ trợ; chưa thể gửi hồ sơ.</Text>:null}
          {measurements.map((m,i)=><View key={m.sampleId} pointerEvents={busy||frozen?'none':'auto'} style={{opacity:busy||frozen?0.6:1}}>
            <Text>{m.dimension==='AREA'?'Diện tích hư hại':m.type==='SlabFaultingHeight'?'Độ chênh tấm':m.type==='ShoulderErosionExtent'?'Kích thước xói lở':'Độ sâu thực tế'} ({m.unit})</Text>
            <InputField label="Giá trị đo thực (để trống nếu chưa đo)" value={rawValues[m.sampleId]??(m.value===null?'':String(m.value))} keyboardType="decimal-pad" onChangeText={text=>{
              if(busy||frozen)return;setRawValues(values=>({...values,[m.sampleId]:text}));
              const normalized=text.trim().replace(',','.');const value=normalized===''?null:Number(normalized);
              update(i,{value,state:value===null?'UNKNOWN':'KNOWN',unknownReason:value===null?m.unknownReason||'Chưa đo tại hiện trường':null});}}/>
            {measurementValidationMessage(rawValues[m.sampleId]??'')?<Text style={styles.errorText}>{measurementValidationMessage(rawValues[m.sampleId]??'')}</Text>:null}
            {m.value===null?<InputField label="Lý do chưa đo" value={m.unknownReason??''} onChangeText={unknownReason=>update(i,{unknownReason})}/>:null}
            <InputField label="Dụng cụ đo thực tế" value={m.instrument} onChangeText={instrument=>update(i,{instrument})}/>
            <InputField label="Phương pháp đo thực tế" value={m.method} onChangeText={method=>update(i,{method})}/>
            {m.latitude==null||m.longitude==null?<InputField label="Lý do chưa có tọa độ quan sát" value={m.locationReason??''} onChangeText={locationReason=>update(i,{locationReason})}/>:<Text>GPS quan sát trong hồ sơ máy chủ: {m.latitude}, {m.longitude}</Text>}
          </View>)}
          <Button variant="secondary" title="Lưu nháp số đo" disabled={busy||frozen} onPress={()=>void run('save')}/>
          <Text>Nhấn lưu nháp để giữ số đo khi đóng app. Vị trí nhiệm vụ không thay cho GPS quan sát.</Text>
          <Text>Đối chiếu vị trí thực tế (tùy chọn; máy chủ đánh giá mức đầy đủ)</Text>
          <Text>Chỉ nhập dấu mốc bạn đã quan sát. Không lấy tọa độ hoặc ID nhiệm vụ thay bằng chứng vị trí.</Text>
          <Button variant="secondary" title="Đối chiếu dấu mốc tuyến / lý trình" disabled={busy||frozen} onPress={()=>setLocationProof({kind:'POSITION_CHECKLIST',checklist:'ROUTE_CHAINAGE_MARKINGS_CONFIRMED'})}/>
          <Button variant="secondary" title="Đối chiếu ký hiệu tấm bê tông" disabled={busy||frozen} onPress={()=>setLocationProof({kind:'POSITION_CHECKLIST',checklist:'SLAB_MARKINGS_CONFIRMED'})}/>
          <Button variant="secondary" title="Chưa xác định vị trí" disabled={busy||frozen} onPress={()=>{setLocationProof(null);setChainage('');}}/>
          {locationProof?.checklist==='ROUTE_CHAINAGE_MARKINGS_CONFIRMED'?<>
            <InputField label="Mã phiên bản tuyến trên hồ sơ đối chiếu" value={locationProof.observedRouteVersionId??''} onChangeText={value=>{if(!busy&&!frozen)setLocationProof({...locationProof,observedRouteVersionId:value});}}/>
            <InputField label="Lý trình quan sát thực tế (m)" value={chainage} keyboardType="decimal-pad" onChangeText={value=>{if(!busy&&!frozen)setChainage(value);}}/>
          </>:null}
          {locationProof?.checklist==='SLAB_MARKINGS_CONFIRMED'?<InputField label="Ký hiệu tấm đã đối chiếu thực tế" value={locationProof.observedSlabId??''} onChangeText={value=>{if(!busy&&!frozen)setLocationProof({...locationProof,observedSlabId:value});}}/>:null}
        </Card>
        <Card style={styles.card}><Text style={styles.sectionTitle}>Ảnh bằng chứng</Text>
          {!draft.captures.length?<Text>Chưa có ảnh nháp của phiên và nhiệm vụ này.</Text>:null}
          {draft.captures.map(c=><View key={c.id} style={styles.missingBox}>
            <Image source={{uri:c.uri}} style={{width:'100%',height:180,borderRadius:radius.md}} resizeMode="cover"/>
            <Text style={typography.labelLg}>{c.purpose==='AFTER'?'Sau sửa chữa':c.purpose==='BEFORE'?'Hiện trạng trước sửa':'Đo kiểm'}</Text>
            <Chip {...fieldEvidenceStatus(c)} />
            <Text style={styles.muted}>{c.coordinates?'Có vị trí camera quan sát':'Không có GPS quan sát'} · {c.capturedAt?'Ảnh chụp trực tiếp':'Ảnh từ thiết bị, chưa xác minh thời điểm chụp'}</Text>
          </View>)}
          {captureBlock?<Text>{captureBlock}</Text>:null}
          <Button variant="secondary" title="Chụp / chọn ảnh hiện trường" disabled={busy||frozen||!!captureBlock} onPress={()=>router.push({pathname:'/(crew)/viewfinder',params:{id:task.id,projectId:task.projectId,mode:draft.repairClaim?'AFTER':'BEFORE'}})}/>
          <Button variant="secondary" title="Tải ảnh / kiểm tra xác minh" disabled={busy||frozen||!draft.captures.length||!!captureBlock} onPress={()=>void run('upload')}/>
        </Card>
        {block?<Text>{block}</Text>:null}
        {normalMeasurement?<Text>Với sửa chữa theo kế hoạch, lưu số đo và tải ảnh lên để đánh giá trước sửa tại chi tiết nhiệm vụ. Chỉ lập hồ sơ sửa chữa sau khi kết thúc thi công; hồ sơ đo kiểm không thay cho hồ sơ sửa chữa.</Text>:null}
        <Button variant="primary" title={supplementMode?'Gửi bản bổ sung và liên kết lượt sửa chữa':draft.repairClaim?'Gửi hồ sơ đo kiểm sau sửa':latest?'Gửi bổ sung đo kiểm':'Gửi hồ sơ đo kiểm'} loading={busy} disabled={busy||frozen||normalMeasurement||!!block||!measurements.length||(!draft.captures.length&&!latest?.evidence?.length)||draft.captures.some(c=>!c.verified)} onPress={()=>void run('submit')}/>
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
      {notice?<Text accessibilityLiveRegion="polite">{notice}</Text>:null}
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
  choiceButton: {
    flex: 1,
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

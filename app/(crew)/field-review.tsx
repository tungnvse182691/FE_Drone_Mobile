import React, { useCallback, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
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
import { currentFieldContext, openFieldRuntime, loadFieldDraft, measurementTemplate, saveFieldMeasurements,
  uploadFieldCapture, submitFieldDraft, acknowledgeFieldResult, fieldDraftPending, fieldErrorMessage, downloadFieldPhoto,
  type FieldDraft } from '../../src/api/crewFieldDraft';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

export default function CrewFieldReviewScreen() {
  return <CrewTaskBoundary operational={false}>{task => <CrewFieldReviewScreenContent task={task} />}</CrewTaskBoundary>;
}
function CrewFieldReviewScreenContent({ task }: { task: CrewTask }) {
  const identity=useCrewIdentity();
  const [draft,setDraft]=useState<FieldDraft|null>(null);
  const [measurements,setMeasurements]=useState<FieldMeasurementInput[]>([]);
  const [rawValues,setRawValues]=useState<Record<string,string>>({});
  const [locationProof,setLocationProof]=useState<FieldPositionProofInput|null>(null);
  const [chainage,setChainage]=useState('');
  const [latest,setLatest]=useState<FieldSubmissionViewFact|null>(null);
  const [busy,setBusy]=useState(false), busyRef=useRef(false);
  const [loading,setLoading]=useState(true), [error,setError]=useState('');
  const [notice,setNotice]=useState(''),[preview,setPreview]=useState<string|null>(null);
  const active=useRef(true);
  const context=()=>currentFieldContext(task.projectId,task.id);
  const current=(scope: string)=>active.current&&context()?.scope===scope;
  const load=useCallback(async()=>{
    const c=currentFieldContext(task.projectId,task.id);if(!c)return;
    setLoading(true);setError('');
    try {
      const runtime=await openFieldRuntime(c),saved=await loadFieldDraft(c,runtime);
      const fresh=await getFieldInspectionTaskDetailReal(task.projectId,task.id);
      validateCrewTaskDetail(fresh.data,fresh.etag,task.projectId,task.id,c.actor);
      const previous=fresh.data.latestSubmissionId ? (await getFieldSubmissionDetailReal(task.projectId,task.id,fresh.data.latestSubmissionId)).data : null;
      if(previous&&(previous.taskId!==task.id||previous.id!==fresh.data.latestSubmissionId))throw Error('field_lineage_invalid');
      if(!current(c.scope))return;
      setDraft(saved);setLatest(previous);
      setLocationProof(saved.locationProof);setChainage(saved.locationProof?.observedChainageMeters==null?'':String(saved.locationProof.observedChainageMeters));
      setRawValues({});
      const initial=measurementTemplate(fresh.data.requiredMeasurementType,randomUUID());
      setMeasurements(saved.measurements.length?saved.measurements:previous?.measurements?.length?previous.measurements:initial?[initial]:[]);
    } catch(e){if(current(c.scope)){setDraft(null);setError(fieldErrorMessage(e));}}
    finally{if(current(c.scope))setLoading(false);}
  },[task.id,task.projectId,identity.scope]);
  useFocusEffect(useCallback(()=>{active.current=true;void load();return()=>{active.current=false;};},[load]));
  const block=!identity.user||!identity.scope||!task.detail?'Phiên Crew không hợp lệ.':fieldCapabilityBlock(task.detail,task.etag??'',identity.user.id,'submit');
  const captureBlock=!identity.user||!task.detail?'Phiên Crew không hợp lệ.':fieldCapabilityBlock(task.detail,task.etag??'',identity.user.id,'capture');
  const frozen=!!draft?.command;
  const normalMeasurement=task.detail?.mode==='NORMAL'&&!draft?.repairClaim;
  const run=async(action:'save'|'upload'|'submit'|'replay'|'new'|'download',fileId?:string)=>{
    if(busyRef.current)return;
    const c=context();if(!c)return;
    busyRef.current=true;setBusy(true);setNotice('');
    try {
      const runtime=await openFieldRuntime(c);
      let saved=await loadFieldDraft(c,runtime);
      if(action==='download') {const uri=await downloadFieldPhoto(c,fileId!);if(current(c.scope))setPreview(uri);return;}
      if(action==='new') saved=await acknowledgeFieldResult(c);
      if(['save','upload','submit'].includes(action)) {
        if(saved.command)throw Error('field_command_pending');
        if(Object.values(rawValues).some(v=>v.trim()!==''&&(!Number.isFinite(Number(v.replace(',','.')))||Number(v.replace(',','.'))<0)))throw Error('field_measurements_required');
        if(chainage.trim()!==''&&(!Number.isFinite(Number(chainage.replace(',','.')))||Number(chainage.replace(',','.'))<0))throw Error('field_measurements_required');
        const proof=locationProof?{...locationProof,observedChainageMeters:chainage.trim()===''?null:Number(chainage.replace(',','.'))}:null;
        saved=await saveFieldMeasurements(c,measurements,proof);
      }
      if(action==='upload') for(let i=0;i<saved.captures.length;i++)saved=await uploadFieldCapture(saved,i,runtime);
      if(action==='submit'||action==='replay')saved=await submitFieldDraft(saved,runtime,action==='replay');
      if(!current(c.scope))return;
      setDraft({...saved});
      setNotice(saved.command?.phase==='confirmed'?'Đã xác nhận hồ sơ qua GET readback. '+(saved.result?.readiness==='READY'?'Máy chủ đánh giá READY.':'Hồ sơ còn thiếu thông tin; chưa được nghiệm thu.'):
        action==='upload'?'Ảnh đã được xác minh VERIFIED trên máy chủ.':'Đã lưu nháp cục bộ.');
      if(action==='new')await load();
    }catch(e){if(current(c.scope)){
      setNotice(fieldErrorMessage(e));
      try{const saved=await loadFieldDraft(c,await openFieldRuntime(c));if(current(c.scope))setDraft(saved);}catch{/* keep explicit error; never reset an unresolved command */}
    }}finally{busyRef.current=false;if(current(c.scope))setBusy(false);}
  };
  const update=(index:number,change:Partial<FieldMeasurementInput>)=>{if(busy||frozen)return;setMeasurements(values=>values.map((v,i)=>i===index?{...v,...change}:v));};
  const mode=TASK_MODE_CHIP[task.task_mode];
  return <SafeAreaScreen>
    <AppHeader subtitle="Hồ sơ hiện trường" showBack onBack={()=>router.back()} />
    <ScrollView contentContainerStyle={styles.content}>
      <Card style={styles.card}><Text style={typography.titleMd}>{task.title||'Nhiệm vụ hiện trường'}</Text><Chip label={mode.label} variant={mode.variant}/>
        <Text>{task.wo_code||'Chưa có mã WO từ máy chủ'}</Text><Text selectable>{task.id}</Text>
        <Text>{draft?.repairClaim?'Hồ sơ sửa chữa NORMAL: ảnh AFTER và số đo thực. Gửi FIELD chưa phải tiếp nhận sửa chữa hay PM xác nhận.':'Kết quả đo kiểm FIELD.'}</Text></Card>
      {loading?<Text>Đang tải hồ sơ…</Text>:null}
      {error?<Text accessibilityLiveRegion="polite">{error}</Text>:null}
      <Button variant="secondary" title="Tải lại hồ sơ / trạng thái" disabled={busy} onPress={()=>void load()}/>
      {latest?<Card style={styles.card}><Text>Lượt gửi #{latest.revision} • {latest.readiness}</Text>{(latest.missingReasons??[]).map(r=><Text key={r}>{r}</Text>)}
        {(latest.evidence??[]).filter(e=>e.fileId).map(e=><Button key={e.captureOriginId} variant="secondary" title={`Xem ảnh ${e.purpose} riêng tư`} disabled={busy} onPress={()=>void run('download',e.fileId!)}/>)}</Card>:<Text>Chưa có lượt gửi từ máy chủ.</Text>}
      {preview?<Image source={{uri:preview}} style={{width:'100%',height:240}} resizeMode="contain"/>:null}
      {draft?<>
        <Card style={styles.card}><Text style={styles.sectionTitle}>Số đo hiện trường</Text>
          {!measurements.length?<Text>BE chưa cung cấp loại đo được hỗ trợ; khóa gửi hồ sơ.</Text>:null}
          {measurements.map((m,i)=><View key={m.sampleId} pointerEvents={busy||frozen?'none':'auto'} style={{opacity:busy||frozen?0.6:1}}>
            <Text>{m.type} • {m.dimension} ({m.unit})</Text>
            <InputField label="Giá trị đo thực (để trống nếu chưa đo)" value={rawValues[m.sampleId]??(m.value===null?'':String(m.value))} keyboardType="decimal-pad" onChangeText={text=>{
              if(busy||frozen)return;setRawValues(values=>({...values,[m.sampleId]:text}));
              const normalized=text.trim().replace(',','.');const value=normalized===''?null:Number(normalized);
              update(i,{value,state:value===null?'UNKNOWN':'KNOWN',unknownReason:value===null?m.unknownReason||'Chưa đo tại hiện trường':null});}}/>
            {m.value===null?<InputField label="Lý do chưa đo" value={m.unknownReason??''} onChangeText={unknownReason=>update(i,{unknownReason})}/>:null}
            <InputField label="Dụng cụ đo thực tế" value={m.instrument} onChangeText={instrument=>update(i,{instrument})}/>
            <InputField label="Phương pháp đo thực tế" value={m.method} onChangeText={method=>update(i,{method})}/>
            {m.latitude==null||m.longitude==null?<InputField label="Lý do chưa có tọa độ quan sát" value={m.locationReason??''} onChangeText={locationReason=>update(i,{locationReason})}/>:<Text>GPS quan sát trong hồ sơ máy chủ: {m.latitude}, {m.longitude}</Text>}
          </View>)}
          <Button variant="secondary" title="Lưu nháp số đo" disabled={busy||frozen} onPress={()=>void run('save')}/>
          <Text>Nhấn lưu nháp để giữ số đo khi đóng app. Không gán tọa độ task làm GPS quan sát.</Text>
          <Text>Đối chiếu vị trí thực tế (tùy chọn; máy chủ đánh giá readiness)</Text>
          <Text>Chỉ nhập dấu mốc bạn đã quan sát. Không lấy tọa độ hoặc ID nhiệm vụ thay bằng chứng vị trí.</Text>
          <Button variant="secondary" title="Đối chiếu dấu mốc tuyến / lý trình" disabled={busy||frozen} onPress={()=>setLocationProof({kind:'POSITION_CHECKLIST',checklist:'ROUTE_CHAINAGE_MARKINGS_CONFIRMED'})}/>
          <Button variant="secondary" title="Đối chiếu ký hiệu tấm bê tông" disabled={busy||frozen} onPress={()=>setLocationProof({kind:'POSITION_CHECKLIST',checklist:'SLAB_MARKINGS_CONFIRMED'})}/>
          <Button variant="secondary" title="Chưa xác định vị trí" disabled={busy||frozen} onPress={()=>{setLocationProof(null);setChainage('');}}/>
          {locationProof?.checklist==='ROUTE_CHAINAGE_MARKINGS_CONFIRMED'?<>
            <InputField label="Route version ID trên dấu mốc / hồ sơ đối chiếu" value={locationProof.observedRouteVersionId??''} onChangeText={value=>{if(!busy&&!frozen)setLocationProof({...locationProof,observedRouteVersionId:value});}}/>
            <InputField label="Lý trình quan sát thực tế (m)" value={chainage} keyboardType="decimal-pad" onChangeText={value=>{if(!busy&&!frozen)setChainage(value);}}/>
          </>:null}
          {locationProof?.checklist==='SLAB_MARKINGS_CONFIRMED'?<InputField label="Ký hiệu tấm đã đối chiếu thực tế" value={locationProof.observedSlabId??''} onChangeText={value=>{if(!busy&&!frozen)setLocationProof({...locationProof,observedSlabId:value});}}/>:null}
        </Card>
        <Card style={styles.card}><Text style={styles.sectionTitle}>Ảnh bằng chứng</Text>
          {!draft.captures.length?<Text>Chưa có ảnh nháp của phiên và nhiệm vụ này.</Text>:null}
          {draft.captures.map(c=><Text key={c.id}>{c.purpose} • {c.verified?'VERIFIED từ máy chủ':'Chưa VERIFIED'} • {c.coordinates?'Có GPS camera':'Không có GPS quan sát'}</Text>)}
          {captureBlock?<Text>{captureBlock}</Text>:null}
          <Button variant="secondary" title="Chụp / chọn ảnh FIELD" disabled={busy||frozen||!!captureBlock} onPress={()=>router.push({pathname:'/(crew)/viewfinder',params:{id:task.id,projectId:task.projectId,mode:draft.repairClaim?'AFTER':'BEFORE'}})}/>
          <Button variant="secondary" title="Upload / kiểm tra VERIFIED" disabled={busy||frozen||!draft.captures.length||!!captureBlock} onPress={()=>void run('upload')}/>
        </Card>
        {block?<Text>{block}</Text>:null}
        {normalMeasurement?<Text>Với NORMAL, lưu số đo và upload ảnh để đánh giá trước sửa tại chi tiết nhiệm vụ. Chỉ lập hồ sơ REPAIR_CLAIM sau khi kết thúc thi công; không gửi nhầm lượt MEASUREMENT làm hồ sơ sửa chữa.</Text>:null}
        <Button variant="primary" title={draft.repairClaim?'Gửi hồ sơ sửa chữa FIELD':latest?'Gửi bổ sung FIELD':'Gửi hồ sơ FIELD'} loading={busy} disabled={busy||frozen||normalMeasurement||!!block||!measurements.length||(!draft.captures.length&&!latest?.evidence?.length)||draft.captures.some(c=>!c.verified)} onPress={()=>void run('submit')}/>
        {fieldDraftPending(draft)?<Button variant="secondary" title="Đối soát / gửi lại đúng lệnh đã lưu" disabled={busy} onPress={()=>void run('replay')}/>:null}
        {!draft.repairClaim&&draft.command&&['confirmed','rejected'].includes(draft.command.phase)?<Button variant="secondary" title="Đã xem kết quả — tạo nháp mới" disabled={busy} onPress={()=>void run('new')}/>:null}
        {draft.repairClaim&&draft.command?.phase==='confirmed'?<Button variant="secondary" title="Về chi tiết để nộp hồ sơ chờ PM" disabled={busy} onPress={()=>router.push({pathname:'/(crew)/wo-detail',params:{id:task.id,projectId:task.projectId}})}/>:null}
        {draft.result?<Card><Text>{draft.result.readiness}</Text>{(draft.result.missingReasons??[]).map(r=><Text key={r}>{r}</Text>)}</Card>:null}
      </>:null}
      {notice?<Text accessibilityLiveRegion="polite">{notice}</Text>:null}
    </ScrollView>
  </SafeAreaScreen>;
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xl,
  },
  card: {
    marginBottom: spacing.md,
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
});

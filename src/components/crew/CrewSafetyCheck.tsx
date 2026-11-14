import React, { useEffect, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Button } from '../Button';
import { InputField } from '../InputField';
import { colors, spacing, typography } from '../../design-tokens';
import { crewReadGuard, readSafetyMeasure, type RepairSafetyResource, type SafetyCommand } from '../../api/crewSafetyWorkflow';
import { prepareSafetyIntent, dispatchSafetyIntent, reconcileSafetyIntent } from '../../api/crewSafetyDraft';
import { openOfflineJournal, type OfflineJournalRecord } from '../../api/crewOfflineJournal';
import { downloadFieldEvidenceReal, getFieldEvidenceReal } from '../../api/crewApi';
import { bytesToBase64 } from '../../utils/base64';
import { sameQueueIdentity, type QueueIdentity } from '../../offline/upload-queue';

type CheckResult='Safe'|'NeedsReplacement'|'Danger';
const results:{value:CheckResult;label:string;icon:'verified-user'|'build'|'warning';color:string}[]=[
  {value:'Safe',label:'An toàn',icon:'verified-user',color:'#247348'},
  {value:'NeedsReplacement',label:'Cần thay thế',icon:'build',color:'#8B6500'},
  {value:'Danger',label:'Nguy hiểm',icon:'warning',color:'#B3261E'},
];
/** Private previews stay in memory; only server-discovered links can be selected. */
export function CrewSafetyCheck({identity,resource,taskId,onClose,onSaved}:{identity:QueueIdentity;resource:RepairSafetyResource;taskId:string;onClose:()=>void;onSaved:()=>void}) {
  const [result,setResult]=useState<CheckResult|null>(null),[findings,setFindings]=useState('');
  const [links,setLinks]=useState<{evidenceLinkId:string;fileId:string}[]>([]),[selected,setSelected]=useState<string[]>([]);
  const [previews,setPreviews]=useState<Record<string,string>>({}),[previewBusy,setPreviewBusy]=useState<string|null>(null);
  const [busy,setBusy]=useState(true),[blocked,setBlocked]=useState(false),[done,setDone]=useState(false),[message,setMessage]=useState('');
  const [pending,setPending]=useState<OfflineJournalRecord|null>(null);
  const mounted=useRef(true),lock=useRef(false),previewLock=useRef(false);
  useEffect(()=>{mounted.current=true;void(async()=>{
    try {
      const records=await(await openOfflineJournal(identity)).list();crewReadGuard(identity);
      const old=records.find(r=>r.proof.kind==='safety'&&(r.proof.resource as RepairSafetyResource)?.measureId===resource.measureId&&!['RECONCILED','REJECTED','CONFLICT'].includes(r.phase));
      const view=await readSafetyMeasure(identity,resource);crewReadGuard(identity);if(!mounted.current)return;
      if(old){const own=sameQueueIdentity(old.identity,identity)&&(old.proof.command as SafetyCommand)?.kind==='check';setPending(old);setBlocked(!own);
        setMessage(own?'Lần gửi trước đang chờ đối soát. Nội dung được giữ nguyên.':'Có lần gửi khác cần đối soát trước. Dữ liệu vẫn được giữ trên máy.');}
      else if(!view.data.installedAt){setBlocked(true);setMessage('Xác nhận lắp đặt trước khi gửi kiểm tra.');}
      const unique=new Map<string,{evidenceLinkId:string;fileId:string}>();for(const link of view.data.eligibleEvidenceLinks??[])if(!unique.has(link.fileId.toLowerCase()))unique.set(link.fileId.toLowerCase(),link);
      setLinks([...unique.values()]);
    }catch{if(mounted.current){setBlocked(true);setMessage('Chưa tải được trạng thái. Đóng và mở lại để thử.');}}
    finally{if(mounted.current)setBusy(false);}
  })();return()=>{mounted.current=false;};},[identity,resource]);
  const preview=async(fileId:string)=>{
    if(previewLock.current||previews[fileId])return;previewLock.current=true;setPreviewBusy(fileId);
    try {
      crewReadGuard(identity);const meta=await getFieldEvidenceReal(resource.projectId,taskId,fileId);crewReadGuard(identity);
      if(meta.fileId!==fileId||meta.state!=='VERIFIED'||!['image/jpeg','image/png','image/webp'].includes(meta.mediaType)||meta.sizeBytes>12*1024*1024)throw Error('preview_unavailable');
      const bytes=await downloadFieldEvidenceReal(resource.projectId,taskId,fileId);crewReadGuard(identity);
      if(bytes.length!==meta.sizeBytes)throw Error('preview_unavailable');
      if(mounted.current)setPreviews(old=>({...old,[fileId]:`data:${meta.mediaType};base64,${bytesToBase64(bytes)}`}));
    }catch{if(mounted.current&&sameQueueIdentity(identity))setMessage('Chưa mở được ảnh xem trước. Vui lòng thử lại.');}
    finally{previewLock.current=false;if(mounted.current)setPreviewBusy(null);}
  };
  const send=async()=>{
    if(lock.current||blocked||done)return;lock.current=true;setBusy(true);setMessage('');
    try {
      crewReadGuard(identity);let record=pending;
      if(!record){if(!result||!findings.trim()||findings.trim().length>2000||!selected.length)throw Error('form_invalid');
        record=await prepareSafetyIntent(identity,resource,{kind:'check',result,findings:findings.trim(),evidenceIds:[...selected]});
        if(mounted.current)setPending(record);}
      if(record.phase==='IN_FLIGHT')record=await(await openOfflineJournal(identity)).transition(record,'UNKNOWN_OUTCOME');
      if(record.phase!=='RECEIVED')record=await dispatchSafetyIntent(record);
      if(mounted.current)setPending(record);await reconcileSafetyIntent(record);crewReadGuard(identity);
      if(mounted.current){setDone(true);setPending(null);setMessage('Đã gửi kiểm tra an toàn.');onSaved();}
    }catch(e){if(mounted.current&&sameQueueIdentity(identity)){
      const code=(e as Error).message;
      if(code==='form_invalid')setMessage('Chọn kết quả, ghi nhận hiện trường và ít nhất một ảnh. Ghi nhận tối đa 2.000 ký tự.');
      else {
        let own:OfflineJournalRecord|undefined;
        try {const records=await(await openOfflineJournal(identity)).list();crewReadGuard(identity);
          own=[...records].reverse().find(r=>r.proof.kind==='safety'&&(r.proof.command as SafetyCommand)?.kind==='check'&&(r.proof.resource as RepairSafetyResource)?.measureId===resource.measureId&&sameQueueIdentity(r.identity,identity)&&r.phase!=='RECONCILED');
        }catch{/* Original journal remains available for a later reconciliation. */}
        if(mounted.current){if(own){setPending(own);if(['CONFLICT','REJECTED'].includes(own.phase))setBlocked(true);}
          setMessage(own&&['CONFLICT','REJECTED'].includes(own.phase)?'Lần kiểm tra chưa được chấp nhận. Đóng và tải lại hồ sơ để xem trạng thái mới.':code==='safety_evidence_not_current'?'Ảnh đủ điều kiện đã thay đổi. Đóng và mở lại để chọn ảnh.':'Chưa xác nhận được kết quả. Lần gửi vẫn được giữ để đối soát.');}
      }
    }}finally{lock.current=false;if(mounted.current)setBusy(false);}
  };
  const saved=pending?.proof.command as Extract<SafetyCommand,{kind:'check'}>|undefined;
  const editable=!busy&&!blocked&&!pending&&!done;
  return <Modal visible animationType="slide" onRequestClose={()=>{if(!busy)onClose();}}>
    <SafeAreaView style={styles.screen}><KeyboardAvoidingView style={styles.screen} behavior={Platform.OS==='ios'?'padding':undefined}>
      <View style={styles.header}><Text style={[typography.titleLg,styles.flex]}>Kiểm tra an toàn</Text><Button variant="text" title="Đóng" disabled={busy} onPress={onClose}/></View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
        {!pending&&!done?<>
          <View style={styles.card}><Text style={typography.titleMd}>Kết quả hiện trường</Text>
            {results.map(option=><Pressable key={option.value} accessibilityRole="radio" accessibilityState={{checked:result===option.value,disabled:!editable}} disabled={!editable} onPress={()=>setResult(option.value)} style={[styles.option,result===option.value&&styles.selected]}>
              <MaterialIcons name={option.icon} size={24} color={option.color}/><Text style={[typography.labelLg,styles.flex]}>{option.label}</Text><MaterialIcons name={result===option.value?'radio-button-checked':'radio-button-unchecked'} size={24} color={colors.secondary}/>
            </Pressable>)}
            <InputField label="Ghi nhận hiện trường" multiline value={findings} onChangeText={value=>{if(editable)setFindings(value);}} placeholder="Tình trạng biện pháp tại thời điểm kiểm tra"/>
          </View>
          <View style={styles.card}><Text style={typography.titleMd}>Ảnh kiểm tra · {selected.length}/20</Text>
            {!links.length?<Text style={styles.hint}>Chưa có ảnh hiện trường đủ điều kiện. Bổ sung ảnh trong hồ sơ hiện trường khi nhiệm vụ cho phép, rồi mở lại màn này.</Text>:<>
              <Text style={styles.hint}>Mở ảnh để xem trước, đánh dấu ảnh dùng cho lần kiểm tra.</Text>
              <View style={styles.grid}>{links.map((link,index)=><View key={link.fileId} style={styles.photo}>
                <Pressable accessibilityRole="button" accessibilityLabel={`Xem ảnh ${index+1}`} disabled={!editable||previewBusy!==null} onPress={()=>void preview(link.fileId)} style={styles.preview}>
                  {previews[link.fileId]?<Image source={{uri:previews[link.fileId]}} style={styles.image}/>:<MaterialIcons name="image" size={36} color={colors.secondary}/>}
                  <Text style={styles.photoLabel}>{previewBusy===link.fileId?'Đang tải…':`Ảnh ${index+1}`}</Text>
                </Pressable>
                <Pressable accessibilityRole="checkbox" accessibilityLabel={`Chọn ảnh ${index+1}`} accessibilityState={{checked:selected.includes(link.evidenceLinkId),disabled:!editable}} disabled={!editable} onPress={()=>setSelected(old=>old.includes(link.evidenceLinkId)?old.filter(id=>id!==link.evidenceLinkId):old.length<20?[...old,link.evidenceLinkId]:old)} style={styles.choose}>
                  <MaterialIcons name={selected.includes(link.evidenceLinkId)?'check-box':'check-box-outline-blank'} color={colors.brandGold} size={24}/><Text style={typography.labelLg}>Chọn ảnh</Text>
                </Pressable>
              </View>)}</View>
            </>}
          </View>
        </>:null}
        <View style={styles.card}>
          {saved?<><Text style={typography.titleMd}>{results.find(r=>r.value===saved.result)?.label}</Text><Text style={styles.hint}>{saved.findings}</Text><Text style={styles.hint}>{saved.evidenceIds?.length??0} ảnh trong lần gửi</Text></>:null}
          {message?<Text accessibilityLiveRegion="polite" style={styles.notice}>{message}</Text>:null}
          {!done?<Button variant="primary" title={pending?'Đối soát lần gửi':'Gửi kiểm tra'} loading={busy} disabled={blocked||(!pending&&!links.length)} onPress={()=>void send()}/>:null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView></SafeAreaView>
  </Modal>;
}
const styles=StyleSheet.create({screen:{flex:1,backgroundColor:colors.surfaceAlt},flex:{flex:1,minWidth:0},header:{flexDirection:'row',alignItems:'center',padding:spacing.md,gap:spacing.sm,backgroundColor:colors.surface},body:{padding:spacing.md,gap:spacing.md},card:{padding:spacing.md,borderWidth:1,borderColor:'#E8D9A8',borderRadius:12,backgroundColor:colors.surface,gap:spacing.md},hint:{...typography.bodyMd,color:colors.secondary},notice:{...typography.bodyMd,padding:spacing.md,backgroundColor:colors.surfaceAlt,borderRadius:8},option:{flexDirection:'row',alignItems:'center',gap:spacing.sm,padding:spacing.md,borderRadius:10,borderWidth:1,borderColor:colors.border},selected:{backgroundColor:'#FFF9E8',borderColor:'#C9A227'},grid:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm},photo:{width:'47%',borderWidth:1,borderColor:'#E8D9A8',borderRadius:10,overflow:'hidden'},preview:{aspectRatio:1,alignItems:'center',justifyContent:'center',backgroundColor:colors.surfaceAlt},image:{position:'absolute',top:0,left:0,right:0,bottom:0},photoLabel:{position:'absolute',bottom:8,left:8,backgroundColor:colors.surface,padding:4,borderRadius:4,...typography.caption},choose:{flexDirection:'row',alignItems:'center',justifyContent:'center',minHeight:48,gap:spacing.xs}});

import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Button } from '../Button';
import { InputField } from '../InputField';
import { colors, spacing, typography } from '../../design-tokens';
import { crewReadGuard, readSafetyMeasure, type RepairSafetyResource, type SafetyCommand, type SafetyView } from '../../api/crewSafetyWorkflow';
import { prepareSafetyIntent, dispatchSafetyIntent, reconcileSafetyIntent } from '../../api/crewSafetyDraft';
import { openOfflineJournal, type OfflineJournalRecord } from '../../api/crewOfflineJournal';
import { sameQueueIdentity, type QueueIdentity } from '../../offline/upload-queue';
import { crewHistoryTime } from './CrewTaskFacts';

/** Acknowledges receipt of a warning; it does not declare that the danger has been resolved. */
export function CrewSafetyAcknowledgement({identity,resource,warningId,onClose,onSaved}:{identity:QueueIdentity;resource:RepairSafetyResource;warningId:string;onClose:()=>void;onSaved:()=>void}) {
  const [warning,setWarning]=useState<SafetyView['warnings'][number]|null>(null);
  const [reason,setReason]=useState(''),[busy,setBusy]=useState(true),[blocked,setBlocked]=useState(false),[done,setDone]=useState(false),[message,setMessage]=useState('');
  const [pending,setPending]=useState<OfflineJournalRecord|null>(null);
  const mounted=useRef(true),lock=useRef(false);
  useEffect(()=>{mounted.current=true;void(async()=>{
    try {
      const records=await(await openOfflineJournal(identity)).list();crewReadGuard(identity);
      const old=records.find(r=>r.proof.kind==='safety'&&(r.proof.resource as RepairSafetyResource)?.measureId===resource.measureId&&!['RECONCILED','REJECTED','CONFLICT'].includes(r.phase));
      const view=await readSafetyMeasure(identity,resource);crewReadGuard(identity);if(!mounted.current)return;
      const current=view.data.warnings.find(w=>w.id===warningId&&w.intendedActorId===identity.actor);setWarning(current??null);
      if(old){const command=old.proof.command as SafetyCommand;
        const own=sameQueueIdentity(old.identity,identity)&&command.kind==='acknowledgement'&&command.warningId===warningId;
        setPending(old);setBlocked(!own);setMessage(own?'Lần gửi trước đang chờ đối soát. Nội dung được giữ nguyên.':'Có lần gửi khác cần đối soát trước. Dữ liệu vẫn được giữ trên máy.');
      }else if(!current){setBlocked(true);setMessage('Cảnh báo không còn thuộc phạm vi phụ trách. Tải lại hồ sơ.');}
      else if(view.data.acknowledgements.some(a=>a.warningId===warningId)){setDone(true);setMessage('Cảnh báo đã được xác nhận tiếp nhận.');}
    }catch{if(mounted.current){setBlocked(true);setMessage('Chưa tải được cảnh báo. Đóng và mở lại để thử.');}}
    finally{if(mounted.current)setBusy(false);}
  })();return()=>{mounted.current=false;};},[identity,resource,warningId]);
  const send=async()=>{
    if(lock.current||blocked||done)return;lock.current=true;setBusy(true);setMessage('');
    try {
      crewReadGuard(identity);let record=pending;
      if(!record){if(!reason.trim()||reason.trim().length>2000)throw Error('form_invalid');
        record=await prepareSafetyIntent(identity,resource,{kind:'acknowledgement',warningId,reason:reason.trim()});if(mounted.current)setPending(record);}
      if(record.phase==='IN_FLIGHT')record=await(await openOfflineJournal(identity)).transition(record,'UNKNOWN_OUTCOME');
      if(record.phase!=='RECEIVED')record=await dispatchSafetyIntent(record);
      if(mounted.current)setPending(record);await reconcileSafetyIntent(record);crewReadGuard(identity);
      if(mounted.current){setDone(true);setPending(null);setMessage('Đã xác nhận tiếp nhận cảnh báo.');onSaved();}
    }catch(e){if(mounted.current&&sameQueueIdentity(identity)){
      if((e as Error).message==='form_invalid')setMessage('Nhập ghi chú tiếp nhận, tối đa 2.000 ký tự.');
      else {
        let own:OfflineJournalRecord|undefined;
        try{const records=await(await openOfflineJournal(identity)).list();crewReadGuard(identity);
          own=[...records].reverse().find(r=>{const c=r.proof.command as SafetyCommand;return r.proof.kind==='safety'&&(r.proof.resource as RepairSafetyResource)?.measureId===resource.measureId&&c.kind==='acknowledgement'&&c.warningId===warningId&&sameQueueIdentity(r.identity,identity)&&r.phase!=='RECONCILED';});
        }catch{/* Keep the original durable command intact. */}
        if(mounted.current){if(own){setPending(own);if(['CONFLICT','REJECTED'].includes(own.phase))setBlocked(true);}
          if((e as Error).message==='safety_warning_not_current'){setBlocked(true);setMessage('Trạng thái cảnh báo đã thay đổi. Đóng và tải lại hồ sơ.');}
          else setMessage(own&&['CONFLICT','REJECTED'].includes(own.phase)?'Lần gửi chưa được chấp nhận. Đóng và tải lại hồ sơ.':'Chưa xác nhận được kết quả. Lần gửi được giữ để đối soát.');}
      }
    }}finally{lock.current=false;if(mounted.current)setBusy(false);}
  };
  const saved=pending?.proof.command as Extract<SafetyCommand,{kind:'acknowledgement'}>|undefined;
  return <Modal visible animationType="slide" onRequestClose={()=>{if(!busy)onClose();}}>
    <SafeAreaView style={styles.screen}><KeyboardAvoidingView style={styles.screen} behavior={Platform.OS==='ios'?'padding':undefined}>
      <View style={styles.header}><Text style={[typography.titleLg,styles.flex]}>Tiếp nhận cảnh báo</Text><Button variant="text" title="Đóng" disabled={busy} onPress={onClose}/></View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
        <View style={styles.card}>
          <View style={styles.heading}><MaterialIcons name="warning" size={24} color="#B3261E"/><Text style={[typography.titleMd,styles.flex]}>Cảnh báo an toàn</Text></View>
          {warning?<><Text style={typography.bodyMd}>{warning.reason}</Text><Text style={styles.hint}>Hạn tiếp nhận: {crewHistoryTime(warning.originalDueAt)}</Text></>:null}
          {!done?<Text style={styles.hint}>Xác nhận đã nhận cảnh báo; việc khắc phục vẫn cần thực hiện tại hiện trường.</Text>:null}
          {!pending&&!done?<InputField label="Ghi chú tiếp nhận" multiline value={reason} onChangeText={v=>{if(!busy&&!blocked)setReason(v);}} placeholder="Ghi nhận khi tiếp nhận cảnh báo"/>:null}
          {saved?<Text style={typography.bodyMd}>{saved.reason}</Text>:null}
          {message?<Text accessibilityLiveRegion="polite" style={styles.notice}>{message}</Text>:null}
          {!done?<Button variant="primary" title={pending?'Đối soát lần gửi':'Xác nhận đã nhận'} disabled={blocked} loading={busy} onPress={()=>void send()}/>:null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView></SafeAreaView>
  </Modal>;
}
const styles=StyleSheet.create({screen:{flex:1,backgroundColor:colors.surfaceAlt},flex:{flex:1,minWidth:0},header:{flexDirection:'row',alignItems:'center',padding:spacing.md,gap:spacing.sm,backgroundColor:colors.surface},body:{padding:spacing.md},card:{padding:spacing.md,borderWidth:1,borderColor:'#E8D9A8',borderRadius:12,backgroundColor:colors.surface,gap:spacing.md},heading:{flexDirection:'row',alignItems:'center',gap:spacing.sm},hint:{...typography.bodyMd,color:colors.secondary},notice:{...typography.bodyMd,padding:spacing.md,backgroundColor:colors.surfaceAlt,borderRadius:8}});

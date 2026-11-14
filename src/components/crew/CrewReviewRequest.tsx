import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Button } from '../Button';
import { InputField } from '../InputField';
import { colors, spacing, typography } from '../../design-tokens';
import { readReviewSource, prepareReviewRequest, dispatchReviewRequest, reconcileReviewRequest, type ReviewResource } from '../../api/crewReviewRequest';
import { crewReadGuard } from '../../api/crewSafetyWorkflow';
import { openOfflineJournal, type OfflineJournalRecord } from '../../api/crewOfflineJournal';
import { sameQueueIdentity, type QueueIdentity } from '../../offline/upload-queue';
import { crewHistoryTime } from './CrewTaskFacts';

export function CrewReviewRequest({identity,resource,onClose,onSaved}:{identity:QueueIdentity;resource:ReviewResource;onClose:()=>void;onSaved:()=>void}) {
  const [decision,setDecision]=useState<Awaited<ReturnType<typeof readReviewSource>>['context']['finalDecision']>(null);
  const [reason,setReason]=useState(''),[busy,setBusy]=useState(true),[blocked,setBlocked]=useState(false),[done,setDone]=useState(false),[message,setMessage]=useState('');
  const [pending,setPending]=useState<OfflineJournalRecord|null>(null);
  const mounted=useRef(true),lock=useRef(false);
  useEffect(()=>{mounted.current=true;void(async()=>{
    try {
      const records=await(await openOfflineJournal(identity)).list();crewReadGuard(identity);
      const old=records.find(r=>r.proof.kind==='review-request'&&(r.proof.resource as ReviewResource)?.itemId===resource.itemId&&!['RECONCILED','REJECTED','CONFLICT'].includes(r.phase));
      const view=await readReviewSource(identity,resource);crewReadGuard(identity);if(!mounted.current)return;
      setDecision(view.context.finalDecision);
      if(old){const own=sameQueueIdentity(old.identity,identity);setPending(old);setBlocked(!own);
        setMessage(own?'Lần gửi trước đang chờ đối soát. Nội dung được giữ nguyên.':'Có lần gửi từ phiên trước cần đối soát. Dữ liệu vẫn được giữ trên máy.');}
      else if(!view.context.finalDecision){setBlocked(true);setMessage('Chưa có quyết định cuối để yêu cầu xem xét.');}
    }catch{if(mounted.current){setBlocked(true);setMessage('Chưa tải được quyết định. Đóng và tải lại hồ sơ.');}}
    finally{if(mounted.current)setBusy(false);}
  })();return()=>{mounted.current=false;};},[identity,resource]);
  const send=async()=>{
    if(lock.current||blocked||done)return;lock.current=true;setBusy(true);setMessage('');
    try {
      crewReadGuard(identity);let record=pending;
      if(!record){if(!decision||!reason.trim()||reason.trim().length>2000)throw Error('review_form_invalid');
        record=await prepareReviewRequest(identity,resource,decision.decisionId,reason.trim());if(mounted.current)setPending(record);}
      if(record.phase==='IN_FLIGHT')record=await(await openOfflineJournal(identity)).transition(record,'UNKNOWN_OUTCOME');
      if(record.phase!=='RECEIVED')record=await dispatchReviewRequest(record);
      if(mounted.current)setPending(record);await reconcileReviewRequest(record);crewReadGuard(identity);
      if(mounted.current){setDone(true);setPending(null);setMessage('Đã gửi yêu cầu xem xét lại.');onSaved();}
    }catch(e){if(mounted.current&&sameQueueIdentity(identity)){
      const code=(e as Error).message;
      if(code==='review_form_invalid')setMessage('Nhập lý do đề nghị xem xét, tối đa 2.000 ký tự.');
      else {
        let old:OfflineJournalRecord|undefined;
        try{const records=await(await openOfflineJournal(identity)).list();crewReadGuard(identity);
          old=[...records].reverse().find(r=>r.proof.kind==='review-request'&&(r.proof.resource as ReviewResource)?.itemId===resource.itemId&&sameQueueIdentity(r.identity,identity)&&r.phase!=='RECONCILED');
        }catch{/* Preserve the immutable original command. */}
        if(mounted.current){if(old)setPending(old);
          if(['review_decision_changed','review_source_changed'].includes(code)||old&&['CONFLICT','REJECTED'].includes(old.phase)){
            setBlocked(true);setMessage('Hồ sơ đã thay đổi hoặc yêu cầu chưa được chấp nhận. Đóng và tải lại để xem quyết định hiện hành.');
          }else setMessage('Chưa xác nhận được kết quả. Lần gửi được giữ để đối soát.');}
      }
    }}finally{lock.current=false;if(mounted.current)setBusy(false);}
  };
  return <Modal visible animationType="slide" onRequestClose={()=>{if(!busy)onClose();}}>
    <SafeAreaView style={styles.screen}><KeyboardAvoidingView style={styles.screen} behavior={Platform.OS==='ios'?'padding':undefined}>
      <View style={styles.header}><Text style={[typography.titleLg,styles.flex]}>Yêu cầu xem xét lại</Text><Button variant="text" title="Đóng" disabled={busy} onPress={onClose}/></View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
        <View style={styles.card}>
          <View style={styles.heading}><MaterialIcons name="rate-review" size={24} color={colors.brandGold}/><Text style={[typography.titleMd,styles.flex]}>Quyết định hiện hành</Text></View>
          {decision?<><Text style={typography.bodyMd}>{decision.result==='CONFIRMED'?'Đã xác nhận kết quả':'Đã có quyết định từ quản lý'}</Text><Text style={styles.hint}>{crewHistoryTime(decision.at)}</Text></>:null}
          {!pending&&!done?<InputField label="Lý do đề nghị xem xét" multiline value={reason} onChangeText={v=>{if(!busy&&!blocked)setReason(v);}} placeholder="Nêu rõ nội dung cần quản lý xem xét lại"/>:null}
          {pending?<Text style={typography.bodyMd}>{(JSON.parse(pending.body) as {reason:string}).reason}</Text>:null}
          {message?<Text accessibilityLiveRegion="polite" style={styles.notice}>{message}</Text>:null}
          {!done?<Button variant="primary" title={pending?'Đối soát lần gửi':'Gửi yêu cầu'} disabled={blocked} loading={busy} onPress={()=>void send()}/>:null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView></SafeAreaView>
  </Modal>;
}
const styles=StyleSheet.create({screen:{flex:1,backgroundColor:colors.surfaceAlt},flex:{flex:1,minWidth:0},header:{flexDirection:'row',alignItems:'center',padding:spacing.md,gap:spacing.sm,backgroundColor:colors.surface},body:{padding:spacing.md},card:{padding:spacing.md,borderWidth:1,borderColor:'#E8D9A8',borderRadius:12,backgroundColor:colors.surface,gap:spacing.md},heading:{flexDirection:'row',alignItems:'center',gap:spacing.sm},hint:{...typography.bodyMd,color:colors.secondary},notice:{...typography.bodyMd,padding:spacing.md,backgroundColor:colors.surfaceAlt,borderRadius:8}});

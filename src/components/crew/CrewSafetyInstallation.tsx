import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../Button';
import { InputField } from '../InputField';
import { colors, spacing, typography } from '../../design-tokens';
import { crewReadGuard, readSafetyMeasure, type RepairSafetyResource } from '../../api/crewSafetyWorkflow';
import { prepareSafetyIntent, dispatchSafetyIntent, reconcileSafetyIntent } from '../../api/crewSafetyDraft';
import { openOfflineJournal, type OfflineJournalRecord } from '../../api/crewOfflineJournal';
import { sameQueueIdentity, type QueueIdentity } from '../../offline/upload-queue';

/** A short focused form; pending commands retain their original payload and monitoring version. */
export function CrewSafetyInstallation({identity,resource,onClose,onSaved}:{identity:QueueIdentity;resource:RepairSafetyResource;onClose:()=>void;onSaved:()=>void}) {
  const [hours,setHours]=useState(''),[reason,setReason]=useState(''),[busy,setBusy]=useState(true),[message,setMessage]=useState('');
  const [pending,setPending]=useState<OfflineJournalRecord|null>(null),[blocked,setBlocked]=useState(false),[done,setDone]=useState(false);
  const mounted=useRef(true),lock=useRef(false);
  useEffect(()=>{mounted.current=true;void (async()=>{
    try {const j=await openOfflineJournal(identity),records=await j.list();crewReadGuard(identity);
      const old=records.find(r=>r.proof.kind==='safety'&&(r.proof.resource as RepairSafetyResource)?.measureId===resource.measureId&&!['RECONCILED','REJECTED','CONFLICT'].includes(r.phase));
      const view=await readSafetyMeasure(identity,resource);crewReadGuard(identity);
      if(!mounted.current)return;
      if(old){setPending(old);const same=sameQueueIdentity(old.identity,identity)&&(old.proof.command as {kind?:string})?.kind==='installation';setBlocked(!same);
        setMessage(same?'Có lần gửi chưa đối soát. Tiếp tục sẽ giữ nguyên nội dung đã lưu.':'Có lần gửi từ phiên đăng nhập trước cần đối soát. Dữ liệu vẫn được giữ trên máy.');}
      else if(view.data.installedAt){setDone(true);setMessage('Biện pháp đã được xác nhận lắp đặt.');}
    }catch{if(mounted.current){setBlocked(true);setMessage('Chưa tải được trạng thái. Đóng và mở lại để thử.');}}
    finally{if(mounted.current)setBusy(false);}
  })();return()=>{mounted.current=false;};},[identity,resource]);
  const send=async()=>{
    if(lock.current||blocked)return;lock.current=true;setBusy(true);setMessage('');
    try {
      crewReadGuard(identity);let record=pending;
      if(!record){const n=Number(hours.replace(',','.'));if(!Number.isFinite(n)||n<=0||n>=24||!reason.trim())throw Error('form_invalid');
        record=await prepareSafetyIntent(identity,resource,{kind:'installation',firstCheckDueAt:new Date(Date.now()+n*3600000).toISOString(),reason:reason.trim()});
        if(mounted.current)setPending(record);
      }
      if(record.phase==='IN_FLIGHT')record=await (await openOfflineJournal(identity)).transition(record,'UNKNOWN_OUTCOME');
      if(record.phase!=='RECEIVED')record=await dispatchSafetyIntent(record);
      if(mounted.current)setPending(record);
      await reconcileSafetyIntent(record);crewReadGuard(identity);
      if(mounted.current){setPending(null);setDone(true);setMessage('Đã xác nhận lắp đặt.');onSaved();}
    }catch(e){if(mounted.current&&sameQueueIdentity(identity)){
      const code=(e as Error).message;
      if(code==='form_invalid'||code==='safety_due_date_range')setMessage('Nhập ghi chú và thời gian kiểm tra lớn hơn 0, nhỏ hơn 24 giờ.');
      else {try{const records=await (await openOfflineJournal(identity)).list();crewReadGuard(identity);
        const own=records.find(r=>r.proof.kind==='safety'&&(r.proof.resource as RepairSafetyResource)?.measureId===resource.measureId&&sameQueueIdentity(r.identity,identity)&&r.phase!=='RECONCILED');
        if(mounted.current&&own){setPending(own);if(['CONFLICT','REJECTED'].includes(own.phase))setBlocked(true);}
      }catch{/* Keep journal and original owner intact. */}
      if(mounted.current)setMessage(code==='safety_already_installed'?'Biện pháp đã được lắp đặt. Đóng và tải lại hồ sơ.':code==='safety_pending_command'?'Có lần gửi đang chờ đối soát. Đóng và mở lại để tiếp tục.':'Chưa xác nhận được kết quả. Dữ liệu gửi vẫn được giữ; kiểm tra lại trước khi gửi tiếp.');}
    }}finally{lock.current=false;if(mounted.current)setBusy(false);}
  };
  return <Modal visible animationType="slide" onRequestClose={()=>{if(!busy)onClose();}}>
    <SafeAreaView style={styles.screen}><KeyboardAvoidingView style={styles.screen} behavior={Platform.OS==='ios'?'padding':undefined}>
      <View style={styles.header}><Text style={[typography.titleLg,styles.flex]}>Xác nhận lắp đặt</Text><Button variant="text" title="Đóng" disabled={busy} onPress={onClose}/></View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
        <View style={styles.card}><Text style={typography.titleMd}>Biện pháp an toàn</Text>
          {!pending&&!done?<><Text style={styles.hint}>Xác nhận sau khi đã lắp đặt tại hiện trường.</Text>
            <InputField label="Kiểm tra lần đầu sau" value={hours} onChangeText={setHours} keyboardType="decimal-pad" unit="giờ" placeholder="Ví dụ: 4"/>
            <InputField label="Ghi chú lắp đặt" value={reason} onChangeText={setReason} multiline placeholder="Biện pháp đã thực hiện"/>
          </>:null}
          {pending?<Text style={styles.hint}>Hạn kiểm tra: {new Date(String((pending.proof.command as {firstCheckDueAt:string}).firstCheckDueAt)).toLocaleString('vi-VN')}</Text>:null}
          {message?<Text accessibilityLiveRegion="polite" style={styles.notice}>{message}</Text>:null}
          {!done?<Button variant="primary" title={pending?'Đối soát lần gửi':'Xác nhận đã lắp đặt'} loading={busy} disabled={blocked} onPress={()=>void send()}/>:null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView></SafeAreaView>
  </Modal>;
}
const styles=StyleSheet.create({screen:{flex:1,backgroundColor:colors.surfaceAlt},flex:{flex:1,minWidth:0},header:{flexDirection:'row',alignItems:'center',padding:spacing.md,gap:spacing.sm,backgroundColor:colors.surface},body:{padding:spacing.md},card:{padding:spacing.md,borderWidth:1,borderColor:'#E8D9A8',borderRadius:12,backgroundColor:colors.surface,gap:spacing.md},hint:{...typography.bodyMd,color:colors.secondary},notice:{...typography.bodyMd,padding:spacing.md,backgroundColor:colors.surfaceAlt,borderRadius:8}});

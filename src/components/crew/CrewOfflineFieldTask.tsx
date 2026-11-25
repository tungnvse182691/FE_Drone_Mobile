import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '../AppHeader';
import { SafeAreaScreen } from '../SafeAreaScreen';
import { Card } from '../Card';
import { Button } from '../Button';
import { colors, spacing, typography } from '../../design-tokens';
import { currentQueueIdentity, sameQueueIdentity } from '../../offline/upload-queue';
import { readOfflineFieldTask, prepareOfflineFieldStart } from '../../api/crewOfflineField';
import { openOfflineJournal, type OfflineJournalRecord } from '../../api/crewOfflineJournal';

/** Explicit snapshot screen, separate from online permission/error handling. */
export function CrewOfflineFieldTask({projectId,taskId}:{projectId:string;taskId:string}) {
  const router=useRouter(),[identity]=useState(currentQueueIdentity);
  const [source,setSource]=useState<Awaited<ReturnType<typeof readOfflineFieldTask>>|null>(null);
  const [record,setRecord]=useState<OfflineJournalRecord|null>(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  const live=useRef(true),running=useRef(false);
  useEffect(()=>{
    live.current=true;
    if(identity)void (async()=>{
      try {
        const loaded=await readOfflineFieldTask(identity,projectId,taskId);
        const rows=await (await openOfflineJournal(identity)).list();
        if(live.current&&sameQueueIdentity(identity)){
          setSource(loaded);setRecord(rows.find(r=>r.projectId===projectId&&r.proof.fieldStartTaskId===taskId)??null);
        }
      }catch {if(live.current&&identity&&sameQueueIdentity(identity))setNotice('Chưa đọc được dữ liệu offline hợp lệ. Dữ liệu hiện có được giữ nguyên.');}
    })();
    return()=>{live.current=false;};
  },[identity,projectId,taskId]);
  const prepare=async()=>{
    if(!identity||running.current||!sameQueueIdentity(identity))return;
    running.current=true;setBusy(true);setNotice('');
    try {
      const saved=await prepareOfflineFieldStart(identity,projectId,taskId);
      if(live.current&&sameQueueIdentity(identity)){setRecord(saved);setNotice('Đã lưu và ký trên thiết bị. Chưa gửi tới máy chủ; vào Đồng bộ khi có mạng.');}
    }catch {if(live.current&&sameQueueIdentity(identity))setNotice('Chưa lưu được thao tác mới. Kiểm tra Đồng bộ; không tạo lại lệnh đang chờ hoặc chưa rõ kết quả.');}
    finally{running.current=false;if(live.current&&sameQueueIdentity(identity))setBusy(false);}
  };
  if(!identity||!sameQueueIdentity(identity))return null;
  const state=String(source?.facts.status??'');
  return <SafeAreaScreen scroll header={<AppHeader subtitle="Nhiệm vụ offline" showBack fallbackRoute="/(crew)/sync"/>}>
    <Card style={styles.card}>
      <Text style={typography.titleLg}>Dữ liệu đã tải</Text>
      <Text selectable style={styles.body}>ID nhiệm vụ: {taskId.slice(0,8)}</Text>
      <Text style={styles.body}>{typeof source?.facts.instructions==='string'?source.facts.instructions:'Đang đọc dữ liệu nhiệm vụ…'}</Text>
      {source?<Text style={styles.caption}>Đã tải: {new Date(source.snapshot.downloadedAt).toLocaleString('vi-VN')}</Text>:null}
      <Text style={styles.caption}>Đây là bản đã lưu trên thiết bị. Máy chủ sẽ kiểm tra lại quyền, phân công và phiên bản khi đồng bộ.</Text>
    </Card>
    <Card style={styles.card}>
      <Text style={typography.titleMd}>Thao tác hiện trường</Text>
      {record?<>
        <Text accessibilityLiveRegion="polite" style={styles.body}>{record.phase==='RECONCILED'?'Máy chủ đã xác nhận thao tác nhận / bắt đầu.':'Đã có thao tác nhận / bắt đầu lưu trên thiết bị. Kiểm tra kết quả tại Đồng bộ.'}</Text>
        <Button title="Mở Đồng bộ" variant="secondary" onPress={()=>router.push('/(crew)/sync')}/>
      </>:source&&['NewAssigned','Accepted'].includes(state)?<>
        <Text style={styles.body}>{state==='NewAssigned'?'Lưu thao tác nhận và bắt đầu nhiệm vụ. Thứ tự hai thao tác được giữ trong gói ký.':'Lưu thao tác bắt đầu cho nhiệm vụ đã nhận.'}</Text>
        <Button title={state==='NewAssigned'?'Nhận và bắt đầu offline':'Bắt đầu offline'} variant="secondary" loading={busy} disabled={busy} onPress={()=>void prepare()}/>
      </>:<Text style={styles.body}>Bản dữ liệu này không cho phép tạo thao tác nhận / bắt đầu mới.</Text>}
      {notice?<Text accessibilityLiveRegion="polite" style={styles.body}>{notice}</Text>:null}
    </Card>
  </SafeAreaScreen>;
}
const styles=StyleSheet.create({card:{gap:spacing.sm,marginBottom:spacing.md},body:{...typography.bodyMd,color:colors.secondary},caption:{...typography.caption,color:colors.secondary}});

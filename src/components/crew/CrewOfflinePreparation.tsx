import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Card } from '../Card';
import { Button } from '../Button';
import { colors, spacing, typography } from '../../design-tokens';
import { currentQueueIdentity, sameQueueIdentity } from '../../offline/upload-queue';
import { downloadCrewOfflineTask } from '../../api/crewOfflinePreparation';
import { requireOfflineNativeAcceptance } from '../../api/crewOfflineWorkflow';

/** User initiated, scoped to the assigned task. No registration/mutation on mount. */
export function CrewOfflinePreparation({projectId,taskId}:{projectId:string;taskId:string}) {
  const [identity]=useState(currentQueueIdentity),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  const running=useRef(false),mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  if(!identity||!sameQueueIdentity(identity))return null;
  let available=true;
  try {requireOfflineNativeAcceptance(identity);}catch {available=false;}
  const download=async()=>{
    if(running.current||!sameQueueIdentity(identity))return;
    running.current=true;setBusy(true);setNotice('');
    try {
      await downloadCrewOfflineTask(identity,projectId,taskId);
      if(mounted.current&&sameQueueIdentity(identity))setNotice('Đã lưu dữ liệu nhiệm vụ được máy chủ xác nhận trên thiết bị.');
    }catch {
      if(mounted.current&&sameQueueIdentity(identity))setNotice('Chưa tải xong dữ liệu nhiệm vụ. Lệnh và dữ liệu đã lưu được giữ nguyên; kiểm tra kết nối và mục Đồng bộ trước khi thử lại.');
    }finally {running.current=false;if(mounted.current&&sameQueueIdentity(identity))setBusy(false);}
  };
  return <Card style={styles.card}>
    <Text style={typography.titleMd}>Chuẩn bị làm việc offline</Text>
    <Text style={styles.body}>{available?'Tải dữ liệu nhiệm vụ trước khi ra hiện trường. Ứng dụng đăng ký thiết bị và đối chiếu dữ liệu với máy chủ.':'Bản ứng dụng này chưa đủ điều kiện ký dữ liệu offline. Nháp hiện có vẫn được giữ nguyên.'}</Text>
    <Button title="Tải dữ liệu nhiệm vụ" variant="secondary" disabled={!available||busy} loading={busy} onPress={()=>void download()}/>
    {notice?<Text accessibilityLiveRegion="polite" style={styles.body}>{notice}</Text>:null}
  </Card>;
}
const styles=StyleSheet.create({card:{gap:spacing.sm,marginBottom:spacing.md},body:{...typography.bodyMd,color:colors.secondary}});

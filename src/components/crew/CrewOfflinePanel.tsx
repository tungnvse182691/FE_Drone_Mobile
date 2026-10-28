import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Card } from '../Card';
import { Button } from '../Button';
import { inspectOfflineDevice } from '../../api/crewOfflineDevice';
import { openOfflineJournal, type OfflineJournalRecord } from '../../api/crewOfflineJournal';
import { HANDOVER_GATE } from '../../api/crewOfflineWorkflow';
import { NATIVE_ACCEPTANCE_VERIFIED } from '../../../modules/roadguard-offline-crypto';
import { sameQueueIdentity, type QueueIdentity } from '../../offline/upload-queue';

/** Real Crew sync route, actor/session keyed by parent. Read never changes pending/legacy state. */
export function CrewOfflinePanel({identity}:{identity:QueueIdentity}) {
  const [probe,setProbe]=useState<Awaited<ReturnType<typeof inspectOfflineDevice>>|null>(null);
  const [records,setRecords]=useState<OfflineJournalRecord[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const sequence=useRef(0),running=useRef(false);
  useEffect(()=>()=>{sequence.current++;},[]);
  const refresh=async()=>{
    if(running.current||!sameQueueIdentity(identity))return;running.current=true;setBusy(true);setError('');const n=++sequence.current;
    try {
      const p=await inspectOfflineDevice(identity),j=await openOfflineJournal(identity),rows=await j.list();
      if(n===sequence.current&&sameQueueIdentity(identity)){setProbe(p);setRecords(rows);}
    }catch {if(n===sequence.current&&sameQueueIdentity(identity))setError('Không đọc được năng lực native hoặc journal; dữ liệu được giữ nguyên.');}
    finally {running.current=false;if(n===sequence.current&&sameQueueIdentity(identity))setBusy(false);}
  };
  if(!sameQueueIdentity(identity))return null;
  return <Card>
    <Text>Đồng bộ ký — thiết bị và journal</Text>
    <Text selectable>Tài khoản: {identity.actor}</Text>
    <Text selectable>Môi trường: {identity.environment}</Text>
    <Text>{NATIVE_ACCEPTANCE_VERIFIED?'Native đã có bằng chứng nghiệm thu.':'BLOCKED_NATIVE: chưa có build/runtime Android, interop và kiểm tra khôi phục khóa được nghiệm thu.'}</Text>
    <Button title="Kiểm tra native / đọc journal" variant="secondary" loading={busy} disabled={busy} onPress={()=>void refresh()} />
    {error?<Text accessibilityLiveRegion="polite">{error}</Text>:null}
    {probe?<View>
      <Text>Android API: {probe.capability.apiLevel || 'Chưa đo trên Android'}</Text>
      <Text selectable>Thiết bị cài đặt: {probe.deviceId??'Chưa có native module'}</Text>
      <Text>Signing: {probe.capability.securityLevel.signing}; ECDH: {probe.capability.securityLevel.agreement}</Text>
      <Text>{probe.capability.reason}</Text>
      {records.length===0?<Text>Chưa có intent trong journal mới của tài khoản này.</Text>:records.map(r=><Text key={r.id}>
        {r.proof.kind as string} — {r.phase==='RECONCILED'?'READBACK_VERIFIED':r.phase} — project {r.projectId}
        {r.identity.scope!==identity.scope?' — phiên cũ, giữ nguyên để đối soát':''}
      </Text>)}
    </View>:null}
    <Text>BE_FIXTURE_BLOCKED: chưa có project/assignment riêng và device/snapshot đã được xác minh. Không chuyển hàng đợi legacy thành batch ký.</Text>
    <Button title="Đăng ký thiết bị" variant="secondary" disabled onPress={()=>{}} />
    <Button title="Tạo snapshot nhiệm vụ" variant="secondary" disabled onPress={()=>{}} />
    <Button title="Gửi batch đã ký" variant="secondary" disabled onPress={()=>{}} />
    <Text>{HANDOVER_GATE}</Text>
  </Card>;
}

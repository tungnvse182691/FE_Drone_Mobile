import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Card } from '../Card';
import { Button } from '../Button';
import { inspectOfflineDevice, reconcileDeviceIntent } from '../../api/crewOfflineDevice';
import { reconcileSignedBatch, recoverSignedOrigins, reconcileStartIntent } from '../../offline/crewSignedSync';
import { openOfflineJournal, type OfflineJournalRecord } from '../../api/crewOfflineJournal';
import { NATIVE_ACCEPTANCE_VERIFIED } from '../../../modules/roadguard-offline-crypto';
import { sameQueueIdentity, type QueueIdentity } from '../../offline/upload-queue';

/** Real Crew sync route, actor/session keyed by parent. Read never changes pending/legacy state. */
export function CrewOfflinePanel({identity}:{identity:QueueIdentity}) {
  const [probe,setProbe]=useState<Awaited<ReturnType<typeof inspectOfflineDevice>>|null>(null);
  const [records,setRecords]=useState<OfflineJournalRecord[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [showDiagnostics,setShowDiagnostics]=useState(false);
  const sequence=useRef(0),running=useRef(false);
  useEffect(()=>()=>{sequence.current++;},[]);
  const refresh=async()=>{
    if(running.current||!sameQueueIdentity(identity))return;running.current=true;setBusy(true);setError('');const n=++sequence.current;
    try {
      const p=await inspectOfflineDevice(identity),j=await openOfflineJournal(identity),rows=await j.list();
      if(n===sequence.current&&sameQueueIdentity(identity)){setProbe(p);setRecords(rows);}
    }catch {if(n===sequence.current&&sameQueueIdentity(identity))setError('Không đọc được thông tin thiết bị hoặc nhật ký; dữ liệu được giữ nguyên.');}
    finally {running.current=false;if(n===sequence.current&&sameQueueIdentity(identity))setBusy(false);}
  };
  const reconcile=async(record:OfflineJournalRecord)=>{
    if(running.current||!sameQueueIdentity(identity)||!sameQueueIdentity(record.identity,identity))return;
    running.current=true;setBusy(true);setError('');const n=++sequence.current;
    try {
      if(record.proof.kind==='signed-field-batch'){
        if(record.phase==='RECEIVED')await reconcileSignedBatch(record);else await recoverSignedOrigins(record);
      }else if(record.proof.kind==='start-reconciliation')await reconcileStartIntent(record);
      else await reconcileDeviceIntent(record);
      const j=await openOfflineJournal(identity),rows=await j.list();
      if(n===sequence.current&&sameQueueIdentity(identity))setRecords(rows);
    }catch {if(n===sequence.current&&sameQueueIdentity(identity))setError('Chưa xác nhận đầy đủ kết quả. Lệnh, khóa và dữ liệu chờ vẫn được giữ nguyên.');}
    finally {running.current=false;if(n===sequence.current&&sameQueueIdentity(identity))setBusy(false);}
  };
  if(!sameQueueIdentity(identity))return null;
  return <Card>
    <Text>Đồng bộ an toàn trên thiết bị</Text>
    <Text>{NATIVE_ACCEPTANCE_VERIFIED?'Đã có bằng chứng kiểm thử thiết bị trong phạm vi được nghiệm thu. Chưa xác nhận dữ liệu đã gửi.':'Chưa đủ bằng chứng kiểm thử trên thiết bị để mở chức năng gửi an toàn.'}</Text>
    <Button title="Kiểm tra thiết bị / đọc nhật ký" variant="secondary" loading={busy} disabled={busy} onPress={()=>void refresh()} />
    {error?<Text accessibilityLiveRegion="polite">{error}</Text>:null}
    {probe?<View>
      <Button title={showDiagnostics?'Ẩn thông tin chẩn đoán':'Thông tin chẩn đoán'} variant="text" onPress={()=>setShowDiagnostics(v=>!v)} />
      {showDiagnostics ? <View><Text>Phiên bản Android API: {probe.capability.apiLevel || 'Chưa xác định'}</Text><Text>Thông tin chỉ phục vụ kiểm tra thiết bị; không xác nhận đồng bộ thành công.</Text></View> : null}
      {records.length===0?<Text>Chưa có thao tác trong nhật ký đang theo dõi. Đây không phải xác nhận đã đồng bộ.</Text>:records.map(r=><View key={r.id}><Text>Dự án {r.projectId.slice(0,8)}… · {({'signed-field-batch':'Hồ sơ hiện trường','start-reconciliation':'Bắt đầu nhiệm vụ',enrollment:'Đăng ký thiết bị',snapshot:'Dữ liệu nhiệm vụ',revocation:'Thu hồi thiết bị'} as Record<string,string>)[String(r.proof.kind)] ?? 'Thao tác thiết bị'}</Text><Text>
        {({RECONCILED:'Đã đối soát kết quả máy chủ',RECEIVED:'Đã nhận phản hồi, cần đối soát',UNKNOWN_OUTCOME:'Chưa rõ kết quả, giữ nguyên lệnh',IN_FLIGHT:'Đang xử lý, chưa xác nhận kết quả'} as Record<string,string>)[r.phase] ?? 'Chưa xác nhận kết quả'}
        {r.identity.scope!==identity.scope?' — thao tác phiên trước được giữ để đối soát':''}

      </Text>
        {sameQueueIdentity(r.identity,identity)&&((r.phase==='RECEIVED'&&['signed-field-batch','start-reconciliation','enrollment','snapshot','revocation'].includes(String(r.proof.kind)))||
          (['UNKNOWN_OUTCOME','IN_FLIGHT'].includes(r.phase)&&['signed-field-batch','start-reconciliation'].includes(String(r.proof.kind))))?
          <Button title="Đối soát bằng GET máy chủ" variant="secondary" disabled={busy} onPress={()=>void reconcile(r)} />:null}
      </View>)}
    </View>:null}
    <Text>Chức năng gửi đang khóa vì chưa đủ dữ liệu nhiệm vụ và thiết bị được xác minh. Các lệnh cũ vẫn được giữ nguyên.</Text>
    <Button title="Đăng ký thiết bị" variant="secondary" disabled onPress={()=>{}} />
    <Button title="Tạo bản dữ liệu nhiệm vụ" variant="secondary" disabled onPress={()=>{}} />
    <Button title="Gửi dữ liệu đã ký" variant="secondary" disabled onPress={()=>{}} />
    <Text>Chuyển giao thiết bị chưa khả dụng trong phạm vi hiện tại.</Text>
  </Card>;
}

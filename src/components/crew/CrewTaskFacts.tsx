import React, { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from '../Button';
import { Card } from '../Card';
import { readAssignedFieldFacts, currentQueueIdentity, crewReadGuard, CREW_REVIEW_GATE, CREW_SAFETY_GATE } from '../../api/crewSafetyWorkflow';
import { sameQueueIdentity } from '../../offline/upload-queue';

/** Mounted on the real assigned detail route. Explicit reads only; no mutation on mount/focus. */
export function CrewTaskFacts({projectId,taskId}:{projectId:string;taskId:string}) {
  const [identity]=useState(currentQueueIdentity);
  const [facts,setFacts]=useState<Awaited<ReturnType<typeof readAssignedFieldFacts>>|null>(null);
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  const sequence=useRef(0);
  React.useEffect(()=>()=>{sequence.current++;},[]);
  const read=async()=>{
    if(!identity||busy)return;const n=++sequence.current;setBusy(true);setError('');setFacts(null);
    try {const result=await readAssignedFieldFacts(identity,projectId,taskId);crewReadGuard(identity);if(n===sequence.current)setFacts(result);}
    catch(e) {if(n===sequence.current && sameQueueIdentity(identity)) {
      const status=(e as {response?:{status?:number}})?.response?.status;
      setError(status===401?'Phiên đã hết hạn.':status===403?'Không có quyền đọc nhiệm vụ.':status===404?'Nguồn không còn tồn tại.':status===409?'Nguồn hình học chưa sẵn sàng hoặc phiên bản đã đổi.':'Không đọc được dữ liệu. Tải lại để thử lại.');
    }} finally {if(n===sequence.current)setBusy(false);}
  };
  try {if(!identity)return null;crewReadGuard(identity);}catch{return null;}
  return <Card>
    <Text>Hình học và lịch sử từ máy chủ</Text>
    <Button variant="secondary" title="Tải hình học / lịch sử" disabled={busy} loading={busy} onPress={()=>void read()} />
    {error?<Text accessibilityLiveRegion="polite">{error}</Text>:null}
    {facts?<View>
      {facts.geometry?<View><Text selectable>Route revision: {facts.geometry.routeVersionId}</Text>
      <Text>CRS: {facts.geometry.route.spatialSrid} — {facts.geometry.route.profileStatus}</Text>
      <Text selectable>{facts.geometry.route.wkt}</Text>
      <Text>Đoạn trong snapshot: {facts.geometry.segments.length}</Text></View>:<Text>Hình học chưa sẵn sàng (HTTP 409); lịch sử được đọc riêng.</Text>}
      <Text>Lịch sử phân công: {facts.history.assignments.length}</Text>
      {facts.history.events.length===0?<Text>Chưa có sự kiện.</Text>:facts.history.events.map(e=><Text key={e.id}>{e.occurredAt} — {e.kind}: {e.reason}</Text>)}
    </View>:null}
    <Text>{CREW_REVIEW_GATE}</Text>
    <Button variant="secondary" title="Yêu cầu xem xét lại" disabled onPress={()=>{}} />
    <Text>{CREW_SAFETY_GATE}</Text>
    <Button variant="secondary" title="Biện pháp an toàn" disabled onPress={()=>{}} />
  </Card>;
}

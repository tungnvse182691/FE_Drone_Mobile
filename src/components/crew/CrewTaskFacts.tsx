import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../design-tokens';
import { Button } from '../Button';
import { Card } from '../Card';
import { readAssignedFieldFacts, currentQueueIdentity, crewReadGuard } from '../../api/crewSafetyWorkflow';
import { sameQueueIdentity } from '../../offline/upload-queue';

/** Kind values verified against Candidate3 FieldInspectionWorkflowRepository emit calls. */
export function crewEventLabel(kind: string): string {
  const labels: Record<string,string> = { ASSIGNED:'Đã giao nhiệm vụ', REASSIGNED:'Đã điều chỉnh phân công', ACCEPTED:'Đã nhận nhiệm vụ', REJECTED:'Đã từ chối nhiệm vụ', CANCELLED:'Đã hủy nhiệm vụ', STARTED:'Đã bắt đầu nhiệm vụ', SUBMITTED:'Đã gửi kết quả', SUPPLEMENT:'Đã yêu cầu bổ sung', REVIEWED:'Đã ghi nhận xem xét', IMPACT_CONTINUE:'Tiếp tục sau đánh giá ảnh hưởng', IMPACT_VERIFY:'Kiểm tra sau đánh giá ảnh hưởng' };
  return labels[kind] ?? 'Sự kiện nhiệm vụ chưa có nhãn';
}
export function crewHistoryTime(value?: string | null): string {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Chưa có thời gian hợp lệ';
  try { return new Intl.DateTimeFormat('vi-VN', { timeZone:'Asia/Ho_Chi_Minh', day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit', hourCycle:'h23' }).format(new Date(value)); }
  catch { return 'Chưa có thời gian hợp lệ'; }
}

/** Mounted on the real assigned detail route. Explicit reads only; no mutation on mount/focus. */
export function CrewTaskFacts({projectId,taskId}:{projectId:string;taskId:string}) {
  const [identity]=useState(currentQueueIdentity);
  const [facts,setFacts]=useState<Awaited<ReturnType<typeof readAssignedFieldFacts>>|null>(null);
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [showGeometry,setShowGeometry]=useState(false);
  const sequence=useRef(0);
  React.useEffect(()=>()=>{sequence.current++;},[]);
  const read=async()=>{
    if(!identity||busy)return;const n=++sequence.current;setBusy(true);setError('');setFacts(null);setShowGeometry(false);
    try {const result=await readAssignedFieldFacts(identity,projectId,taskId);crewReadGuard(identity);if(n===sequence.current)setFacts(result);}
    catch(e) {if(n===sequence.current && sameQueueIdentity(identity)) {
      const status=(e as {response?:{status?:number}})?.response?.status;
      setError(status===401?'Phiên đã hết hạn.':status===403?'Không có quyền đọc nhiệm vụ.':status===404?'Nguồn không còn tồn tại.':status===409?'Nguồn hình học chưa sẵn sàng hoặc phiên bản đã đổi.':'Không đọc được dữ liệu. Tải lại để thử lại.');
    }} finally {if(n===sequence.current)setBusy(false);}
  };
  try {if(!identity)return null;crewReadGuard(identity);}catch{return null;}
  return <Card style={styles.card}>
    <View style={styles.heading}><MaterialIcons name="map" size={22} color={colors.brandGold} /><Text style={typography.titleMd}>Vị trí & lịch sử nhiệm vụ</Text></View>
    <Text style={styles.hint}>Tra cứu dữ liệu tuyến đường và các mốc xử lý đã được ghi nhận.</Text>
    <Button variant="secondary" title={facts ? 'Tải lại vị trí / lịch sử' : 'Xem vị trí / lịch sử'} disabled={busy} loading={busy} onPress={()=>void read()} />
    {error?<Text style={styles.message} accessibilityLiveRegion="polite">{error}</Text>:null}
    {facts?<View style={styles.group}>
      {facts.geometry?<View style={styles.group}>
        <Text style={typography.bodyMd}>Đã có dữ liệu tuyến đường • {facts.geometry.segments.length} phân đoạn</Text>
        {showGeometry && <View style={styles.group}><Text selectable style={styles.hint}>Phiên bản tuyến: {facts.geometry.routeVersionId}</Text>
          <Text style={styles.hint}>Hệ tọa độ: {facts.geometry.route.spatialSrid} • {facts.geometry.route.profileStatus}</Text>
          <Text selectable style={styles.hint}>{facts.geometry.route.wkt.slice(0,12000)}{facts.geometry.route.wkt.length>12000?'…':''}</Text>
          {facts.geometry.route.wkt.length>12000?<Text style={styles.hint}>Bản xem được giới hạn; dữ liệu nguồn không bị thay đổi.</Text>:null}</View>}
      </View>:<View style={styles.message}><Text style={typography.bodyMd}>Vị trí chưa sẵn sàng</Text><Text style={styles.hint}>Chưa thể hiển thị tuyến đường. Lịch sử nhiệm vụ vẫn có thể xem bên dưới.</Text></View>}
        <Pressable accessibilityRole="button" accessibilityState={{expanded:showGeometry}} style={styles.heading} onPress={()=>setShowGeometry(v=>!v)}>
          <Text style={[styles.hint,{flex:1}]}>Chi tiết kỹ thuật vị trí</Text><MaterialIcons name={showGeometry?'expand-less':'expand-more'} size={22} color={colors.secondary}/>
        </Pressable>
      <Text style={typography.titleMd}>Lịch sử xử lý</Text>
      <Text style={styles.hint}>{facts.history.assignments.length} lần phân công trong dữ liệu đã tải</Text>
      {facts.history.events.length===0?<Text style={styles.hint}>Chưa có sự kiện được ghi nhận.</Text>:facts.history.events.map(e=><View key={e.id} style={styles.event}>
        <MaterialIcons name="history" size={18} color={colors.secondary}/><View style={{flex:1}}><Text style={typography.bodyMd}>{crewEventLabel(e.kind)}</Text><Text style={styles.hint}>{crewHistoryTime(e.occurredAt)} (giờ Việt Nam)</Text>{showGeometry ? <Text selectable style={styles.hint}>Mã sự kiện: {e.id} · Loại nguồn: {e.kind} · Nội dung nguồn: {e.reason || 'Chưa có'}</Text> : null}</View>
      </View>)}
    </View>:null}
    <View style={styles.unavailable}><Text style={typography.labelLg}>Các chức năng chưa sẵn sàng</Text>
      <Text style={styles.hint}>Yêu cầu xem xét lại và biện pháp an toàn chưa có đủ nguồn dữ liệu để thao tác.</Text>
      <Button variant="secondary" title="Yêu cầu xem xét lại" disabled onPress={()=>{}} />
      <Button variant="secondary" title="Biện pháp an toàn" disabled onPress={()=>{}} />
    </View>
  </Card>;
}
const styles=StyleSheet.create({
  card:{gap:spacing.md,marginBottom:spacing.md,borderWidth:1,borderColor:colors.border},
  heading:{flexDirection:'row',alignItems:'center',gap:spacing.sm},
  hint:{...typography.caption,color:colors.secondary},group:{gap:spacing.sm},
  message:{padding:spacing.sm,backgroundColor:colors.surfaceAlt,borderRadius:8},
  event:{flexDirection:'row',gap:spacing.sm,borderLeftWidth:2,borderLeftColor:colors.border,paddingLeft:spacing.sm},
  unavailable:{gap:spacing.sm,borderTopWidth:1,borderTopColor:colors.border,paddingTop:spacing.md},
});

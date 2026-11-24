import React, { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { CrewPressable as Pressable } from './CrewMotion';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../design-tokens';
import { Button } from '../Button';
import { Card } from '../Card';
import { readAssignedFieldFacts, currentQueueIdentity, crewReadGuard } from '../../api/crewSafetyWorkflow';
import { sameQueueIdentity } from '../../offline/upload-queue';
import { useRouter } from 'expo-router';
import { CREW_TASK_MAP } from '../../constants/routes';
import { crewDefectCoordinates } from '../../utils/crew-map-geometry';

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
  const router = useRouter();
  const [identity]=useState(currentQueueIdentity);
  const [facts,setFacts]=useState<Awaited<ReturnType<typeof readAssignedFieldFacts>>|null>(null);
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [showGeometry,setShowGeometry]=useState(false);
  const [showFacts,setShowFacts]=useState(false);
  const [showAllHistory,setShowAllHistory]=useState(false);
  const sequence=useRef(0);
  React.useEffect(()=>()=>{sequence.current++;},[]);
  const read=async()=>{
    if(!identity||busy)return;const n=++sequence.current;setBusy(true);setError('');setFacts(null);setShowGeometry(false);setShowAllHistory(false);
    try {const result=await readAssignedFieldFacts(identity,projectId,taskId);crewReadGuard(identity);if(n===sequence.current){setFacts(result);setShowFacts(true);}}
    catch(e) {if(n===sequence.current && sameQueueIdentity(identity)) {
      const status=(e as {response?:{status?:number}})?.response?.status;
      setError(status===401?'Phiên đã hết hạn.':status===403?'Không có quyền đọc nhiệm vụ.':status===404?'Nguồn không còn tồn tại.':status===409?'Nguồn hình học chưa sẵn sàng hoặc phiên bản đã đổi.':'Không đọc được dữ liệu. Tải lại để thử lại.');
    }} finally {if(n===sequence.current)setBusy(false);}
  };
  try {if(!identity)return null;crewReadGuard(identity);}catch{return null;}
  const target=crewDefectCoordinates(facts?.defectTarget);
  const events=facts?.history.events??[];
  const visibleEvents=showAllHistory?events:events.slice(0,3);
  return <Card style={styles.card}>
    <View style={styles.heading}><View style={styles.accent}/><Text style={[styles.title,styles.flex]}>Vị trí và lịch sử</Text>
      {facts?<Pressable accessibilityRole="button" accessibilityLabel="Tải lại vị trí và lịch sử" accessibilityState={{disabled:busy,busy}} disabled={busy} style={styles.refresh} onPress={()=>void read()}>
        <MaterialIcons name="refresh" size={24} color={colors.brandGold}/>
      </Pressable>:busy?<ActivityIndicator size="small" color={colors.brandGold}/>:null}
    </View>
    {!facts?<Button style={styles.action} variant="secondary" title="Xem vị trí / lịch sử" disabled={busy} loading={busy} onPress={()=>void read()} />:null}
    {error?<Text style={styles.message} accessibilityLiveRegion="polite">{error}</Text>:null}
    {facts ? <Pressable accessibilityRole="button" accessibilityLabel={showFacts?'Thu gọn hồ sơ':'Xem hồ sơ đã tải'} accessibilityState={{expanded:showFacts}} style={({pressed})=>[styles.disclosure,pressed&&styles.pressed]} onPress={()=>setShowFacts(v=>!v)}>
      <Text style={[typography.labelLg,styles.flex]}>{showFacts?'Thu gọn hồ sơ':'Xem hồ sơ đã tải'}</Text><MaterialIcons name={showFacts?'expand-less':'expand-more'} size={22} color={colors.brandGold}/>
    </Pressable> : null}
    {facts&&showFacts?<View style={styles.group}>
      <View style={styles.locationPanel}>
        <View style={styles.locationSummary}><View style={styles.flex}><Text style={styles.locationTitle}>Bản đồ nhiệm vụ</Text><Text style={styles.hint}>{target?'Điểm hư hại từ hồ sơ nhiệm vụ':'Chưa có vị trí hư hại'}</Text></View></View>
        <Button style={styles.mapAction} variant="secondary" title="Mở bản đồ" onPress={()=>router.push({pathname:CREW_TASK_MAP,params:{id:taskId,projectId}})} />
      </View>
      <View style={styles.historyHeading}><Text style={[styles.locationTitle,styles.flex]}>Lịch sử xử lý</Text><Text style={styles.hint}>{events.length} sự kiện</Text></View>
      {events.length===0?<Text style={styles.hint}>Chưa có sự kiện được ghi nhận.</Text>:visibleEvents.map(e=><View key={e.id} style={styles.event}>
        <View style={styles.eventTrack}><View style={styles.eventRail}/><View style={styles.eventDot}/></View><View style={styles.eventContent}><Text style={styles.eventTitle}>{crewEventLabel(e.kind)}</Text><Text style={styles.hint}>{crewHistoryTime(e.occurredAt)}</Text>{e.reason&&['REJECTED','SUPPLEMENT','REVIEWED'].includes(e.kind)?<Text style={styles.hint}>{e.reason}</Text>:null}</View>
      </View>)}
      {events.length>3?<Pressable accessibilityRole="button" accessibilityState={{expanded:showAllHistory}} style={styles.disclosure} onPress={()=>setShowAllHistory(v=>!v)}><Text style={[typography.labelLg,styles.flex]}>{showAllHistory?'Thu gọn sự kiện':`Xem thêm ${events.length-3} sự kiện`}</Text><MaterialIcons name={showAllHistory?'expand-less':'expand-more'} size={22} color={colors.brandGold}/></Pressable>:null}
      {facts.geometry?<>
        <Pressable accessibilityRole="button" accessibilityState={{expanded:showGeometry}} style={styles.technicalToggle} onPress={()=>setShowGeometry(v=>!v)}><Text style={[styles.hint,styles.flex]}>Thông tin kỹ thuật vị trí</Text><MaterialIcons name={showGeometry?'expand-less':'expand-more'} size={22} color={colors.secondary}/></Pressable>
        {showGeometry && <View style={styles.technical}>
          <Text style={styles.hint}>Phiên bản tuyến</Text><Text selectable style={styles.technicalValue}>{facts.geometry.routeVersionId}</Text>
          <Text style={styles.hint}>Hệ tọa độ nguồn</Text><Text selectable style={styles.technicalValue}>{facts.geometry.route.spatialSrid} · {facts.geometry.route.profileStatus}</Text>
          <Text style={styles.hint}>Hình học tuyến (WKT)</Text><Text selectable style={styles.technicalValue}>{facts.geometry.route.wkt.slice(0,12000)}{facts.geometry.route.wkt.length>12000?'…':''}</Text>
        </View>}
      </>:null}
    </View>:null}

  </Card>;
}
const styles=StyleSheet.create({
  card:{gap:16,padding:16,marginBottom:16,borderWidth:1,borderColor:'#DCE2E7',borderRadius:16},
  title:{...typography.titleMd,lineHeight:24,color:'#192D40'},
  accent:{width:3,height:18,borderRadius:2,backgroundColor:colors.primary},
  action:{alignSelf:'flex-start',maxWidth:'100%',backgroundColor:'#F3F5F6',borderColor:'#DCE2E7'},
  mapAction:{alignSelf:'center',marginLeft:'auto',maxWidth:'100%',backgroundColor:'#FFFFFF',borderColor:'#C9B56D'},
  heading:{minHeight:48,flexDirection:'row',alignItems:'center',gap:spacing.sm},
  flex:{flex:1,minWidth:0},
  hint:{...typography.caption,lineHeight:19,color:'#526170'},group:{gap:16},
  locationPanel:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:12,padding:12,borderRadius:12,backgroundColor:'#F8F5EA',borderWidth:1,borderColor:'#E4D9B4'},
  locationTitle:{...typography.labelLg,lineHeight:22,color:'#192D40'},
  refresh:{minWidth:48,minHeight:48,alignItems:'center',justifyContent:'center',borderRadius:24},
  disclosure:{minHeight:48,paddingVertical:8,flexDirection:'row',alignItems:'center',gap:spacing.sm,borderRadius:8},
  pressed:{backgroundColor:'#EDF1F4'},
  locationSummary:{flexGrow:1,flexShrink:1,flexBasis:150,minWidth:0,flexDirection:'row',alignItems:'center',gap:spacing.sm},
  message:{flexDirection:'row',gap:spacing.sm,padding:spacing.md,backgroundColor:colors.surfaceAlt,borderRadius:8},
  historyHeading:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:spacing.sm,paddingTop:8},
  event:{flexDirection:'row',gap:12},
  eventTrack:{width:10,alignItems:'center',alignSelf:'stretch'},
  eventRail:{position:'absolute',top:8,bottom:-16,width:1,backgroundColor:'#DCE2E7'},
  eventDot:{width:8,height:8,borderRadius:4,backgroundColor:'#8393A1',marginTop:7},
  eventContent:{flex:1,minWidth:0,gap:4,paddingBottom:8},
  eventTitle:{...typography.labelLg,lineHeight:22,color:'#192D40'},
  technicalToggle:{minHeight:48,flexDirection:'row',alignItems:'center',gap:spacing.sm,borderTopWidth:1,borderColor:colors.border,marginTop:spacing.sm},
  technical:{padding:spacing.md,gap:spacing.sm,backgroundColor:colors.surfaceAlt,borderRadius:8},
  technicalValue:{...typography.bodyMd,color:colors.secondary,flexShrink:1,marginBottom:spacing.sm},
  unavailable:{gap:spacing.sm,borderTopWidth:1,borderTopColor:colors.border,paddingTop:spacing.md},
});

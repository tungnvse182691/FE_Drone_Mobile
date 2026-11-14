import React, { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../design-tokens';
import { Button } from '../Button';
import { Card } from '../Card';
import { readAssignedFieldFacts, currentQueueIdentity, crewReadGuard } from '../../api/crewSafetyWorkflow';
import { sameQueueIdentity } from '../../offline/upload-queue';
import { RoadGuardMapLibre } from '../map/RoadGuardMapLibre';
import { crewDefectCoordinates, crewRouteCoordinates } from '../../utils/crew-map-geometry';

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
  const [showFacts,setShowFacts]=useState(false);
  const [showAllHistory,setShowAllHistory]=useState(false);
  const [selectedSegment,setSelectedSegment]=useState<string|null>(null);
  const sequence=useRef(0);
  React.useEffect(()=>()=>{sequence.current++;},[]);
  const read=async()=>{
    if(!identity||busy)return;const n=++sequence.current;setBusy(true);setError('');setFacts(null);setShowGeometry(false);setShowAllHistory(false);setSelectedSegment(null);
    try {const result=await readAssignedFieldFacts(identity,projectId,taskId);crewReadGuard(identity);if(n===sequence.current){setFacts(result);setShowFacts(true);}}
    catch(e) {if(n===sequence.current && sameQueueIdentity(identity)) {
      const status=(e as {response?:{status?:number}})?.response?.status;
      setError(status===401?'Phiên đã hết hạn.':status===403?'Không có quyền đọc nhiệm vụ.':status===404?'Nguồn không còn tồn tại.':status===409?'Nguồn hình học chưa sẵn sàng hoặc phiên bản đã đổi.':'Không đọc được dữ liệu. Tải lại để thử lại.');
    }} finally {if(n===sequence.current)setBusy(false);}
  };
  try {if(!identity)return null;crewReadGuard(identity);}catch{return null;}
  const target=crewDefectCoordinates(facts?.defectTarget);
  const geometrySource=selectedSegment?facts?.geometry?.segments.find(s=>s.id===selectedSegment):facts?.geometry?.route;
  const routeCoordinates=geometrySource?crewRouteCoordinates(geometrySource):[];
  const center=routeCoordinates[0]??(target?[target.longitude,target.latitude] as [number,number]:null);
  const events=facts?.history.events??[];
  const visibleEvents=showAllHistory?events:events.slice(0,3);
  return <Card style={styles.card}>
    <View style={styles.heading}><View style={styles.iconBox}><MaterialIcons name="map" size={22} color={colors.brandGold} /></View><Text style={[typography.titleMd,styles.flex]}>Vị trí và lịch sử</Text>
      {facts?<Pressable accessibilityRole="button" accessibilityLabel="Tải lại vị trí và lịch sử" accessibilityState={{disabled:busy,busy}} disabled={busy} style={styles.refresh} onPress={()=>void read()}>
        <MaterialIcons name="refresh" size={24} color={colors.brandGold}/>
      </Pressable>:busy?<ActivityIndicator size="small" color={colors.brandGold}/>:null}
    </View>
    {!facts?<Button variant="secondary" title="Xem vị trí / lịch sử" disabled={busy} loading={busy} onPress={()=>void read()} />:null}
    {error?<Text style={styles.message} accessibilityLiveRegion="polite">{error}</Text>:null}
    {facts ? <Pressable accessibilityRole="button" accessibilityLabel={showFacts?'Thu gọn hồ sơ':'Xem hồ sơ đã tải'} accessibilityState={{expanded:showFacts}} style={({pressed})=>[styles.disclosure,pressed&&styles.pressed]} onPress={()=>setShowFacts(v=>!v)}>
      <Text style={[typography.labelLg,styles.flex]}>{showFacts?'Thu gọn hồ sơ':'Xem hồ sơ đã tải'}</Text><MaterialIcons name={showFacts?'expand-less':'expand-more'} size={22} color={colors.brandGold}/>
    </Pressable> : null}
    {facts&&showFacts?<View style={styles.group}>
      <View style={styles.group}>
        <View style={styles.locationSummary}><MaterialIcons name="route" size={22} color={colors.brandGold}/><View style={styles.flex}><Text style={typography.labelLg}>Bản đồ nhiệm vụ</Text><Text style={styles.hint}>{target?'Điểm hư hại từ hồ sơ nhiệm vụ':'Chưa có vị trí hư hại'}</Text></View></View>
        {facts.geometry?<View style={styles.mapChoices}>
          {[{id:null,label:'Tuyến'},...facts.geometry.segments.map(s=>({id:s.id,label:`Đoạn ${s.sequence}`}))].map(choice=><Pressable key={choice.id??'route'} accessibilityRole="button" accessibilityState={{selected:selectedSegment===choice.id}} onPress={()=>setSelectedSegment(choice.id)} style={[styles.mapChoice,selectedSegment===choice.id&&styles.mapChoiceActive]}><Text style={typography.labelSm}>{choice.label}</Text></Pressable>)}
        </View>:null}
        {center?<RoadGuardMapLibre style={{height:260,borderRadius:12,overflow:'hidden'}} center={center} routeCoordinates={routeCoordinates} markers={target?[{id:'defect-target',title:'Vị trí hư hại',coordinate:[target.longitude,target.latitude],type:'defect'}]:[]} />:null}
        {!routeCoordinates.length?<View style={styles.message}><MaterialIcons name="info-outline" size={18} color={colors.secondary}/><Text style={[styles.hint,styles.flex]}>{facts.geometry?'Chưa có hình học bản đồ cho phần đang chọn.':'Tuyến chưa sẵn sàng. Bạn vẫn có thể xem lịch sử.'}</Text></View>:null}
      </View>
      <View style={styles.historyHeading}><MaterialIcons name="history" size={20} color={colors.secondary}/><Text style={[typography.labelLg,styles.flex]}>Lịch sử xử lý</Text><Text style={styles.hint}>{events.length} sự kiện</Text></View>
      {events.length===0?<Text style={styles.hint}>Chưa có sự kiện được ghi nhận.</Text>:visibleEvents.map(e=><View key={e.id} style={styles.event}>
        <View style={styles.eventDot}/><View style={styles.flex}><Text style={typography.bodyMd}>{crewEventLabel(e.kind)}</Text><Text style={styles.hint}>{crewHistoryTime(e.occurredAt)}</Text>{e.reason&&['REJECTED','SUPPLEMENT','REVIEWED'].includes(e.kind)?<Text style={styles.hint}>{e.reason}</Text>:null}</View>
      </View>)}
      {events.length>3?<Pressable accessibilityRole="button" accessibilityState={{expanded:showAllHistory}} style={styles.disclosure} onPress={()=>setShowAllHistory(v=>!v)}><Text style={[typography.labelLg,styles.flex]}>{showAllHistory?'Thu gọn sự kiện':`Xem thêm ${events.length-3} sự kiện`}</Text><MaterialIcons name={showAllHistory?'expand-less':'expand-more'} size={22} color={colors.brandGold}/></Pressable>:null}
      {facts.geometry?<>
        <Pressable accessibilityRole="button" accessibilityState={{expanded:showGeometry}} style={styles.technicalToggle} onPress={()=>setShowGeometry(v=>!v)}><MaterialIcons name="info-outline" size={18} color={colors.secondary}/><Text style={[styles.hint,styles.flex]}>Thông tin kỹ thuật vị trí</Text><MaterialIcons name={showGeometry?'expand-less':'expand-more'} size={22} color={colors.secondary}/></Pressable>
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
  card:{gap:spacing.md,marginBottom:spacing.md,borderWidth:1,borderColor:'#E8D9A8',borderRadius:12},
  heading:{minHeight:48,flexDirection:'row',alignItems:'center',gap:spacing.sm},
  flex:{flex:1,minWidth:0},
  hint:{...typography.caption,color:colors.secondary},group:{gap:spacing.sm},
  mapChoices:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm},
  mapChoice:{minHeight:48,paddingHorizontal:spacing.md,justifyContent:'center',borderWidth:1,borderColor:'#E8D9A8',borderRadius:12},
  mapChoiceActive:{backgroundColor:'#F6ECCD',borderColor:colors.brandGold},
  iconBox:{width:36,height:36,borderRadius:10,backgroundColor:'#FFF9EA',alignItems:'center',justifyContent:'center'},
  refresh:{minWidth:48,minHeight:48,alignItems:'center',justifyContent:'center',borderRadius:24},
  disclosure:{minHeight:48,paddingHorizontal:spacing.md,flexDirection:'row',alignItems:'center',gap:spacing.sm,borderWidth:1,borderColor:'#E8D9A8',backgroundColor:'#FFFCF4',borderRadius:12},
  pressed:{backgroundColor:'#F6ECCD'},
  locationSummary:{flexDirection:'row',alignItems:'center',gap:spacing.sm,padding:spacing.md,backgroundColor:'#FFFCF4',borderRadius:12},
  message:{flexDirection:'row',gap:spacing.sm,padding:spacing.md,backgroundColor:colors.surfaceAlt,borderRadius:8},
  historyHeading:{flexDirection:'row',alignItems:'center',gap:spacing.sm,marginTop:spacing.md,marginBottom:spacing.sm},
  event:{flexDirection:'row',gap:spacing.md,paddingBottom:spacing.md,paddingLeft:spacing.sm},
  eventDot:{width:8,height:8,borderRadius:4,backgroundColor:colors.brandGold,marginTop:6},
  technicalToggle:{minHeight:48,flexDirection:'row',alignItems:'center',gap:spacing.sm,borderTopWidth:1,borderColor:colors.border,marginTop:spacing.sm},
  technical:{padding:spacing.md,gap:spacing.sm,backgroundColor:colors.surfaceAlt,borderRadius:8},
  technicalValue:{...typography.bodyMd,color:colors.secondary,flexShrink:1,marginBottom:spacing.sm},
  unavailable:{gap:spacing.sm,borderTopWidth:1,borderTopColor:colors.border,paddingTop:spacing.md},
});

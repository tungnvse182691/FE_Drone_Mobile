import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Card } from '../Card';
import { Button } from '../Button';
import { colors, spacing, typography } from '../../design-tokens';
import { crewReadGuard, currentQueueIdentity, readAssignedRepairFacts } from '../../api/crewSafetyWorkflow';
import { sameQueueIdentity } from '../../offline/upload-queue';
import { crewHistoryTime } from './CrewTaskFacts';

/** Current assigned Crew read projection. Mutations use separate durable command flows. */
export function CrewRepairFacts({projectId,taskId}:{projectId:string;taskId:string}) {
  const [identity]=useState(currentQueueIdentity);
  const [facts,setFacts]=useState<Awaited<ReturnType<typeof readAssignedRepairFacts>>>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[expanded,setExpanded]=useState(false);
  const [loaded,setLoaded]=useState(false);
  const sequence=useRef(0);
  React.useEffect(()=>()=>{sequence.current++;},[]);
  const read=async()=>{
    if(!identity||busy)return;
    const n=++sequence.current;setBusy(true);setError('');setFacts(null);setLoaded(false);
    try {const result=await readAssignedRepairFacts(identity,projectId,taskId);crewReadGuard(identity);
      if(n===sequence.current){setFacts(result);setLoaded(true);setExpanded(true);}}
    catch(e){if(n===sequence.current&&sameQueueIdentity(identity)){
      const status=(e as {response?:{status?:number}})?.response?.status;
      setError(status===403?'Bạn không còn phụ trách nội dung này.':status===404?'Hồ sơ không còn khả dụng.':'Chưa tải được hồ sơ. Vui lòng thử lại.');
    }}finally{if(n===sequence.current)setBusy(false);}
  };
  try{if(!identity)return null;crewReadGuard(identity);}catch{return null;}
  const decision=facts?.context.finalDecision,requests=facts?.context.reviewRequests??[];
  return <Card style={styles.card}>
    <View style={styles.heading}><MaterialIcons name="verified-user" size={22} color={colors.brandGold}/><Text style={[typography.titleMd,styles.flex]}>An toàn và kết quả sửa chữa</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Tải lại an toàn và kết quả" accessibilityState={{busy,disabled:busy}} disabled={busy} onPress={()=>void read()} style={styles.icon}>
        <MaterialIcons name="refresh" size={24} color={colors.secondary}/>
      </Pressable>
    </View>
    {!loaded?<Button variant="secondary" title="Xem hồ sơ phụ trách" loading={busy} onPress={()=>void read()}/>:null}
    {error?<Text accessibilityLiveRegion="polite" style={styles.notice}>{error}</Text>:null}
    {loaded&&!facts?<Text style={styles.notice}>Phân công sửa chữa đã thay đổi. Tải lại nhiệm vụ để xem hồ sơ hiện hành.</Text>:null}
    {facts?<>
      <Pressable accessibilityRole="button" accessibilityState={{expanded}} onPress={()=>setExpanded(v=>!v)} style={styles.heading}>
        <Text style={[typography.bodyMd,styles.flex]}>{facts.measures.length} biện pháp an toàn · {requests.length} yêu cầu xem xét</Text>
        <MaterialIcons name={expanded?'expand-less':'expand-more'} size={24} color={colors.secondary}/>
      </Pressable>
      {expanded?<View style={styles.group}>
        <View style={styles.section}><Text style={typography.labelLg}>Biện pháp an toàn</Text>
          {!facts.measures.length?<Text style={styles.hint}>Bạn chưa được giao biện pháp an toàn đang theo dõi.</Text>:facts.measures.map(({data:m},index)=><View key={m.id} style={styles.row}>
            <MaterialIcons name={m.installedAt?'verified-user':'shield'} size={22} color={colors.brandGold}/>
            <View style={styles.flex}><Text style={typography.labelLg}>Biện pháp {index+1} · {m.installedAt?'Đã lắp đặt':'Chưa lắp đặt'}</Text>
              {m.firstCheckDueAt?<Text style={styles.hint}>Hạn kiểm tra: {crewHistoryTime(m.firstCheckDueAt)}</Text>:null}
              <Text style={styles.hint}>{m.checks.length} lần kiểm tra · {new Set((m.eligibleEvidenceLinks??[]).map(l=>l.fileId)).size} ảnh đủ điều kiện</Text>
              {m.warnings.some(w=>!m.acknowledgements.some(a=>a.warningId===w.id))?<Text style={styles.warning}>Có cảnh báo cần xác nhận</Text>:null}
            </View>
          </View>)}
        </View>
        <View style={styles.section}><Text style={typography.labelLg}>Quyết định cuối</Text>
          <Text style={typography.bodyMd}>{decision?(decision.result==='CONFIRMED'?'Đã xác nhận kết quả':'Đã có quyết định từ quản lý'):'Chưa có quyết định cuối đang hiệu lực.'}</Text>
          {decision?<Text style={styles.hint}>{crewHistoryTime(decision.at)}</Text>:null}
        </View>
        {requests.length?<View style={styles.section}><Text style={typography.labelLg}>Yêu cầu xem xét đã gửi</Text>{requests.map(r=><View key={r.requestId} style={styles.request}>
          <Text style={typography.bodyMd}>{r.reason}</Text><Text style={styles.hint}>{crewHistoryTime(r.at)}{decision&&r.decisionId!==decision.decisionId?' · Quyết định trước':''}</Text>
        </View>)}</View>:null}
      </View>:null}
    </>:null}
  </Card>;
}
const styles=StyleSheet.create({
  card:{gap:spacing.sm,marginBottom:spacing.md,borderWidth:1,borderColor:'#E8D9A8',borderRadius:12},
  flex:{flex:1,minWidth:0},heading:{flexDirection:'row',alignItems:'center',gap:spacing.sm},
  icon:{minWidth:48,minHeight:48,alignItems:'center',justifyContent:'center'},
  group:{gap:spacing.md},section:{gap:spacing.sm,padding:spacing.sm,borderRadius:10,backgroundColor:colors.surfaceAlt},
  row:{flexDirection:'row',alignItems:'flex-start',gap:spacing.sm,paddingVertical:spacing.xs},
  hint:{...typography.caption,color:colors.secondary},notice:{...typography.bodyMd,padding:spacing.sm,backgroundColor:colors.surfaceAlt,borderRadius:8},
  warning:{...typography.caption,color:colors.secondary,fontWeight:'700'},request:{gap:spacing.xs,paddingVertical:spacing.xs},
});

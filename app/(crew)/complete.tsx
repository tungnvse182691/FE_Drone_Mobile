import React from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {useRouter} from 'expo-router';
import {SafeAreaScreen} from '../../src/components/SafeAreaScreen';
import {AppHeader} from '../../src/components/AppHeader';
import {CrewTaskStatus} from '../../src/components/CrewTaskStatus';
import {Card} from '../../src/components/Card';
import {NormalRepairPanel} from '../../src/components/crew/NormalRepairPanel';
import {CrewContentTransition} from '../../src/components/crew/CrewMotion';
import {CrewTaskBoundary,crewStatusLabel} from './tasks';
import {colors,radius,spacing,typography} from '../../src/design-tokens';
export default function CrewRepairCompleteScreen(){
  const router = useRouter();
 return <CrewTaskBoundary operational={false}>{task=><SafeAreaScreen scroll header={<AppHeader subtitle="Hồ sơ hoàn tất thi công" showBack onBack={()=>router.back()}/>}>
 <CrewContentTransition ready>
 <Card style={styles.summary}>
 <View style={styles.identity}><Text style={styles.code}>{task.wo_code||`ID nhiệm vụ: ${task.id.slice(0,8)}`}</Text></View>
 <Text style={styles.title}>{task.title||'Nhiệm vụ hiện trường'}</Text>
 {[task.route_code,task.section_name,task.chainage].some(Boolean)?<View style={styles.location}><Text style={[styles.body,styles.flex]}>{[task.route_code,task.section_name,task.chainage].filter(Boolean).join(' • ')}</Text></View>:null}
 <View style={styles.statusRow}><Text style={styles.hint}>Trạng thái nhiệm vụ</Text><CrewTaskStatus status={task.status} label={crewStatusLabel(task.status)}/></View>
 </Card>
 </CrewContentTransition>
 {(task.detail?.mode==='NORMAL'||task.detail?.mode==='CONDITIONAL_FT')?<NormalRepairPanel task={task} stage="closeout"/>:<Card style={styles.summary}><Text style={styles.body}>Chưa có ngữ cảnh sửa chữa theo kế hoạch phù hợp. Chức năng thi công chưa khả dụng.</Text></Card>}
 </SafeAreaScreen>}</CrewTaskBoundary>;
}

const styles=StyleSheet.create({
 summary:{gap:spacing.sm,padding:16,marginBottom:12,borderWidth:1,borderColor:'#DCE2E7',borderRadius:radius.lg,backgroundColor:'#F3F5F6'},
 identity:{alignSelf:'flex-start',maxWidth:'100%',paddingHorizontal:spacing.sm,paddingVertical:4,backgroundColor:'#E4E9ED',borderRadius:6},
 code:{...typography.labelSm,lineHeight:18,color:'#192D40',flexShrink:1},
 title:{...typography.labelLg,fontSize:16,lineHeight:24,color:'#192D40'},
 location:{flexDirection:'row',alignItems:'flex-start',gap:spacing.xs},
 flex:{flex:1,minWidth:0},
 statusRow:{borderTopWidth:1,borderTopColor:colors.border,paddingTop:spacing.sm,flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:spacing.sm},
 body:{...typography.bodyMd,color:colors.secondary},
 hint:{...typography.caption,color:colors.secondary},
});

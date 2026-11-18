import React from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {MaterialIcons} from '@expo/vector-icons';
import {router} from 'expo-router';
import {SafeAreaScreen} from '../../src/components/SafeAreaScreen';
import {AppHeader} from '../../src/components/AppHeader';
import {CrewTaskStatus} from '../../src/components/CrewTaskStatus';
import {Card} from '../../src/components/Card';
import {NormalRepairPanel} from '../../src/components/crew/NormalRepairPanel';
import {CrewContentTransition} from '../../src/components/crew/CrewMotion';
import {CrewTaskBoundary,crewStatusLabel} from './tasks';
import {colors,radius,spacing,typography} from '../../src/design-tokens';
export default function CrewRepairCompleteScreen(){
 return <CrewTaskBoundary operational={false}>{task=><SafeAreaScreen scroll header={<AppHeader subtitle="Hồ sơ hoàn tất thi công" showBack onBack={()=>router.back()}/>}>
 <CrewContentTransition ready>
 <Card style={styles.summary}>
 <View style={styles.identity}><Text style={styles.code}>{task.wo_code||`ID nhiệm vụ: ${task.id.slice(0,8)}`}</Text></View>
 <Text style={styles.title}>{task.title||'Nhiệm vụ hiện trường'}</Text>
 {[task.route_code,task.section_name,task.chainage].some(Boolean)?<View style={styles.location}><MaterialIcons name="location-on" size={18} color={colors.secondary}/><Text style={[styles.body,styles.flex]}>{[task.route_code,task.section_name,task.chainage].filter(Boolean).join(' • ')}</Text></View>:null}
 <View style={styles.statusRow}><Text style={styles.hint}>Trạng thái nhiệm vụ</Text><CrewTaskStatus status={task.status} label={crewStatusLabel(task.status)}/></View>
 </Card>
 </CrewContentTransition>
 {(task.detail?.mode==='NORMAL'||task.detail?.mode==='CONDITIONAL_FT')?<NormalRepairPanel task={task} stage="closeout"/>:<Card style={styles.summary}><Text style={styles.body}>Chưa có ngữ cảnh sửa chữa theo kế hoạch phù hợp. Chức năng thi công chưa khả dụng.</Text></Card>}
 </SafeAreaScreen>}</CrewTaskBoundary>;
}

const styles=StyleSheet.create({
 summary:{gap:spacing.sm,marginBottom:spacing.md,borderWidth:1,borderColor:colors.border,borderRadius:radius.lg},
 identity:{alignSelf:'flex-start',maxWidth:'100%',paddingHorizontal:spacing.sm,paddingVertical:6,backgroundColor:colors.surfaceAlt,borderRadius:radius.sm},
 code:{...typography.labelLg,lineHeight:20,color:colors.secondary,flexShrink:1},
 title:{...typography.titleMd,color:colors.neutral},
 location:{flexDirection:'row',alignItems:'flex-start',gap:spacing.xs},
 flex:{flex:1,minWidth:0},
 statusRow:{borderTopWidth:1,borderTopColor:colors.border,paddingTop:spacing.sm,flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:spacing.sm},
 body:{...typography.bodyMd,color:colors.neutral},
 hint:{...typography.caption,color:colors.secondary},
});

import React from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {MaterialIcons} from '@expo/vector-icons';
import {router} from 'expo-router';
import {SafeAreaScreen} from '../../src/components/SafeAreaScreen';
import {AppHeader} from '../../src/components/AppHeader';
import {Card} from '../../src/components/Card';
import {NormalRepairPanel} from '../../src/components/crew/NormalRepairPanel';
import {CrewTaskStatus} from '../../src/components/CrewTaskStatus';
import {CrewContentTransition} from '../../src/components/crew/CrewMotion';
import {CrewTaskBoundary,crewStatusLabel} from './tasks';
import {colors,radius,spacing,typography} from '../../src/design-tokens';
export default function CrewRepairProgressScreen(){
 return <CrewTaskBoundary operational={false}>{task=><SafeAreaScreen scroll header={<AppHeader subtitle="Theo dõi thi công" showBack onBack={()=>router.back()}/>}>
 <CrewContentTransition ready>
 <Card style={styles.summary}>
 <View style={styles.identity}><Text style={styles.code}>{task.wo_code||`ID nhiệm vụ: ${task.id.slice(0,8)}`}</Text></View>
 <Text style={styles.title}>{task.title||'Nhiệm vụ hiện trường'}</Text>
 <View style={styles.location}><MaterialIcons name="location-on" size={18} color={colors.secondary}/><Text style={[styles.body,styles.flex]}>{[task.route_code,task.section_name,task.chainage].filter(Boolean).join(' • ')||'Chưa có thông tin tuyến đường'}</Text></View>
 <View style={styles.statusRow}><Text style={styles.caption}>Trạng thái nhiệm vụ</Text><CrewTaskStatus status={task.status} label={crewStatusLabel(task.status)}/></View>
 </Card>
 </CrewContentTransition>
 {(task.detail?.mode==='NORMAL'||task.detail?.mode==='CONDITIONAL_FT')?<NormalRepairPanel task={task} stage="progress"/>:<Card style={styles.summary}><Text style={styles.body}>Chưa có ngữ cảnh sửa chữa theo kế hoạch phù hợp. Chức năng thi công chưa khả dụng.</Text></Card>}
 </SafeAreaScreen>}</CrewTaskBoundary>;
}

const styles=StyleSheet.create({
 summary:{borderWidth:1,borderColor:colors.border,borderRadius:radius.lg,gap:spacing.sm,padding:12,marginBottom:12,backgroundColor:'#FBF8EE'},
 identity:{alignSelf:'flex-start',maxWidth:'100%',paddingHorizontal:spacing.sm,paddingVertical:4,backgroundColor:colors.surface,borderRadius:radius.sm},
 code:{...typography.labelLg,lineHeight:20,color:colors.secondary,flexShrink:1},
 title:{...typography.bodyLg,lineHeight:22,color:colors.neutral},
 location:{flexDirection:'row',alignItems:'flex-start',gap:spacing.xs},
 flex:{flex:1,minWidth:0},
 statusRow:{borderTopWidth:1,borderTopColor:colors.border,paddingTop:spacing.sm,flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:spacing.sm},
 caption:{...typography.caption,color:colors.secondary},
 body:{...typography.bodyMd,color:colors.secondary},
});

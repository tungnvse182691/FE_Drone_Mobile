import React from 'react';
import {StyleSheet,Text} from 'react-native';
import {router} from 'expo-router';
import {SafeAreaScreen} from '../../src/components/SafeAreaScreen';
import {AppHeader} from '../../src/components/AppHeader';
import {CrewTaskStatus} from '../../src/components/CrewTaskStatus';
import {Card} from '../../src/components/Card';
import {NormalRepairPanel} from '../../src/components/crew/NormalRepairPanel';
import {CrewTaskBoundary,crewStatusLabel} from './tasks';
import {colors,spacing,typography} from '../../src/design-tokens';
export default function CrewRepairCompleteScreen(){
 return <CrewTaskBoundary operational={false}>{task=><SafeAreaScreen scroll header={<AppHeader subtitle="Hồ sơ hoàn tất thi công" showBack onBack={()=>router.back()}/>}>
 <Card style={styles.summary}>
 <Text numberOfLines={2} style={typography.labelLg}>{task.title||'Nhiệm vụ hiện trường'}</Text>
 <Text style={styles.hint}>{task.wo_code||`ID nhiệm vụ: ${task.id.slice(0,8)}`}</Text>
 {[task.route_code,task.section_name,task.chainage].some(Boolean)?<Text style={styles.hint}>{[task.route_code,task.section_name,task.chainage].filter(Boolean).join(' • ')}</Text>:null}
 <CrewTaskStatus status={task.status} label={crewStatusLabel(task.status)}/>
 </Card>
 {(task.detail?.mode==='NORMAL'||task.detail?.mode==='CONDITIONAL_FT')?<NormalRepairPanel task={task} stage="closeout"/>:<Card style={styles.summary}><Text style={styles.body}>Chưa có ngữ cảnh sửa chữa theo kế hoạch phù hợp. Chức năng thi công chưa khả dụng.</Text></Card>}
 </SafeAreaScreen>}</CrewTaskBoundary>;
}

const styles=StyleSheet.create({
 summary:{gap:spacing.xs,marginBottom:spacing.md},
 body:{...typography.bodyMd,color:colors.neutral},
 hint:{...typography.caption,color:colors.secondary},
});

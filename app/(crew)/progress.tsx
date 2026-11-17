import React from 'react';
import {StyleSheet,Text} from 'react-native';
import {router} from 'expo-router';
import {SafeAreaScreen} from '../../src/components/SafeAreaScreen';
import {AppHeader} from '../../src/components/AppHeader';
import {Card} from '../../src/components/Card';
import {NormalRepairPanel} from '../../src/components/crew/NormalRepairPanel';
import {CrewTaskBoundary,crewStatusLabel} from './tasks';
import {colors,radius,spacing,typography} from '../../src/design-tokens';
export default function CrewRepairProgressScreen(){
 return <CrewTaskBoundary operational={false}>{task=><SafeAreaScreen scroll header={<AppHeader subtitle="Theo dõi thi công" showBack onBack={()=>router.back()}/>}>
 <Card style={styles.summary}>
 <Text style={typography.titleMd}>{task.title||'Nhiệm vụ hiện trường'}</Text>
 <Text style={styles.body}>{task.wo_code||`ID nhiệm vụ: ${task.id.slice(0,8)}`}</Text>
 <Text style={styles.body}>{[task.route_code,task.section_name,task.chainage].filter(Boolean).join(' • ')||'Chưa có thông tin tuyến đường'}</Text>
 <Text style={styles.status}>{crewStatusLabel(task.status)}</Text>

 </Card>
 {(task.detail?.mode==='NORMAL'||task.detail?.mode==='CONDITIONAL_FT')?<NormalRepairPanel task={task} stage="progress"/>:<Card style={styles.summary}><Text style={styles.body}>Chưa có ngữ cảnh sửa chữa theo kế hoạch phù hợp. Chức năng thi công chưa khả dụng.</Text></Card>}
 </SafeAreaScreen>}</CrewTaskBoundary>;
}

const styles=StyleSheet.create({
 summary:{borderWidth:1,borderColor:colors.border,borderRadius:radius.lg,gap:spacing.xs,padding:spacing.md,marginBottom:spacing.md},
 status:{...typography.labelSm,color:colors.secondary},
 body:{...typography.bodyMd,color:colors.neutral},
});

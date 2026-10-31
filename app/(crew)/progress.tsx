import React from 'react';
import {StyleSheet,Text} from 'react-native';
import {router} from 'expo-router';
import {SafeAreaScreen} from '../../src/components/SafeAreaScreen';
import {AppHeader} from '../../src/components/AppHeader';
import {Card} from '../../src/components/Card';
import {Button} from '../../src/components/Button';
import {NormalRepairPanel} from '../../src/components/crew/NormalRepairPanel';
import {CrewTaskBoundary,crewStatusLabel} from './tasks';
import {colors,spacing,typography} from '../../src/design-tokens';
export default function CrewRepairProgressScreen(){
 return <CrewTaskBoundary operational={false}>{task=><SafeAreaScreen scroll header={<AppHeader subtitle="Theo dõi thi công" showBack onBack={()=>router.back()}/>}>
 <Card style={styles.summary}>
 <Text style={styles.eyebrow}>TỔNG QUAN NHIỆM VỤ</Text>
 <Text style={typography.titleLg}>{task.title||'Nhiệm vụ hiện trường'}</Text>
 <Text style={styles.body}>{task.wo_code||'Chưa có mã WO'}</Text>
 <Text style={styles.body}>{[task.route_code,task.section_name,task.chainage].filter(Boolean).join(' • ')||'Chưa có thông tin tuyến đường'}</Text>
 <Text style={styles.body}>{crewStatusLabel(task.status)}</Text>
 <Text style={styles.hint}>Các mốc dưới đây dựa trên biên nhận máy chủ. Không tự bắt đầu thi công khi mở màn hình.</Text>
 </Card>
 {task.detail?.mode==='NORMAL'?<NormalRepairPanel task={task} stage="progress"/>:<Card style={styles.summary}><Text style={styles.body}>Chưa có ngữ cảnh sửa chữa theo kế hoạch phù hợp. Chức năng thi công chưa khả dụng.</Text></Card>}
 <Button title="Về chi tiết nhiệm vụ" variant="secondary" onPress={()=>router.replace({pathname:'/(crew)/wo-detail',params:{id:task.id,projectId:task.projectId}})}/>
 </SafeAreaScreen>}</CrewTaskBoundary>;
}

const styles=StyleSheet.create({
 summary:{gap:spacing.sm,marginBottom:spacing.md},
 eyebrow:{...typography.labelSm,color:colors.secondary},
 body:{...typography.bodyMd,color:colors.neutral},
 hint:{...typography.caption,color:colors.secondary},
});

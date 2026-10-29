import React from 'react';
import {Text} from 'react-native';
import {router} from 'expo-router';
import {SafeAreaScreen} from '../../src/components/SafeAreaScreen';
import {AppHeader} from '../../src/components/AppHeader';
import {Card} from '../../src/components/Card';
import {Button} from '../../src/components/Button';
import {NormalRepairPanel} from '../../src/components/crew/NormalRepairPanel';
import {CrewTaskBoundary,crewStatusLabel} from './tasks';
import {typography} from '../../src/design-tokens';
export default function CrewRepairCompleteScreen(){
 return <CrewTaskBoundary operational={false}>{task=><SafeAreaScreen scroll header={<AppHeader subtitle="Hồ sơ hoàn tất thi công" showBack onBack={()=>router.back()}/>}>
 <Card><Text style={typography.titleLg}>{task.title||'Nhiệm vụ hiện trường'}</Text><Text>{task.wo_code||'Chưa có mã WO'}</Text><Text>{crewStatusLabel(task.status)}</Text><Text>Thi công xong, gửi hồ sơ và được quản lý xác nhận là các bước riêng biệt.</Text></Card>
 {task.detail?.mode==='NORMAL'?<Card><NormalRepairPanel task={task} stage="closeout"/></Card>:<Card><Text>Chưa có ngữ cảnh sửa chữa theo kế hoạch phù hợp. Chức năng thi công chưa khả dụng.</Text></Card>}
 <Button title="Về chi tiết nhiệm vụ" variant="secondary" onPress={()=>router.replace({pathname:'/(crew)/wo-detail',params:{id:task.id,projectId:task.projectId}})}/>
 </SafeAreaScreen>}</CrewTaskBoundary>;
}

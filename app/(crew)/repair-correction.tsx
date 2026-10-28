import React from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import type { CrewTask } from '../../src/api/crewApi';
import { typography } from '../../src/design-tokens';
import { CrewTaskBoundary } from './tasks';

/** API-080 verifies current assignment/session even for a direct link to C-08.
 * No GPS/WO gate: this screen reads only. Task status is not PM review proof.
 */
export default function CrewRepairCorrectionScreen() {
  return <CrewTaskBoundary operational={false}>{task => <CorrectionReadOnly task={task} />}</CrewTaskBoundary>;
}

export function CorrectionReadOnly({ task }: { task: CrewTask }) {
  return <SafeAreaScreen scroll header={<AppHeader subtitle="Bổ sung hồ sơ sửa chữa" />}>
    <Card>
      <Text style={typography.titleMd}>Chưa thể xác minh yêu cầu bổ sung sửa chữa</Text>
      <Text selectable>Nhiệm vụ: {task.id}</Text>
      <Text selectable>Dự án: {task.projectId}</Text>
      <Text>Trạng thái nhiệm vụ từ máy chủ: {task.status || 'Chưa có dữ liệu'}</Text>
      <Text>Máy chủ chưa cung cấp nguồn đọc Crew để xác minh quyết định PM SUPPLEMENT, current attempt và current intake tương ứng.</Text>
      <Text>Trạng thái nhiệm vụ hoặc hồ sơ đang chờ PM không xác nhận có yêu cầu sửa. Chưa xác định được lý do bổ sung, hồ sơ cha và revision tiếp theo.</Text>
      <Text>Gửi bổ sung đang khóa. Cần đối chiếu yêu cầu PM, lineage hồ sơ và phiên bản hạng mục hiện tại trước khi lập revision mới.</Text>
      <Button variant="secondary" title="Gửi bổ sung sửa chữa" disabled onPress={() => {}} />
      <Text>Nháp, bằng chứng và nhật ký lệnh đã lưu được giữ nguyên. Màn này không tạo hoặc gửi lệnh bổ sung, không xác nhận PM đã nghiệm thu.</Text>
    </Card>
    <Button variant="secondary" title="Về chi tiết nhiệm vụ" onPress={() => router.replace({
      pathname: '/(crew)/wo-detail', params: { id: task.id, projectId: task.projectId },
    })} />
    <Button variant="secondary" title="Danh sách nhiệm vụ" onPress={() => router.replace('/(crew)/tasks')} />
  </SafeAreaScreen>;
}

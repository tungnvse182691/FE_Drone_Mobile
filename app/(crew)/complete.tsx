import React from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Button } from '../../src/components/Button';

/** Legacy route stays inert even when opened directly or through a deep link. */
export default function LockedRepairScreen() {
  return <SafeAreaScreen scroll>
    <Text>Màn thi công legacy đang khóa. Đối soát và thao tác NORMAL tại chi tiết nhiệm vụ.</Text>
    <Text>Không gửi lệnh hoặc tự xác nhận kết quả từ màn này.</Text>
    <Button variant="secondary" title="Về danh sách nhiệm vụ" onPress={() => router.replace('/(crew)/tasks')} />
  </SafeAreaScreen>;
}

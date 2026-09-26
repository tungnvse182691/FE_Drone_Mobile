import React from 'react';
import { Stack, usePathname } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { BottomNav } from '../../src/components/BottomNav';

const SUPERVISOR_TABS = [
  {
    icon: 'shield-outline' as const,
    label: 'Trang chủ',
    route: '/(sup)/home',
  },
  {
    icon: 'checkmark-circle-outline' as const,
    label: 'Phê duyệt',
    route: '/(sup)/approve',
    activePrefixes: ['/(sup)/approve', '/(sup)/signoff'],
  },
  {
    icon: 'bar-chart-outline' as const,
    label: 'Báo cáo',
    route: '/(sup)/reports',
    activePrefixes: ['/(sup)/reports', '/(sup)/export-modal', '/(sup)/risk'],
  },
  {
    icon: 'person-outline' as const,
    label: 'Hồ sơ',
    route: '/(sup)/profile',
  },
];

export default function SupervisorLayout() {
  const pathname = usePathname();

  return (
    <View style={styles.container}>
      <View style={styles.stackArea}>
        <Stack screenOptions={{ headerShown: false }} />
      </View>
      <BottomNav tabs={SUPERVISOR_TABS} activeRoute={pathname} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stackArea: {
    flex: 1,
  },
});

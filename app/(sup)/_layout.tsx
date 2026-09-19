import { Stack, usePathname } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { BottomNav } from '../../src/components/BottomNav';

const SUP_TABS = [
  { icon: 'home-outline' as const, label: 'Trang chủ', route: '/(sup)/home' },
  {
    icon: 'checkbox-outline' as const,
    label: 'Phê duyệt',
    route: '/(sup)/approve',
    activePrefixes: ['/(sup)/approve', '/(sup)/risk', '/(sup)/signoff'],
  },
  {
    icon: 'bar-chart-outline' as const,
    label: 'Báo cáo',
    route: '/(sup)/reports',
    activePrefixes: ['/(sup)/reports', '/(sup)/export-modal'],
  },
  { icon: 'person-outline' as const, label: 'Hồ sơ', route: '/(sup)/profile' },
];

export default function SupLayout() {
  const pathname = usePathname();

  return (
    <View style={styles.container}>
      <View style={styles.stackArea}>
        <Stack screenOptions={{ headerShown: false }} />
      </View>
      <BottomNav tabs={SUP_TABS} activeRoute={pathname} />
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

import { Stack, usePathname } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { BottomNav } from '../../src/components/BottomNav';

const DRONE_TABS = [
  { icon: 'home', iconFamily: 'material' as const, label: 'Trang chủ', route: '/(drone)/home' },
  {
    icon: 'flight-takeoff',
    iconFamily: 'material' as const,
    label: 'Khảo sát',
    route: '/(drone)/requests',
    activePrefixes: ['/(drone)/requests', '/(drone)/request-detail', '/(drone)/request', '/(drone)/log'],
  },
  {
    icon: 'sync',
    iconFamily: 'material' as const,
    label: 'Đồng bộ',
    route: '/(drone)/sync',
    activePrefixes: ['/(drone)/sync', '/(drone)/upload'],
  },
  { icon: 'person', iconFamily: 'material' as const, label: 'Hồ sơ', route: '/(drone)/profile' },
];

export default function DroneLayout() {
  const pathname = usePathname();
  const normalizedPath = pathname === '/' ? '' : pathname;
  const activeRoute = normalizedPath.startsWith('/(drone)')
    ? normalizedPath
    : `/(drone)${normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`}`;

  return (
    <View style={styles.container}>
      <View style={styles.stackArea}>
        <Stack screenOptions={{ headerShown: false }} />
      </View>
      <BottomNav tabs={DRONE_TABS} activeRoute={activeRoute} />
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

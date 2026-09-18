import { Stack, usePathname } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { BottomNav } from '../../src/components/BottomNav';

const DRONE_TABS = [
  { icon: 'home-outline' as const, label: 'Trang chủ', route: '/(drone)/home' },
  {
    icon: 'document-text-outline' as const,
    label: 'Yêu cầu',
    route: '/(drone)/requests',
    activePrefixes: ['/(drone)/request'],
  },
  {
    icon: 'cloud-upload-outline' as const,
    label: 'Đồng bộ',
    route: '/(drone)/sync',
    activePrefixes: ['/(drone)/sync', '/(drone)/upload', '/(drone)/log'],
  },
  { icon: 'person-outline' as const, label: 'Hồ sơ', route: '/(drone)/profile' },
];


export default function DroneLayout() {
  const pathname = usePathname();

  return (
    <View style={styles.container}>
      <View style={styles.stackArea}>
        <Stack screenOptions={{ headerShown: false }} />
      </View>
      <BottomNav tabs={DRONE_TABS} activeRoute={pathname} />
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

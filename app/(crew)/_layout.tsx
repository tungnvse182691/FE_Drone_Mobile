import { Stack, usePathname } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { BottomNav } from '../../src/components/BottomNav';

const CREW_TABS = [
  { icon: 'home', iconFamily: 'material' as const, label: 'Trang chủ', route: '/(crew)/home' },
  {
    icon: 'assignment',
    iconFamily: 'material' as const,
    label: 'Công việc',
    route: '/(crew)/tasks',
    activePrefixes: [
      '/(crew)/tasks',
      '/(crew)/wo-detail',
      '/(crew)/navigation',
      '/(crew)/progress',
      '/(crew)/report-defect',
      '/(crew)/viewfinder',
      '/(crew)/complete',
    ],
  },
  { icon: 'sync', iconFamily: 'material' as const, label: 'Đồng bộ', route: '/(crew)/sync' },
  { icon: 'person', iconFamily: 'material' as const, label: 'Hồ sơ', route: '/(crew)/profile' },
];

export default function CrewLayout() {
  const pathname = usePathname();
  const normalizedPath = pathname === '/' ? '' : pathname;
  const activeRoute = normalizedPath.startsWith('/(crew)')
    ? normalizedPath
    : `/(crew)${normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`}`;

  return (
    <View style={styles.container}>
      <View style={styles.stackArea}>
        <Stack screenOptions={{ headerShown: false }} />
      </View>
      <BottomNav tabs={CREW_TABS} activeRoute={activeRoute} />
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
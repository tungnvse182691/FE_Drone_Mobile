import { Stack, usePathname } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { BottomNav } from '../../src/components/BottomNav';

const PM_TABS = [
  { icon: 'home-outline' as const, label: 'Trang chủ', route: '/(pm)/home' },
  {
    icon: 'document-text-outline' as const,
    label: 'Khảo sát',
    route: '/(pm)/surveys',
    activePrefixes: ['/(pm)/surveys', '/(pm)/create-survey'],
  },
  {
    icon: 'mail-unread-outline' as const,
    label: 'Hộp thư AI',
    route: '/(pm)/ai-inbox',
    activePrefixes: [
      '/(pm)/ai-inbox',
      '/(pm)/verify-a',
      '/(pm)/verify-b',
      '/(pm)/field-task',
      '/(pm)/batching',
      '/(pm)/submit-approval',
      '/(pm)/resubmit',
      '/(pm)/submitted-tab',
    ],
  },
  { icon: 'person-outline' as const, label: 'Hồ sơ', route: '/(pm)/profile' },
];

export default function PmLayout() {
  const pathname = usePathname();

  return (
    <View style={styles.container}>
      <View style={styles.stackArea}>
        <Stack screenOptions={{ headerShown: false }} />
      </View>
      <BottomNav tabs={PM_TABS} activeRoute={pathname} />
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
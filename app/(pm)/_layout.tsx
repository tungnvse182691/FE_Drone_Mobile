import { Stack, usePathname } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { BottomNav } from '../../src/components/BottomNav';

const PM_TABS = [
  { icon: 'home-outline' as const, label: 'Tổng quan', route: '/(pm)/home' },
  {
    icon: 'document-text-outline' as const,
    label: 'Khảo sát',
    route: '/(pm)/surveys',
    activePrefixes: ['/(pm)/surveys', '/(pm)/create-survey'],
  },
  {
    icon: 'mail-unread-outline' as const,
    label: 'Lỗi AI (10)',
    route: '/(pm)/ai-inbox',
    activePrefixes: [
      '/(pm)/ai-inbox',
      '/(pm)/verify-a',
      '/(pm)/verify-b',
      '/(pm)/field-task',
    ],
  },
  {
    icon: 'layers-outline' as const,
    label: 'Gộp đợt',
    route: '/(pm)/batching',
    activePrefixes: [
      '/(pm)/batching',
      '/(pm)/submit-approval',
      '/(pm)/resubmit',
      '/(pm)/submitted-tab',
      '/(pm)/assign-crew',
      '/(pm)/wo-confirm',
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
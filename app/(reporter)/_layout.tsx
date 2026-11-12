import React from 'react';
import { Stack, usePathname, useRouter } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomNav, NavTab } from '../../src/components/BottomNav';
import { useAuthStore } from '../../src/store/auth';
import { isReporterSession } from '../../src/api/uploads';
import {
  PUBLIC_ROUTE_GROUP,
  REPORTER_ACCOUNT,
  REPORTER_CAPTURE,
  REPORTER_FEEDBACK,
  REPORTER_HOME,
  REPORTER_PROFILE,
  REPORTER_REPORT,
  REPORTER_REPORT_DETAIL,
  REPORTER_REPORT_SUPPLEMENT,
  REPORTER_TRACK,
  REPORTER_UPLOADS,
} from '../../src/constants/routes';

const TABS: NavTab[] = [
  { label: 'Trang chủ', route: REPORTER_HOME, icon: 'home', iconFamily: 'material' },
  {
    label: 'Gửi phản ánh',
    route: REPORTER_REPORT,
    icon: 'add-circle',
    iconFamily: 'material',
    activeRoutes: [REPORTER_REPORT, REPORTER_UPLOADS, REPORTER_CAPTURE],
  },
  {
    label: 'Phản ánh của tôi',
    route: REPORTER_TRACK,
    icon: 'description',
    iconFamily: 'material',
    activeRoutes: [REPORTER_TRACK, REPORTER_REPORT_DETAIL, REPORTER_REPORT_SUPPLEMENT, REPORTER_FEEDBACK],
  },
  {
    label: 'Tài khoản',
    route: REPORTER_ACCOUNT,
    icon: 'person',
    iconFamily: 'material',
    activeRoutes: [REPORTER_ACCOUNT, REPORTER_PROFILE],
  },
];

export default function ReporterLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const navigate = (route: string) => {
    const session = useAuthStore.getState();
    if ((route === REPORTER_UPLOADS || route === REPORTER_TRACK) && !isReporterSession(session)) {
      Alert.alert('Cần đăng nhập',
        route === REPORTER_UPLOADS
          ? 'Đăng nhập để xem hàng đợi ảnh của tài khoản.'
          : 'Đăng nhập để xem các phản ánh của tài khoản.',
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Đăng nhập', onPress: () => {
            const live = useAuthStore.getState();
            if (live.token !== session.token || live.status !== session.status ||
                live.user?.id !== session.user?.id || live.user?.role_code !== session.user?.role_code ||
                live.user?.must_change_password !== session.user?.must_change_password) return;
            router.push('/(auth)');
          } },
        ]);
      return;
    }
    router.push(route);
  };
  // usePathname omits route groups in normal navigation. Match the group
  // segment exactly when supplied; tab selection uses complete routes only.
  const segments = pathname.split('/').filter(Boolean);
  const activeRoute = `/${(segments[0] === PUBLIC_ROUTE_GROUP
    ? segments : [PUBLIC_ROUTE_GROUP, ...segments]).join('/')}`;

  return (
    <View style={styles.container}>
      <View style={styles.stackArea}>
        <Stack screenOptions={{ headerShown: false }} />
      </View>
      <SafeAreaView edges={['bottom']}>
        <BottomNav tabs={TABS} activeRoute={activeRoute} onNavigate={navigate} />
      </SafeAreaView>
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

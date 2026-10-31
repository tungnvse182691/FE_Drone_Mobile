import React from 'react';
import { Stack, usePathname, useRouter } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';
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
  REPORTER_REPORT_SUPPLEMENT,
  REPORTER_TRACK,
  REPORTER_UPLOADS,
} from '../../src/constants/routes';

const TABS: NavTab[] = [
  { label: 'Trang chủ', route: REPORTER_HOME, icon: 'home', iconFamily: 'material' },
  {
    label: 'Phản ánh',
    route: REPORTER_REPORT,
    icon: 'add-circle',
    iconFamily: 'material',
    activePrefixes: [REPORTER_REPORT, REPORTER_REPORT_SUPPLEMENT],
  },
  {
    label: 'Ảnh',
    route: REPORTER_UPLOADS,
    icon: 'photo-library',
    iconFamily: 'material',
    activePrefixes: [REPORTER_UPLOADS, REPORTER_CAPTURE],
  },
  {
    label: 'Tra cứu',
    route: REPORTER_TRACK,
    icon: 'search',
    iconFamily: 'material',
    activePrefixes: [REPORTER_TRACK, REPORTER_FEEDBACK],
  },
  {
    label: 'Tài khoản',
    route: REPORTER_ACCOUNT,
    icon: 'person',
    iconFamily: 'material',
    activePrefixes: [REPORTER_ACCOUNT, REPORTER_PROFILE],
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
          : 'Đăng nhập để tra cứu các phản ánh của tài khoản.',
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
  const prefix = `/${PUBLIC_ROUTE_GROUP}`;
  const normalizedPath = pathname === '/' ? '' : pathname;
  const activeRoute = normalizedPath.startsWith(prefix)
    ? normalizedPath
    : `${prefix}${normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`}`;

  return (
    <View style={styles.container}>
      <View style={styles.stackArea}>
        <Stack screenOptions={{ headerShown: false }} />
      </View>
      <BottomNav tabs={TABS} activeRoute={activeRoute} onNavigate={navigate} />
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

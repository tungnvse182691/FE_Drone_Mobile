import React, { useEffect, useState } from 'react';
import { Stack, usePathname, useRouter } from 'expo-router';
import { Alert, Keyboard, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useReporterKeyboard } from '../../src/components/reporter/keyboardVisibility';
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
  const keyboardOpening = useReporterKeyboard(state => state.opening);
  const [keyboardVisible, setKeyboardVisible] = useState(() => Keyboard.isVisible());
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [navigationHeight, setNavigationHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => { setKeyboardVisible(false); useReporterKeyboard.getState().setOpening(false); });
    return () => { show.remove(); hide.remove(); useReporterKeyboard.getState().setOpening(false); };
  }, []);
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
    <View style={styles.container} onLayout={({ nativeEvent: { layout } }) => {
      setViewport(previous => {
        const height = previous.width === layout.width ? Math.max(previous.height, layout.height) : layout.height;
        return previous.width === layout.width && previous.height === height ? previous : { width: layout.width, height };
      });
    }}>
      <View style={[styles.stackArea, { marginBottom: !keyboardVisible && !keyboardOpening ? navigationHeight : 0 }]}>
        <Stack screenOptions={{ headerShown: false }} />
      </View>
      {/* Keep the dock at the unresized bottom. Android clips it immediately
          when the IME resizes the window, even before JS receives focus/show. */}
      {!keyboardVisible && !keyboardOpening ? <View testID="reporter-navigation-dock" pointerEvents="box-none"
        style={[styles.navigationDock, { height: viewport.height || '100%' }]}>
        <SafeAreaView edges={['bottom']} onLayout={event => setNavigationHeight(event.nativeEvent.layout.height)}>
        <BottomNav tabs={TABS} activeRoute={activeRoute} onNavigate={navigate} />
        </SafeAreaView>
      </View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  navigationDock: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    justifyContent: 'flex-end',
  },
  stackArea: {
    flex: 1,
  },
});

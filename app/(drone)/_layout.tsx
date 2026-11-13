import React from 'react';
import { Stack, usePathname } from 'expo-router';
import { Keyboard, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomNav } from '../../src/components/BottomNav';

const DRONE_TABS = [
  { icon: 'home', iconFamily: 'material' as const, label: 'Trang chủ', route: '/(drone)/home' },
  {
    icon: 'flight-takeoff',
    iconFamily: 'material' as const,
    label: 'Khảo sát',
    route: '/(drone)/requests',
    activePrefixes: [
      '/(drone)/requests',
      '/(drone)/request-detail',
      '/(drone)/request-decline',
      '/(drone)/work-package',
      '/(drone)/request',
      '/(drone)/log',
    ],
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
  const [keyboardVisible, setKeyboardVisible] = React.useState(() => Keyboard.isVisible());
  const [viewport, setViewport] = React.useState({ width: 0, height: 0 });
  const [navigationHeight, setNavigationHeight] = React.useState(0);
  React.useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  const pathname = usePathname();
  const normalizedPath = pathname === '/' ? '' : pathname;
  const activeRoute = normalizedPath.startsWith('/(drone)')
    ? normalizedPath
    : `/(drone)${normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`}`;

  return (
    <View style={styles.container} onLayout={({ nativeEvent: { layout } }) => {
      setViewport(previous => {
        const height = previous.width === layout.width ? Math.max(previous.height, layout.height) : layout.height;
        return previous.width === layout.width && previous.height === height ? previous : { width: layout.width, height };
      });
    }}>
      <View style={[styles.stackArea, { marginBottom: keyboardVisible ? 0 : navigationHeight }]}>
        <Stack screenOptions={{ headerShown: false }} />
      </View>
      {!keyboardVisible ? <View testID="operator-navigation-dock" pointerEvents="box-none"
        style={[styles.navigationDock, { height: viewport.height || '100%' }]}>
        <SafeAreaView edges={['bottom']} onLayout={event => setNavigationHeight(event.nativeEvent.layout.height)}>
          <BottomNav tabs={DRONE_TABS} activeRoute={activeRoute} appearance="crew" />
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
  navigationDock: { position: 'absolute', top: 0, left: 0, right: 0, justifyContent: 'flex-end' },
  stackArea: {
    flex: 1,
  },
});

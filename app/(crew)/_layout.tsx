import React from 'react';
import { Stack, usePathname } from 'expo-router';
import { Keyboard, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
      '/(crew)/field-review',
      '/(crew)/complete',
      '/(crew)/repair-correction',
      '/(crew)/receiving',
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
    <CrewScreenShell hideDock={activeRoute === '/(crew)/viewfinder'}>
      <View style={styles.stackArea}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="field-review" dangerouslySingular={(_name, params) => params?.projectId && params?.id ? `${params.projectId}:${params.id}:${params.supplement === '1' ? 'supplement' : 'normal'}` : undefined} />
        </Stack>
      </View>
      <SafeAreaView edges={['bottom']}>
        <BottomNav tabs={CREW_TABS} activeRoute={activeRoute} appearance="crew" />
      </SafeAreaView>
    </CrewScreenShell>
  );
}

/** Hold the dock at the unresized bottom so Android clips it during IME resize. */
export function CrewScreenShell({ children, hideDock = false }: { children: React.ReactNode[]; hideDock?: boolean }) {
  const [keyboardVisible, setKeyboardVisible] = React.useState(() => Keyboard.isVisible());
  const [viewport, setViewport] = React.useState({ width: 0, height: 0 });
  const [navigationHeight, setNavigationHeight] = React.useState(0);
  React.useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  const dockVisible = !keyboardVisible && !hideDock;
  return <View style={styles.container} onLayout={({ nativeEvent: { layout } }) => {
    setViewport(previous => ({ width: layout.width, height: previous.width === layout.width ? Math.max(previous.height, layout.height) : layout.height }));
  }}>
    <View style={[styles.stackArea, { marginBottom: dockVisible ? navigationHeight : 0 }]}>{children[0]}</View>
    {dockVisible ? <View testID="crew-navigation-dock" pointerEvents="box-none" style={[styles.navigationDock, { height: viewport.height || '100%' }]}>
      <View onLayout={event => setNavigationHeight(event.nativeEvent.layout.height)}>{children[1]}</View>
    </View> : null}
  </View>;
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

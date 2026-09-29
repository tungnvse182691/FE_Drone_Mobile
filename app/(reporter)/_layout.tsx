import React from 'react';
import { Stack, usePathname } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { BottomNav, NavTab } from '../../src/components/BottomNav';
import {
  PUBLIC_ROUTE_GROUP,
  REPORTER_FEEDBACK,
  REPORTER_HOME,
  REPORTER_PROFILE,
  REPORTER_REPORT,
  REPORTER_TRACK,
} from '../../src/constants/routes';

const TABS: NavTab[] = [
  { label: 'Trang chủ', route: REPORTER_HOME, icon: 'home', iconFamily: 'material' },
  { label: 'Phản ánh', route: REPORTER_REPORT, icon: 'add-circle', iconFamily: 'material' },
  {
    label: 'Tra cứu',
    route: REPORTER_TRACK,
    icon: 'search',
    iconFamily: 'material',
    activePrefixes: [REPORTER_TRACK, REPORTER_FEEDBACK],
  },
  { label: 'Hồ sơ', route: REPORTER_PROFILE, icon: 'person', iconFamily: 'material' },
];

export default function ReporterLayout() {
  const pathname = usePathname();
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
      <BottomNav tabs={TABS} activeRoute={activeRoute} />
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

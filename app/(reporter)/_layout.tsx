import React from 'react';
import { Stack, usePathname } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { BottomNav, NavTab } from '../../src/components/BottomNav';
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

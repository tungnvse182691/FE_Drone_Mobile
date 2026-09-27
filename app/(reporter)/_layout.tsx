import React from 'react';
import { Stack, usePathname } from 'expo-router';
import { BottomNav, NavTab } from '../../src/components/BottomNav';
import {
  PUBLIC_ROUTE_GROUP,
  REPORTER_FEEDBACK,
  REPORTER_HOME,
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
];

export default function ReporterLayout() {
  const pathname = usePathname();
  const activeRoute = `/${PUBLIC_ROUTE_GROUP}${pathname === '/' ? '' : pathname}`;

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <BottomNav tabs={TABS} activeRoute={activeRoute} />
    </>
  );
}

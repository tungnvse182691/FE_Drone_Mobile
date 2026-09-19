import 'react-native-gesture-handler';
import { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { Redirect, Stack, useSegments } from 'expo-router';
import {
  Roboto_400Regular,
  Roboto_500Medium,
  Roboto_700Bold,
} from '@expo-google-fonts/roboto';
import { colors, typography } from '../src/design-tokens';
import { useAuthStore } from '../src/store/auth';
import { ROLE_HOMES } from '../src/constants/routes';
import { RoleCode } from '../src/types/enums';



const queryClient = new QueryClient();

let sansationFont: number | null = null;
try {
  sansationFont = require('../assets/fonts/Sansation.ttf');
} catch {
  sansationFont = null;
}

const APP_FONTS = {
  Roboto: Roboto_400Regular,
  'Roboto-Medium': Roboto_500Medium,
  'Roboto-Bold': Roboto_700Bold,
  ...(sansationFont ? { Sansation: sansationFont } : {}),
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts(APP_FONTS);

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[typography.titleMd, styles.loadingText]}>RoadGuard</Text>
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <AuthGuard>
        <Stack screenOptions={{ headerShown: false }} />
      </AuthGuard>
    </QueryClientProvider>
  );
}

const ROLE_GROUPS: Record<RoleCode, string> = {
  [RoleCode.DRONE_OPERATOR]: '(drone)',
  [RoleCode.REPAIR_CREW]: '(crew)',
  [RoleCode.PROJECT_MANAGER]: '(pm)',
  [RoleCode.SUPERVISOR]: '(sup)',
};

function AuthGuard({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const segments: string[] = useSegments();

  const inAuthGroup = segments[0] === '(auth)';
  const inForceChange = segments[1] === 'force-change-password';

  if (!user) {
    if (!inAuthGroup) {
      return <Redirect href="/(auth)" />;
    }
    return children;
  }

  if (user.must_change_password) {
    if (!inForceChange) {
      return <Redirect href="/(auth)/force-change-password" />;
    }
    return children;
  }

  if (inAuthGroup) {
    return <Redirect href={ROLE_HOMES[user.role_code]} />;
  }

  // Bảo vệ phân quyền vai trò: chống nhảy chéo sang màn role khác khi F5 trên Web
  const expectedGroup = ROLE_GROUPS[user.role_code];
  if (segments[0] && segments[0].startsWith('(') && segments[0] !== expectedGroup) {
    return <Redirect href={ROLE_HOMES[user.role_code]} />;
  }

  return children;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    backgroundColor: colors.surfaceAlt,
  },
  loadingText: {
    color: colors.primary,
    fontFamily: 'Sansation',
  },
});
import 'react-native-gesture-handler';
import { ReactNode, useEffect } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter, useSegments } from 'expo-router';
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
        <Image
          source={require('../assets/logo_hoanghai.png')}
          style={styles.loadingLogo}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color={colors.primary} />
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
  const router = useRouter();

  useEffect(() => {
    if (!segments || segments.length === 0) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inForceChange = segments[1] === 'force-change-password';

    if (!user) {
      if (!inAuthGroup) {
        router.replace('/(auth)');
      }
      return;
    }

    if (user.must_change_password) {
      if (!inForceChange) {
        router.replace('/(auth)/force-change-password');
      }
      return;
    }

    if (inAuthGroup) {
      router.replace(ROLE_HOMES[user.role_code] as any);
      return;
    }

    // Bảo vệ phân quyền vai trò: chống nhảy chéo sang màn role khác khi F5 trên Web
    const expectedGroup = ROLE_GROUPS[user.role_code];
    if (segments[0] && segments[0].startsWith('(') && segments[0] !== expectedGroup) {
      router.replace(ROLE_HOMES[user.role_code] as any);
    }
  }, [user, segments]);

  const inAuthGroup = segments[0] === '(auth)';
  // Ngăn chặn flicker: nếu chưa đăng nhập và chưa ở màn (auth), hiển thị splash sạch của Hoàng Hải thay vì render lén màn nội bộ
  if (!user && !inAuthGroup) {
    return (
      <View style={styles.loading}>
        <Image
          source={require('../assets/logo_hoanghai.png')}
          style={styles.loadingLogo}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    backgroundColor: '#FFFFFF',
  },
  loadingLogo: {
    width: 220,
    height: 120,
  },
});
import 'react-native-gesture-handler';
import { ReactNode, useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter, useSegments } from 'expo-router';
import {
  Roboto_400Regular,
  Roboto_500Medium,
  Roboto_700Bold,
} from '@expo-google-fonts/roboto';
import { colors } from '../src/design-tokens';
import { useAuthStore } from '../src/store/auth';
import {
  PUBLIC_ROUTE_GROUP,
  ROLE_GROUPS,
  ROLE_HOMES,
  WEB_ONLY_ROLE_MESSAGE,
} from '../src/constants/routes';
import { Toast } from '../src/components/Toast';



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
  const [fontsLoaded, fontError] = useFonts(APP_FONTS);
  const [fontTimeout, setFontTimeout] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFontTimeout(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!fontsLoaded && !fontError && !fontTimeout) {
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

const WEB_ONLY_TOAST_MS = 5000;

function AuthGuard({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const segments: string[] = useSegments();
  const router = useRouter();
  const [showWebOnlyToast, setShowWebOnlyToast] = useState(false);

  const isWebOnlyRole = !!user && !ROLE_HOMES[user.role_code];
  const inAuthGroup = segments[0] === '(auth)';
  const inPublicGroup = segments[0] === PUBLIC_ROUTE_GROUP;

  useEffect(() => {
    if (!isWebOnlyRole) return;
    setShowWebOnlyToast(true);
    const timer = setTimeout(() => setShowWebOnlyToast(false), WEB_ONLY_TOAST_MS);
    return () => clearTimeout(timer);
  }, [isWebOnlyRole]);

  useEffect(() => {
    if (!segments || segments.length === 0) return;

    if (inPublicGroup) return;

    const inForceChange = segments[1] === 'force-change-password';

    if (!user) {
      if (!inAuthGroup) {
        router.replace('/(auth)');
      }
      return;
    }

    if (isWebOnlyRole) {
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
    if (expectedGroup && segments[0] && segments[0].startsWith('(') && segments[0] !== expectedGroup) {
      router.replace(ROLE_HOMES[user.role_code] as any);
    }
  }, [user, segments, isWebOnlyRole, inPublicGroup]);

  return (
    <View style={styles.guardRoot}>
      {children}
      {showWebOnlyToast ? <Toast type="warning" message={WEB_ONLY_ROLE_MESSAGE} duration={WEB_ONLY_TOAST_MS} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  guardRoot: {
    flex: 1,
  },
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
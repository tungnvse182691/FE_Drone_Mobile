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


function AuthGuard({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const segments: string[] = useSegments();

  const inAuthGroup = segments[0] === '(auth)';
  const inForceChange = segments[1] === 'force-change-password';

  if (!user) {
    if (!inAuthGroup) {
      return           <Redirect href="/(auth)" />;
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
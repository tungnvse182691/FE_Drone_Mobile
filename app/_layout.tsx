import 'react-native-gesture-handler';
import { ReactNode, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
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
import { useReporterStore } from '../src/store/reporter';
import { reporterContext, assertReporterContext } from '../src/store/uploads';
import { Toast } from '../src/components/Toast';
import { hasAuthenticatedSession, type MobileSession } from '../src/api/uploads';



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

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <AuthGuard>
        <Stack screenOptions={{ headerShown: false }} />
        {!fontsLoaded && !fontError && !fontTimeout ? (
          <View style={styles.loading}>
            <Image source={require('../assets/logo_hoanghai.png')} style={styles.loadingLogo} resizeMode="contain" />
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : null}
      </AuthGuard>
    </QueryClientProvider>
  );
}

const WEB_ONLY_TOAST_MS = 5000;

/** Restored identity is not a session. Only the guest form/entry pages are public. */
export function authGuardDestination(session: MobileSession, segments: string[], hasForcedContext = false): string | null {
  if (!segments.length) return null;
  const inAuth = segments[0] === '(auth)';
  const inForceChange = inAuth && segments[1] === 'force-change-password';
  const publicPage = segments[0] === PUBLIC_ROUTE_GROUP &&
    ['home', 'report', 'account', 'capture'].includes(segments[1] ?? 'home');
  if (!hasAuthenticatedSession(session)) {
    // API-005 accepts credentials without Bearer. This context grants this form only.
    if (inForceChange && hasForcedContext) return null;
    return publicPage || (inAuth && !inForceChange) ? null : '/(auth)';
  }
  const role = session.user!.role_code as keyof typeof ROLE_HOMES;
  const home = ROLE_HOMES[role];
  if (!home) return inAuth ? null : '/(auth)';
  if (session.user!.must_change_password) {
    return inForceChange ? null : '/(auth)/force-change-password';
  }
  if (inForceChange) return null;
  if (inAuth) return home;
  if (segments[0]?.startsWith('(') && segments[0] !== ROLE_GROUPS[role]) return home;
  return null;
}

function AuthGuard({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const status = useAuthStore((state) => state.status);
  const forcedChangeUsername = useAuthStore((state) => state.forcedChangeUsername);
  const segments: string[] = useSegments();
  const router = useRouter();
  const [showWebOnlyToast, setShowWebOnlyToast] = useState(false);
  const [restoreError,setRestoreError]=useState(false),[restoreRetry,setRestoreRetry]=useState(0);

  const isWebOnlyRole = !!user && !ROLE_HOMES[user.role_code];

  useEffect(() => {
    if (!isWebOnlyRole) return;
    setShowWebOnlyToast(true);
    const timer = setTimeout(() => setShowWebOnlyToast(false), WEB_ONLY_TOAST_MS);
    return () => clearTimeout(timer);
  }, [isWebOnlyRole]);

  useEffect(() => {
    const destination = authGuardDestination({ user, token, status }, segments, !!forcedChangeUsername);
    let cancelled=false;
    setRestoreError(false);
    if (destination && segments[0] === '(auth)' && user?.role_code === 'REPORTER' &&
        hasAuthenticatedSession({ user, token, status }) && !user.must_change_password) {
      // One navigation owner: login commits the session, this guard waits for exact-owned restore.
      void (async()=>{
        try {
          const context=reporterContext();
          assertReporterContext(context);
          const draft=await useReporterStore.getState().restorePendingDraft();
          if(cancelled)return;
          assertReporterContext(context);
          const owned=draft?.ownerId===user.id&&draft.provenance?.environment===context.environment&&
            draft.provenance?.session===context.session&&!draft.retired;
          router.replace(owned ? (draft.targetReportId
            ? {pathname:'/(reporter)/report-supplement',params:{reportId:draft.targetReportId}}
            : '/(reporter)/report') : destination as any);
        }catch{
          // Failed restore is not evidence of empty data. Preserve the draft and offer explicit retry.
          const current=useAuthStore.getState();
          if(!cancelled&&current.user?.id===user.id&&current.token===token&&current.status===status)setRestoreError(true);
        }
      })();
    } else if (destination) router.replace(destination as any);
    return ()=>{cancelled=true;};
  }, [user, token, status, forcedChangeUsername, segments, router, restoreRetry]);

  return (
    <View style={styles.guardRoot}>
      {children}
      {restoreError ? <View accessibilityLiveRegion="polite">
        <Text>Chưa khôi phục được nháp. Dữ liệu được giữ nguyên; vui lòng thử lại.</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Thử khôi phục nháp" onPress={()=>setRestoreRetry(n=>n+1)}><Text>Thử khôi phục nháp</Text></Pressable>
      </View> : null}
      {showWebOnlyToast ? <Toast type="warning" message={WEB_ONLY_ROLE_MESSAGE} duration={WEB_ONLY_TOAST_MS} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  guardRoot: {
    flex: 1,
  },
  loading: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
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

import 'react-native-gesture-handler';
import { ReactNode, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter, useSegments } from 'expo-router';
import { AppFontGate } from '../src/components/AppFontGate';
import { colors } from '../src/design-tokens';
import { Button } from '../src/components/Button';
import { OperatorLocalTasks } from '../src/components/OperatorLocalTasks';
import { LocalSavedDrafts } from '../src/components/LocalSavedDrafts';
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

const fontScreenLayout = ({ children }: { children: ReactNode }) => <AppFontGate>{children}</AppFontGate>;

export default function RootLayout() {
  useEffect(() => {
    void useAuthStore.getState().restoreRefreshToken();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <AuthGuard>
        <Stack screenOptions={{ headerShown: false }} screenLayout={fontScreenLayout} />
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
  const authReady = useAuthStore((state) => state.authReady);
  const authRestoreError = useAuthStore((state) => state.authRestoreError);
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const status = useAuthStore((state) => state.status);
  const forcedChangeUsername = useAuthStore((state) => state.forcedChangeUsername);
  const segments: string[] = useSegments();
  const router = useRouter();
  const [showWebOnlyToast, setShowWebOnlyToast] = useState(false);
  const [restoreError,setRestoreError]=useState(false),[restoreRetry,setRestoreRetry]=useState(0);
  const [showLocalTasks, setShowLocalTasks] = useState(false);
  const closeLocalTasks = useCallback(() => setShowLocalTasks(false), []);

  const isWebOnlyRole = !!user && !ROLE_HOMES[user.role_code];

  useEffect(() => {
    if (!isWebOnlyRole) return;
    setShowWebOnlyToast(true);
    const timer = setTimeout(() => setShowWebOnlyToast(false), WEB_ONLY_TOAST_MS);
    return () => clearTimeout(timer);
  }, [isWebOnlyRole]);

  useEffect(() => {
    if (authReady === false) return;
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
          const draft=await useReporterStore.getState().restoreStartedCommand();
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
  }, [authReady, user, token, status, forcedChangeUsername, segments, router, restoreRetry]);

  return (
    <View style={styles.guardRoot}>
      {children}
      {authReady === false ? (
        <View style={styles.loading} accessibilityLiveRegion="polite">
          {showLocalTasks && authRestoreError && user?.role_code === 'DRONE_OPERATOR' ?
            <OperatorLocalTasks onClose={closeLocalTasks} /> :
            showLocalTasks && authRestoreError && !user?.must_change_password &&
              (user?.role_code === 'REPAIR_CREW' || user?.role_code === 'REPORTER') ?
            <LocalSavedDrafts role={user.role_code} onClose={closeLocalTasks} /> : <>
          <Image source={require('../assets/logo_hoanghai.png')} style={styles.loadingLogo} resizeMode="contain" />
          {authRestoreError ? <View style={styles.sessionRecovery}>
            <Text style={styles.sessionTitle}>Chưa kết nối được phiên đăng nhập</Text>
            <Text style={styles.sessionDescription}>Kiểm tra kết nối rồi thử lại. Nội dung đang gửi được giữ trên máy.</Text>
            <Button variant="primary" title="Thử lại" onPress={() => { void useAuthStore.getState().restoreRefreshToken(); }} />
            {user?.role_code === 'DRONE_OPERATOR' && !user.must_change_password ?
              <Button variant="text" title="Xem nhiệm vụ đã tải" onPress={() => setShowLocalTasks(true)} /> : null}
            {(user?.role_code === 'REPAIR_CREW' || user?.role_code === 'REPORTER') && !user.must_change_password ?
              <Button variant="text" title="Xem bản nháp đã lưu" onPress={() => setShowLocalTasks(true)} /> : null}
            <Button variant="text" title="Đến màn đăng nhập" onPress={() => {
              useAuthStore.getState().dismissAuthRestore();
              router.replace('/(auth)');
            }} />
          </View> : <ActivityIndicator size="large" color={colors.primary} />}
          </>}
        </View>
      ) : null}
      {restoreError ? <View accessibilityLiveRegion="polite">
        <Text>Chưa khôi phục được lệnh đang gửi. Dữ liệu được giữ nguyên; vui lòng thử lại.</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Thử khôi phục lệnh đang gửi" onPress={()=>setRestoreRetry(n=>n+1)}><Text>Thử khôi phục lệnh đang gửi</Text></Pressable>
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
  sessionRecovery: { width: '100%', maxWidth: 400, paddingHorizontal: 24, gap: 16 },
  sessionTitle: { fontFamily: 'Roboto-Bold', fontSize: 20, lineHeight: 28, color: colors.secondary, textAlign: 'center' },
  sessionDescription: { fontFamily: 'Roboto', fontSize: 15, lineHeight: 22, color: colors.secondary, textAlign: 'center' },
});

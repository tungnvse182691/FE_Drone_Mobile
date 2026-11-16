import React, { ReactNode, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { isLoaded, useFonts } from 'expo-font';
import { MaterialIcons } from '@expo/vector-icons';
import { Roboto_400Regular, Roboto_500Medium, Roboto_700Bold } from '@expo-google-fonts/roboto';
import { colors } from '../design-tokens';

let sansationFont: number | null = null;
try {
  sansationFont = require('../../assets/fonts/Sansation.ttf');
} catch {
  sansationFont = null;
}

const APP_FONTS = {
  Roboto: Roboto_400Regular,
  'Roboto-Medium': Roboto_500Medium,
  'Roboto-Bold': Roboto_700Bold,
  ...(sansationFont ? { Sansation: sansationFont } : {}),
  ...MaterialIcons.font,
};

/** Keep the navigator mounted; only mount screen contents once their fonts are ready. */
export function AppFontGate({ children }: { children: ReactNode }) {
  const [attempt, setAttempt] = useState(0);
  return <FontLoadAttempt key={attempt} onRetry={() => setAttempt(value => value + 1)}>{children}</FontLoadAttempt>;
}

export function FontLoadAttempt({ children, onRetry }: { children: ReactNode; onRetry: () => void }) {
  const [fontsLoaded, fontError] = useFonts(APP_FONTS);
  const [timedOut, setTimedOut] = useState(false);
  const iconLoaded = isLoaded(MaterialIcons.getFontFamily());
  const ready = fontsLoaded && iconLoaded && !fontError;
  const failed = !!fontError || (fontsLoaded && !iconLoaded) || timedOut;

  useEffect(() => {
    if (ready || fontError) return;
    const timer = setTimeout(() => setTimedOut(true), 15000);
    return () => clearTimeout(timer);
  }, [ready, fontError]);

  useEffect(() => {
    // Only font readiness, never raw errors, asset URLs or session information.
    if (__DEV__) console.info('[RoadGuard fonts]', {
      status: ready ? 'ready' : failed ? 'error' : 'loading',
      iconFamily: MaterialIcons.getFontFamily(), iconLoaded,
    });
  }, [ready, failed, iconLoaded]);

  if (ready) return children;
  return <View style={styles.loading} accessibilityLiveRegion="polite" testID="app-font-gate">
    <Image source={require('../../assets/logo_hoanghai.png')} style={styles.logo} resizeMode="contain" />
    {failed ? <>
      <Text style={styles.message}>Chưa tải được phông chữ và biểu tượng. Kiểm tra kết nối rồi thử lại.</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Thử lại tải phông chữ và biểu tượng"
        onPress={onRetry} style={styles.retry}>
        <Text style={styles.retryText}>Thử lại</Text>
      </Pressable>
    </> : <ActivityIndicator size="large" color={colors.primary} />}
  </View>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, backgroundColor: '#FFFFFF', padding: 24 },
  logo: { width: 220, height: 120 },
  // System font and a text-only retry remain usable if custom fonts fail.
  message: { color: colors.secondary, fontSize: 16, textAlign: 'center', maxWidth: 360 },
  retry: { minHeight: 48, minWidth: 120, padding: 14, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center' },
  retryText: { color: colors.secondary, fontSize: 16, fontWeight: '600' },
});

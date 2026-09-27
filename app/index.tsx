import { useEffect } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/auth';
import { ROLE_HOMES } from '../src/constants/routes';
import { colors } from '../src/design-tokens';

export default function RootIndex() {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.replace('/(auth)');
      return;
    }

    if (user.must_change_password) {
      router.replace('/(auth)/force-change-password');
      return;
    }

    const home = ROLE_HOMES[user.role_code];
    router.replace(home ? (home as any) : ('/(auth)' as any));
  }, [user]);

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

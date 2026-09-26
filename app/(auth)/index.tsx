import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../src/components/Button';
import { InputField } from '../../src/components/InputField';
import { colors, spacing, typography } from '../../src/design-tokens';
import { login as apiLogin } from '../../src/api/mock/auth';
import { useAuthStore } from '../../src/store/auth';
import { useRouter } from 'expo-router';
import { ROLE_HOMES } from '../../src/constants/routes';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);
  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiLogin(email, password);
      const loggedUser = response.data.user;
      login(loggedUser);
      if (loggedUser.must_change_password) {
        router.replace('/(auth)/force-change-password');
      } else {
        router.replace(ROLE_HOMES[loggedUser.role_code] as any);
      }
    } catch {
      setError('Sai tài khoản hoặc mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <Image source={require('../../assets/logo.png')} style={styles.logoImage} resizeMode="contain" />
          <Text style={[typography.headlineLg, styles.logo]}>HOÀNG HẢI</Text>
          <Text style={[typography.caption, styles.subtitle]}>
            Hệ thống quản lý bảo hành & sửa chữa hạ tầng đường bộ
          </Text>

          <View style={styles.form}>
            <InputField
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="email@hoanghai.vn"
            />
            <InputField
              label="Mật khẩu"
              value={password}
              onChangeText={setPassword}
              placeholder="Mật khẩu"
              secureTextEntry
            />
            {error ? <Text style={[typography.caption, styles.error]}>{error}</Text> : null}
            <Button
              variant="primary"
              title="Đăng nhập"
              onPress={handleLogin}
              loading={loading}
              disabled={!email || !password}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
  },
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.screenMargin,
  },
  logoImage: {
    width: 90,
    height: 90,
    alignSelf: 'center',
  },
  logo: {
    color: colors.brandGold,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  subtitle: {
    color: colors.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  form: {
    gap: spacing.sm,
  },
  error: {
    color: colors.error,
  },
});
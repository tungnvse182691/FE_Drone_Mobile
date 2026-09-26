import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../src/components/Button';
import { InputField } from '../../src/components/InputField';
import { colors, spacing, typography } from '../../src/design-tokens';
import { changePassword as apiChangePassword } from '../../src/api/mock/auth';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/auth';
import { ROLE_HOMES } from '../../src/constants/routes';


export default function ForceChangePasswordScreen() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const user = useAuthStore((state) => state.user);
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();

  const handleChangePassword = async () => {
    if (!user) {
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu mới không khớp');
      return;
    }
    if (newPassword === oldPassword) {
      setError('Mật khẩu mới không được trùng mật khẩu cũ');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiChangePassword(user.token, oldPassword, newPassword);
      const updatedUser = { ...user, must_change_password: false };
      login(updatedUser);
      router.replace(ROLE_HOMES[updatedUser.role_code] as any);

    } catch {
      setError('Mật khẩu cũ không đúng');
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
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={[typography.headlineLg, styles.brand]}>{'HOÀNG HẢI'}</Text>
          <Text style={[typography.titleLg, styles.title]}>Đổi mật khẩu</Text>
          <Text style={[typography.caption, styles.subtitle]}>
            Bạn phải đổi mật khẩu trước khi sử dụng ứng dụng
          </Text>

          <View style={styles.form}>
            <InputField
              label="Mật khẩu cũ"
              value={oldPassword}
              onChangeText={setOldPassword}
              placeholder="Mật khẩu cũ"
              secureTextEntry
            />
            <InputField
              label="Mật khẩu mới"
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Mật khẩu mới"
              secureTextEntry
            />
            <InputField
              label="Xác nhận mật khẩu mới"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Xác nhận mật khẩu mới"
              secureTextEntry
            />
            {error ? <Text style={[typography.caption, styles.error]}>{error}</Text> : null}
            <Button
              variant="primary"
              title="Đổi mật khẩu"
              onPress={handleChangePassword}
              loading={loading}
              disabled={!oldPassword || !newPassword || !confirmPassword}
            />
            <Button
              variant="secondary"
              title="Hủy & Quay lại Đăng nhập"
              onPress={() => {
                logout();
                router.replace('/(auth)');
              }}
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
    width: 80,
    height: 80,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  brand: {
    color: colors.brandGold,
    textAlign: 'center',
  },
  title: {
    color: colors.neutral,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  subtitle: {
    color: colors.secondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  form: {
    gap: spacing.sm,
  },
  error: {
    color: colors.error,
  },
});

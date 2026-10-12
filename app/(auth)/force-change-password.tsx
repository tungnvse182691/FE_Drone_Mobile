import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Button } from '../../src/components/Button';
import { InputField } from '../../src/components/InputField';
import { colors, spacing, typography } from '../../src/design-tokens';
import { changePassword as apiChangePassword } from '../../src/api/mock/auth';
import { useAuthStore } from '../../src/store/auth';
import { ROLE_HOMES } from '../../src/constants/routes';

export default function ForceChangePasswordScreen() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();

  const isForced = user?.must_change_password === true;

  const handleChangePassword = async () => {
    if (!user) {
      return;
    }
    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự');
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
      if (!token) {
        setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        logout();
        return;
      }
      await apiChangePassword(token, oldPassword, newPassword);
      const updatedUser = {
        ...user,
        token,
        must_change_password: false,
      };
      login(updatedUser);
      if (!isForced && router.canGoBack()) {
        router.back();
      } else {
        const home = ROLE_HOMES[updatedUser.role_code];
        router.replace(home ? (home as any) : ('/(auth)' as any));
      }
    } catch {
      setError('Mật khẩu cũ không đúng');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {!isForced && (
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.neutral} />
        </Pressable>
      )}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <Image
            source={require('../../assets/logo_hoanghai.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={[typography.headlineLg, styles.brand]}>{'HOÀNG HẢI'}</Text>
          <Text style={[typography.titleLg, styles.title]}>Đổi mật khẩu</Text>
          <Text style={[typography.caption, styles.subtitle]}>
            {isForced
              ? 'Bạn phải đổi mật khẩu trước khi sử dụng ứng dụng'
              : 'Nhập mật khẩu hiện tại và mật khẩu mới để cập nhật'}
          </Text>

          <View style={styles.form}>
            <InputField
              label="Mật khẩu cũ"
              value={oldPassword}
              onChangeText={setOldPassword}
              placeholder="Mật khẩu cũ"
              secureTextEntry={!showPassword}
            />
            <InputField
              label="Mật khẩu mới"
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Mật khẩu mới"
              secureTextEntry={!showPassword}
            />
            <Text style={[typography.caption, styles.hintText]}>Tối thiểu 6 ký tự</Text>
            <InputField
              label="Xác nhận mật khẩu mới"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Xác nhận mật khẩu mới"
              secureTextEntry={!showPassword}
            />

            <Pressable
              style={styles.showPasswordRow}
              onPress={() => setShowPassword((prev) => !prev)}
              accessibilityRole="button"
            >
              <MaterialIcons
                name={showPassword ? 'visibility-off' : 'visibility'}
                size={18}
                color={colors.secondary}
              />
              <Text style={[typography.caption, styles.showPasswordText]}>
                {showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              </Text>
            </Pressable>

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
              title={isForced ? 'Hủy & Quay lại Đăng nhập' : 'Quay lại'}
              onPress={() => {
                if (isForced) {
                  logout();
                  router.replace('/(auth)');
                } else {
                  router.back();
                }
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
  backButton: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.screenMargin,
    zIndex: 10,
    padding: spacing.xs,
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
  hintText: {
    color: colors.secondary,
    marginTop: -4,
  },
  showPasswordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  showPasswordText: {
    color: colors.secondary,
  },
  error: {
    color: colors.error,
  },
});

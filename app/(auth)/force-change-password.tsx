import { useRef, useState } from 'react';
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
import {
  changePasswordReal, forcedChangePasswordReal, passwordValidationMessage,
  passwordFailureMessage, passwordSessionIdentity, preparePasswordAttempt, type PasswordAttempt,
} from '../../src/api/authApi';
import { useAuthStore } from '../../src/store/auth';

export default function ForceChangePasswordScreen() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const status = useAuthStore((state) => state.status);
  const forcedUsername = useAuthStore((state) => state.forcedChangeUsername);
  const attempt = useRef<PasswordAttempt | null>(null);
  const busy = useRef(false);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();

  const hasSession = !!user && !!token && (status === 'AUTHENTICATED' || status === 'REFRESHING');
  const isForced = user?.must_change_password === true || !!forcedUsername;

  const handleChangePassword = async () => {
    if (busy.current) return;
    const validation = passwordValidationMessage(oldPassword, newPassword, confirmPassword);
    if (validation) { setError(validation); return; }
    if (!hasSession && !forcedUsername) {
      setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      return;
    }
    const identity = passwordSessionIdentity(token);
    if (hasSession && !identity) { setError('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.'); return; }
    const snapshot = { identity, userId: user?.id, forcedUsername };
    const stillOwnsForm = () => {
      const current = useAuthStore.getState();
      return passwordSessionIdentity(current.token) === snapshot.identity && current.user?.id === snapshot.userId &&
        current.forcedChangeUsername === snapshot.forcedUsername;
    };
    busy.current = true;
    setLoading(true);
    setError(null);
    const command = preparePasswordAttempt(attempt.current, {
      identity: hasSession ? identity! : forcedUsername!, mode: hasSession ? 'session' : 'forced',
      username: hasSession ? user!.phone_or_email : forcedUsername!,
      currentPassword: oldPassword, newPassword, confirmPassword,
    });
    attempt.current = command;
    try {
      if (command.mode === 'session') {
        await changePasswordReal(token!, command.currentPassword, command.newPassword, command.key);
      } else {
        await forcedChangePasswordReal({
          username: command.username, currentPassword: command.currentPassword,
          newPassword: command.newPassword, confirmPassword: command.confirmPassword, operationId: command.key,
        });
      }
      attempt.current = null;
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
      if (!stillOwnsForm()) return;
      // Candidate3 revokes sessions/security stamp on either password mutation.
      logout();
      router.replace({ pathname: '/(auth)', params: { passwordChanged: '1' } });
    } catch (caught) {
      if (stillOwnsForm()) setError(passwordFailureMessage(caught));
    } finally {
      busy.current = false;
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

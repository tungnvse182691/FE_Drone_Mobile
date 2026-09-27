import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Button } from '../../src/components/Button';
import { InputField } from '../../src/components/InputField';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { login as apiLogin } from '../../src/api/mock/auth';
import { useAuthStore } from '../../src/store/auth';
import { useRouter } from 'expo-router';
import { REPORTER_HOME, ROLE_HOMES } from '../../src/constants/routes';

export default function LoginScreen() {
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);
  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiLogin(phoneOrEmail, password);
      const loggedUser = response.data.user;
      login(loggedUser);
      if (loggedUser.must_change_password) {
        router.replace('/(auth)/force-change-password');
        return;
      }
      const home = ROLE_HOMES[loggedUser.role_code];
      if (home) {
        router.replace(home as any);
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
          <Image source={require('../../assets/logo_hoanghai.png')} style={styles.logoImage} resizeMode="contain" />
          <Text style={[typography.headlineLg, styles.logo]}>HOÀNG HẢI</Text>
          <Text style={[typography.caption, styles.subtitle]}>
            Hệ thống quản lý bảo hành & sửa chữa hạ tầng đường bộ
          </Text>

          <View style={styles.form}>
            <InputField
              label="Email hoặc Số điện thoại"
              value={phoneOrEmail}
              onChangeText={setPhoneOrEmail}
              placeholder="Nhập email @hoanghai.vn hoặc SĐT..."
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
              disabled={!phoneOrEmail || !password}
            />

            <View style={styles.quickTestSection}>
              <Text style={[typography.caption, styles.quickTestLabel]}>
                Tài khoản kiểm thử nhanh (Mật khẩu: 1):
              </Text>
              <View style={styles.quickTestRow}>
                <Pressable
                  style={({ pressed }) => [styles.quickTestChip, pressed && styles.quickTestChipPressed]}
                  onPress={() => {
                    setPhoneOrEmail('crew@hoanghai.vn');
                    setPassword('1');
                    setError(null);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Chọn tài khoản Đội Sửa Chữa"
                >
                  <MaterialIcons name="build" size={14} color={colors.brandGold} />
                  <Text style={styles.quickTestChipText}>Đội Sửa Chữa (1)</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [styles.quickTestChip, pressed && styles.quickTestChipPressed]}
                  onPress={() => {
                    setPhoneOrEmail('drone@hoanghai.vn');
                    setPassword('1');
                    setError(null);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Chọn tài khoản Phi Công Drone"
                >
                  <MaterialIcons name="flight-takeoff" size={14} color={colors.brandGold} />
                  <Text style={styles.quickTestChipText}>Phi Công Drone (1)</Text>
                </Pressable>
              </View>
            </View>
          </View>

          <View style={styles.reporterEntry}>
            <Text style={[typography.caption, styles.reporterDividerText]}>
              Bạn là người dân muốn phản ánh hư hại đường bộ?
            </Text>
            <Pressable
              onPress={() => router.push(REPORTER_HOME)}
              style={({ pressed }) => [styles.reporterCard, pressed && styles.reporterCardPressed]}
              accessibilityRole="link"
              accessibilityLabel="Mở cổng phản ánh dân sinh"
            >
              <MaterialIcons name="campaign" size={24} color={colors.brandGold} />
              <View style={styles.reporterCardText}>
                <Text style={[typography.titleMd, styles.reporterCardTitle]}>Cổng phản ánh dân sinh</Text>
                <Text style={[typography.caption, styles.reporterCardSubtitle]}>
                  Không cần tài khoản · Xác thực OTP qua email
                </Text>
              </View>
            </Pressable>
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
  reporterEntry: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  reporterDividerText: {
    color: colors.secondary,
    textAlign: 'center',
  },
  reporterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.cardPadding,
  },
  reporterCardPressed: {
    backgroundColor: colors.surfaceAlt,
  },
  reporterCardText: {
    flex: 1,
    gap: 2,
  },
  reporterCardTitle: {
    color: colors.brandGold,
  },
  reporterCardSubtitle: {
    color: colors.secondary,
  },
  quickTestSection: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  quickTestLabel: {
    color: colors.secondary,
    textAlign: 'center',
  },
  quickTestRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickTestChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickTestChipPressed: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.primary,
  },
  quickTestChipText: {
    ...typography.caption,
    color: colors.neutral,
    fontWeight: '600',
  },
});
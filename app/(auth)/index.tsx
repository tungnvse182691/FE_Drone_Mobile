import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Button } from '../../src/components/Button';
import { InputField } from '../../src/components/InputField';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { login as apiLogin } from '../../src/api/mock/auth';
import { useAuthStore } from '../../src/store/auth';
import { useReporterStore } from '../../src/store/reporter';
import { RoleCode } from '../../src/types/enums';
import { REPORTER_HOME, ROLE_HOMES } from '../../src/constants/routes';

export default function LoginScreen() {
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);
  const router = useRouter();

  const isSubmitDisabled = !phoneOrEmail.trim() || !password.trim();

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiLogin(phoneOrEmail, password);
      const loggedUser = response.data.user;
      login(loggedUser);
      if (loggedUser.role_code === RoleCode.REPORTER) {
        useReporterStore.getState().markVerified(loggedUser.phone_or_email);
      }
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

  const fillQuickTest = (account: string, pass: string) => {
    setPhoneOrEmail(account);
    setPassword(pass);
    setError(null);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header logo căn giữa trên nền surfaceAlt */}
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Image
                source={require('../../assets/logo_hoanghai_icon.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={[typography.headlineLg, styles.brandTitle]}>HOÀNG HẢI</Text>
            <Text style={[typography.caption, styles.subtitle]}>
              Hệ thống quản lý bảo hành & sửa chữa hạ tầng đường bộ
            </Text>
          </View>

          {/* Card trắng chứa form đăng nhập */}
          <View style={styles.loginCard}>
            <InputField
              label="Email hoặc Số điện thoại"
              value={phoneOrEmail}
              onChangeText={(text) => {
                setPhoneOrEmail(text);
                if (error) setError(null);
              }}
              placeholder="Nhập email @hoanghai.vn hoặc SĐT..."
            />
            <InputField
              label="Mật khẩu"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (error) setError(null);
              }}
              placeholder="Nhập mật khẩu"
              secureTextEntry
            />

            {error ? (
              <View style={styles.errorBox}>
                <MaterialIcons name="error-outline" size={16} color={colors.error} />
                <Text style={[typography.caption, styles.errorText]}>{error}</Text>
              </View>
            ) : null}

            <Button
              variant="primary"
              title="Đăng nhập"
              onPress={handleLogin}
              loading={loading}
              disabled={isSubmitDisabled}
              style={styles.submitButton}
            />

            {isSubmitDisabled ? (
              <Text style={[typography.caption, styles.disabledReason]}>
                Vui lòng nhập tài khoản và mật khẩu để tiếp tục
              </Text>
            ) : null}
          </View>

          {/* Block Tài khoản kiểm thử nhanh */}
          <View style={styles.quickTestSection}>
            <Text style={[typography.caption, styles.quickTestLabel]}>
              Tài khoản kiểm thử nhanh (Mật khẩu: 1)
            </Text>
            <View style={styles.quickTestRow}>
              <Pressable
                style={({ pressed }) => [styles.quickTestChip, pressed && styles.quickTestChipPressed]}
                onPress={() => fillQuickTest('crew@hoanghai.vn', '1')}
                accessibilityRole="button"
                accessibilityLabel="Chọn tài khoản Đội Sửa Chữa"
              >
                <MaterialIcons name="build" size={16} color={colors.brandGold} />
                <Text style={[typography.caption, styles.quickTestChipText]}>Đội Sửa Chữa</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.quickTestChip, pressed && styles.quickTestChipPressed]}
                onPress={() => fillQuickTest('drone@hoanghai.vn', '1')}
                accessibilityRole="button"
                accessibilityLabel="Chọn tài khoản Phi Công Drone"
              >
                <MaterialIcons name="flight-takeoff" size={16} color={colors.brandGold} />
                <Text style={[typography.caption, styles.quickTestChipText]}>Phi Công</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.quickTestChip, pressed && styles.quickTestChipPressed]}
                onPress={() => fillQuickTest('dan.nguyen@gmail.com', '1')}
                accessibilityRole="button"
                accessibilityLabel="Chọn tài khoản Người Dân"
              >
                <MaterialIcons name="person" size={16} color={colors.brandGold} />
                <Text style={[typography.caption, styles.quickTestChipText]}>Người Dân</Text>
              </Pressable>
            </View>
          </View>

          {/* reporterCard riêng ở cuối */}
          <View style={styles.reporterSection}>
            <Text style={[typography.caption, styles.reporterDividerText]}>
              Bạn là người dân muốn phản ánh hư hại đường bộ?
            </Text>
            <Pressable
              onPress={() => router.push(REPORTER_HOME)}
              style={({ pressed }) => [styles.reporterCard, pressed && styles.reporterCardPressed]}
              accessibilityRole="button"
              accessibilityLabel="Mở cổng phản ánh dân sinh"
            >
              <MaterialIcons name="campaign" size={24} color={colors.brandGold} />
              <View style={styles.reporterCardText}>
                <Text style={[typography.titleMd, styles.reporterCardTitle]}>
                  Cổng phản ánh dân sinh
                </Text>
                <Text style={[typography.caption, styles.reporterCardSubtitle]}>
                  Không cần tài khoản · Xác thực OTP qua email
                </Text>
              </View>
            </Pressable>
          </View>
        </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.screenMargin,
    paddingVertical: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoCircle: {
    width: 112,
    height: 112,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  logoImage: {
    width: 96,
    height: 96,
  },
  brandTitle: {
    color: colors.brandGold,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  subtitle: {
    color: colors.secondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  loginCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.cardPadding,
    marginBottom: spacing.md,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  errorText: {
    color: colors.error,
    flex: 1,
  },
  submitButton: {
    width: '100%',
  },
  disabledReason: {
    color: colors.secondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  quickTestSection: {
    marginBottom: spacing.lg,
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
    gap: 4,
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickTestChipPressed: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.brandGold,
  },
  quickTestChipText: {
    color: colors.neutral,
    fontWeight: '500',
  },
  reporterSection: {
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
});
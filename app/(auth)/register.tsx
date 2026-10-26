import { useState } from 'react';
import {
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
import { registerReporterReal, extractProblemCode } from '../../src/api/reporterApi';
import { clearCommandKey, getOrCreateCommandKey } from '../../src/api/idempotency';
import { AUTH_OTP_VERIFY } from '../../src/constants/routes';

type ReporterTypeValue = 'CITIZEN' | 'INVESTOR_REPRESENTATIVE';

const REPORTER_TYPES: { value: ReporterTypeValue; label: string; hint: string }[] = [
  { value: 'CITIZEN', label: 'Người dân', hint: 'Phản ánh hư hại trên tuyến đường' },
  {
    value: 'INVESTOR_REPRESENTATIVE',
    label: 'Đại diện Ban QLDA',
    hint: 'Theo dõi phản ánh thuộc dự án phụ trách',
  },
];

const REGISTER_ERRORS: Record<string, string> = {
  validation_error: 'Thông tin đăng ký chưa hợp lệ. Vui lòng kiểm tra lại.',
  identity_email_conflict: 'Email này đã có tài khoản. Vui lòng đăng nhập.',
  duplicate_request: 'Yêu cầu đăng ký đang được xử lý. Vui lòng thử lại sau.',
  internal_error: 'Hệ thống đang bận. Vui lòng thử lại sau ít phút.',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ReporterRegisterScreen() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [reporterType, setReporterType] = useState<ReporterTypeValue>('CITIZEN');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit =
    displayName.trim().length >= 2 &&
    EMAIL_PATTERN.test(email.trim()) &&
    password.length >= 8;

  const handleRegister = async () => {
    if (!canSubmit) {
      setError('Vui lòng nhập đủ họ tên, email hợp lệ và mật khẩu từ 8 ký tự.');
      return;
    }

    setLoading(true);
    setError(null);
    const normalizedEmail = email.trim().toLowerCase();
    const keyScope = `reporter:register:${normalizedEmail}`;
    try {
      const intent = await registerReporterReal(
        {
          email: normalizedEmail,
          password,
          displayName: displayName.trim(),
          reporterType,
        },
        getOrCreateCommandKey(keyScope),
      );
      clearCommandKey(keyScope);
      router.push({
        pathname: AUTH_OTP_VERIFY,
        params: { intentId: intent.intentId, email: normalizedEmail },
      });
    } catch (err) {
      clearCommandKey(keyScope);
      const code = extractProblemCode(err);
      setError(
        (code && REGISTER_ERRORS[code]) ||
          'Không đăng ký được. Vui lòng kiểm tra kết nối rồi thử lại.',
      );
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
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => router.back()}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Quay lại đăng nhập"
            >
              <MaterialIcons name="arrow-back" size={20} color={colors.secondary} />
            </Pressable>
            <Text style={[typography.titleMd, styles.headerTitle]}>Đăng ký người phản ánh</Text>
          </View>

          <View style={styles.card}>
            <Text style={[typography.caption, styles.intro]}>
              Tài khoản dùng email cá nhân. Mã xác thực sẽ được gửi tới email sau khi đăng ký.
            </Text>

            <InputField
              label="Họ và tên"
              value={displayName}
              onChangeText={(text) => {
                setDisplayName(text);
                if (error) setError(null);
              }}
              placeholder="Nguyễn Văn Dân"
              autoCapitalize="words"
            />
            <InputField
              label="Email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) setError(null);
              }}
              placeholder="ten@gmail.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <InputField
              label="Mật khẩu"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (error) setError(null);
              }}
              placeholder="Tối thiểu 8 ký tự"
              secureTextEntry
            />

            <Text style={[typography.labelSm, styles.typeLabel]}>BẠN THAM GIA VỚI VAI TRÒ</Text>
            <View style={styles.typeRow}>
              {REPORTER_TYPES.map((option) => {
                const selected = option.value === reporterType;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setReporterType(option.value)}
                    style={[styles.typeCard, selected && styles.typeCardActive]}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={option.label}
                  >
                    <MaterialIcons
                      name={selected ? 'radio-button-checked' : 'radio-button-unchecked'}
                      size={18}
                      color={selected ? colors.primaryDark : colors.secondary}
                    />
                    <View style={styles.typeText}>
                      <Text style={[typography.bodyMd, styles.typeTitle]}>{option.label}</Text>
                      <Text style={[typography.caption, styles.typeHint]}>{option.hint}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {error ? <Text style={[typography.caption, styles.error]}>{error}</Text> : null}

            <Button
              variant="primary"
              title="Đăng ký và nhận mã xác thực"
              loading={loading}
              disabled={loading || !canSubmit}
              onPress={handleRegister}
            />

            <Pressable
              onPress={() => router.replace('/(auth)')}
              style={styles.loginLink}
              accessibilityRole="button"
              accessibilityLabel="Quay về đăng nhập"
            >
              <Text style={[typography.caption, styles.loginLinkText]}>
                Đã có tài khoản? Đăng nhập
              </Text>
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
    paddingHorizontal: spacing.screenMargin,
    paddingVertical: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTitle: {
    marginLeft: spacing.sm,
    color: colors.secondary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  intro: {
    color: colors.secondary,
    marginBottom: spacing.xs,
  },
  typeLabel: {
    color: colors.secondary,
    marginTop: spacing.xs,
  },
  typeRow: {
    gap: spacing.xs,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.sm,
  },
  typeCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceAlt,
  },
  typeText: {
    flex: 1,
  },
  typeTitle: {
    color: colors.secondary,
  },
  typeHint: {
    color: colors.secondary,
    marginTop: 2,
  },
  error: {
    color: colors.error,
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  loginLinkText: {
    color: colors.primaryDark,
  },
});

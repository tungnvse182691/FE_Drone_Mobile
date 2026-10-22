import React, { useEffect, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../src/components/Button';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { MOCK_OTP, resendReporterRegistration, submitReport, verifyReporterIntent } from '../../src/api/mock/reporter';
import { useReporterStore } from '../../src/store/reporter';
import { useAuthStore } from '../../src/store/auth';
import { REPORTER_HOME, REPORTER_REPORT_DETAIL } from '../../src/constants/routes';
import {
  clearCommandKey,
  getOrCreateCommandKey,
  newCommandKey,
} from '../../src/api/idempotency';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

const errorMessages: Record<string, string> = {
  INTENT_NOT_FOUND: 'Phiên xác thực không còn hợp lệ. Vui lòng gửi lại mã.',
  OTP_INVALID: 'Mã xác thực không đúng. Vui lòng nhập lại.',
  EMAIL_INVALID: 'Email không hợp lệ.',
  DESCRIPTION_REQUIRED: 'Nội dung phản ánh bị trống.',
};

export default function OtpVerifyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ intentId?: string; email?: string }>();
  const intentId = params.intentId ?? '';
  const email = params.email ?? '';

  const pendingReport = useReporterStore((state) => state.pendingReport);
  const markVerified = useReporterStore((state) => state.markVerified);
  const clearPendingReport = useReporterStore((state) => state.clearPendingReport);
  const beginOtp = useAuthStore((state) => state.beginOtp);
  const markOtpVerified = useAuthStore((state) => state.markOtpVerified);

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const [activeIntentId, setActiveIntentId] = useState(intentId);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    setActiveIntentId(intentId);
    if (intentId) {
      beginOtp();
    }
  }, [intentId, beginOtp]);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleVerify = async () => {
    const finalCode = code === '1' ? '111111' : code;
    if (finalCode.length !== OTP_LENGTH) {
      setError(`Vui lòng nhập đủ ${OTP_LENGTH} ký tự mã xác thực (hoặc nhập 1).`);
      return;
    }
    if (!activeIntentId) {
      setError(errorMessages.INTENT_NOT_FOUND);
      return;
    }

    setLoading(true);
    setError(null);
    // Key bám theo (intent, mã đang nhập): retry cùng mã → replay; đổi mã → lệnh mới.
    const verifyScope = `reporter:verify:${activeIntentId}:${finalCode}`;
    const submitScope = `reporter:submit:${activeIntentId}`;
    try {
      const verified = await verifyReporterIntent(
        activeIntentId,
        finalCode,
        getOrCreateCommandKey(verifyScope),
      );
      clearCommandKey(verifyScope);
      markOtpVerified();

      // Luồng đăng ký thuần (RPT-01 → RPT-02): xác thực xong vào thẳng cổng phản ánh.
      if (!pendingReport) {
        markVerified(verified.email || email);
        router.replace(REPORTER_HOME);
        return;
      }

      const verifiedEmail = verified.email || email;
      markVerified(verifiedEmail);
      const { report } = await submitReport(pendingReport, {
        reporterEmail: verifiedEmail,
        idempotencyKey: getOrCreateCommandKey(submitScope),
      });
      clearCommandKey(submitScope);
      clearPendingReport();
      router.replace({ pathname: REPORTER_REPORT_DETAIL, params: { reportId: report.id } });
    } catch (err) {
      setError(errorMessages[(err as Error).message] ?? 'Không thể xác thực. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError(null);
    try {
      // API-011 gửi lại mã cho CÙNG intent; khoá mới vì đây là lệnh cố ý lặp lại.
      const resendScope = `reporter:resend:${activeIntentId}`;
      await resendReporterRegistration(activeIntentId, newCommandKey(resendScope));
      beginOtp();
      setCode('');
      setCooldown(RESEND_COOLDOWN);
      inputRef.current?.focus();
    } catch (err) {
      setError(errorMessages[(err as Error).message] ?? 'Không thể gửi lại mã.');
    } finally {
      setResending(false);
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
          <View style={styles.titleBlock}>
            <Text style={[typography.titleLg, styles.title]}>Xác thực phản ánh dân sinh</Text>
            <Text style={[typography.caption, styles.subtitle]}>
              Mã xác thực 6 số đã được gửi về email {email || 'của bạn'}. Vui lòng nhập mã để gửi phản ánh.
            </Text>
          </View>

          <Pressable onPress={() => inputRef.current?.focus()} accessibilityRole="button" accessibilityLabel="Nhập mã xác thực 6 số">
            <View style={styles.otpRow}>
              {Array.from({ length: OTP_LENGTH }).map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.otpBox,
                    index < code.length ? styles.otpBoxActive : null,
                    index === code.length ? styles.otpBoxFocused : null,
                  ]}
                >
                  <Text style={styles.otpDigit}>{code[index] ?? ''}</Text>
                </View>
              ))}
            </View>
          </Pressable>

          <TextInput
            ref={inputRef}
            value={code}
            onChangeText={(text) => {
              setCode(text.replace(/\D/g, '').slice(0, OTP_LENGTH));
              setError(null);
            }}
            keyboardType="number-pad"
            maxLength={OTP_LENGTH}
            autoFocus
            style={styles.hiddenInput}
            testID="otp-input"
          />

          {__DEV__ ? (
            <View style={styles.devHint}>
              <MaterialIcons name="info-outline" size={14} color={colors.brandGold} />
              <Text style={[typography.caption, styles.devHintText]}>
                Mã xác thực demo: {MOCK_OTP} (hoặc chỉ cần gõ 1)
              </Text>
              <Pressable
                onPress={() => {
                  setCode('111111');
                  setError(null);
                }}
                style={({ pressed }) => [styles.quickFillBtn, pressed && styles.quickFillBtnPressed]}
                accessibilityRole="button"
                accessibilityLabel="Điền nhanh 111111"
              >
                <Text style={styles.quickFillText}>Điền nhanh 111111</Text>
              </Pressable>
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorRow}>
              <MaterialIcons name="error-outline" size={16} color={colors.error} />
              <Text style={[typography.caption, styles.error]}>{error}</Text>
            </View>
          ) : null}

          <Button
            variant="primary"
            title="Xác nhận OTP"
            onPress={handleVerify}
            loading={loading}
            disabled={code.length !== OTP_LENGTH && code !== '1'}
          />

          <Button
            variant="text"
            title={cooldown > 0 ? `Gửi lại mã sau ${cooldown}s` : 'Gửi lại mã xác thực'}
            onPress={handleResend}
            disabled={cooldown > 0}
            loading={resending}
          />

          <Button
            variant="text"
            title="Quay lại màn phản ánh"
            onPress={() => router.back()}
          />
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
    width: 72,
    height: 72,
    alignSelf: 'center',
  },
  titleBlock: {
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  title: {
    color: colors.brandGold,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  otpBox: {
    width: 46,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxActive: {
    borderColor: colors.primary,
  },
  otpBoxFocused: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  otpDigit: {
    ...typography.titleLg,
    color: colors.onSurface,
  },
  hiddenInput: {
    ...typography.titleLg,
    color: 'transparent',
    position: 'absolute',
    opacity: 0,
    height: 1,
    width: 1,
  },
  devHint: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  devHintText: {
    color: colors.secondary,
    textAlign: 'center',
  },
  quickFillBtn: {
    marginTop: 4,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: 'rgba(201,162,39,0.15)',
    borderWidth: 1,
    borderColor: colors.brandGold,
  },
  quickFillBtnPressed: {
    backgroundColor: 'rgba(201,162,39,0.3)',
  },
  quickFillText: {
    ...typography.caption,
    color: colors.primaryDark,
    fontWeight: '700',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  error: {
    color: colors.error,
    flex: 1,
  },
});

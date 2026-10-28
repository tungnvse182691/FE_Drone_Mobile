import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../src/components/Button';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import {
  verifyReporterOtpReal,
  resendReporterOtpReal,
  extractProblemCode,
} from '../../src/api/reporterApi';
import { useReporterStore } from '../../src/store/reporter';
import { buildUserFromActor, useAuthStore } from '../../src/store/auth';
import { isValidReporterOtp, isReporterSession } from '../../src/api/uploads';
import { bareClient } from '../../src/api/client';
import { RoleCode } from '../../src/types/enums';
import { REPORTER_HOME } from '../../src/constants/routes';
import {
  getOrCreateCommandKey,
  clearCommandKey,
} from '../../src/api/idempotency';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;
function serverCooldown(value: unknown): number {
  const seconds = Number(value);
  return value != null && Number.isFinite(seconds) && seconds >= 0 ? Math.ceil(seconds) : RESEND_COOLDOWN;
}

const errorMessages: Record<string, string> = {
  not_found: 'Phiên xác thực không còn hợp lệ. Vui lòng đăng ký lại.',
  validation_error: 'Mã hoặc điều kiện xác thực chưa hợp lệ. Vui lòng kiểm tra lại.',
  identity_email_conflict: 'Email này đã có tài khoản. Vui lòng đăng nhập.',
  duplicate_request: 'Yêu cầu xung đột. Giữ nguyên nội dung để kiểm tra lại.',
  internal_error: 'Chưa xác nhận kết quả. Vui lòng thử lại với cùng yêu cầu.',
};

export default function OtpVerifyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ intentId?: string; email?: string; resendAfterSeconds?: string }>();
  const intentId = params.intentId ?? '';
  const email = params.email ?? '';

  const markVerified = useReporterStore((state) => state.markVerified);
  const beginOtp = useAuthStore((state) => state.beginOtp);
  const markOtpVerified = useAuthStore((state) => state.markOtpVerified);
  const login = useAuthStore((state) => state.login);

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(serverCooldown(params.resendAfterSeconds));
  const [activeIntentId, setActiveIntentId] = useState(intentId);
  const busy = useRef(false);
  const active = useRef(true);
  const generation = useRef(0);
  useFocusEffect(useCallback(() => {
    active.current = true;
    generation.current++;
    return () => { active.current = false; generation.current++; };
  }, [intentId]));
  const captureAttempt = () => {
    const capturedGeneration = generation.current;
    const environment = bareClient.defaults.baseURL;
    const { token, user, status } = useAuthStore.getState();
    const actorId = user?.id;
    return () => {
      const live = useAuthStore.getState();
      return active.current && generation.current === capturedGeneration &&
        bareClient.defaults.baseURL === environment && live.token === token &&
        live.user?.id === actorId && live.status === status;
    };
  };
  const cooldownUntil = useRef(Date.now() + serverCooldown(params.resendAfterSeconds) * 1000);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    setActiveIntentId(intentId);
    if (intentId) {
      if (!useAuthStore.getState().token) beginOtp();
    }
  }, [intentId, beginOtp]);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const timer = setTimeout(() => setCooldown(Math.max(0, Math.ceil((cooldownUntil.current - Date.now()) / 1000))), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleVerify = async () => {
    if (busy.current) return;
    const finalCode = code;
    if (!isValidReporterOtp(finalCode)) {
      setError(`Vui lòng nhập đủ ${OTP_LENGTH} số của mã xác thực.`);
      return;
    }
    if (!activeIntentId) {
      setError(errorMessages.not_found);
      return;
    }

    busy.current = true;
    setLoading(true);
    setError(null);
    // Key bám theo (intent, mã đang nhập): retry cùng mã → replay; đổi mã → lệnh mới.
    const environment = bareClient.defaults.baseURL;
    const isCurrent = captureAttempt();
    const verifyScope = `reporter:verify:${environment}:${activeIntentId}:${finalCode}`;
    try {
      const verified = await verifyReporterOtpReal(
        activeIntentId,
        finalCode,
        getOrCreateCommandKey(verifyScope),
      );
      if (!isCurrent()) return;
      markOtpVerified();

      // API-012 trả `AuthTokenResponseDto`: dựng phiên thật để các màn sau dùng chung auth store.
      const sessionEmail = verified.email || email;
      if (!verified.tokens.user) {
        setError('Máy chủ không trả về thông tin tài khoản. Vui lòng thử lại.');
        return;
      }
      const sessionUser = buildUserFromActor(
        verified.tokens.user,
        sessionEmail,
        verified.tokens.mustChangePassword,
      );
      if (!sessionUser || sessionUser.role_code !== RoleCode.REPORTER || !verified.tokens.accessToken) {
        setError('Chưa có phiên Reporter hợp lệ. Vui lòng đăng nhập lại.');
        return;
      }
      login(sessionUser, verified.tokens);
      if (sessionUser.must_change_password) {
        router.replace('/(auth)/force-change-password');
        return;
      }
      if (!isReporterSession(useAuthStore.getState())) return;
      markVerified(sessionEmail);
      const isLoggedInAttemptCurrent = captureAttempt();
      const draft = await useReporterStore.getState().bindPendingDraft();
      if (!isLoggedInAttemptCurrent()) return;
      router.replace(draft
        ? draft.targetReportId
          ? { pathname: '/(reporter)/report-supplement', params: { reportId: draft.targetReportId } }
          : '/(reporter)/report'
        : REPORTER_HOME);
    } catch (err) {
      if (!isCurrent()) return;
      const code = extractProblemCode(err);
      setError(errorMessages[code] ?? 'Không thể xác thực. Vui lòng thử lại.');
    } finally {
      busy.current = false;
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (busy.current || cooldown > 0 || !activeIntentId) return;
    busy.current = true;
    const isCurrent = captureAttempt();
    setResending(true);
    setError(null);
    try {
      // Retain the command until a confirmed response; timeout is not a new resend intent.
      const environment = bareClient.defaults.baseURL;
      const resendScope = `reporter:resend:${environment}:${activeIntentId}`;
      const response = await resendReporterOtpReal(activeIntentId, getOrCreateCommandKey(resendScope));
      if (!isCurrent()) return;
      clearCommandKey(resendScope);
      beginOtp();
      setCode('');
      const seconds = serverCooldown(response.resendAfterSeconds);
      cooldownUntil.current = Date.now() + seconds * 1000;
      setCooldown(seconds);
      inputRef.current?.focus();
    } catch (err) {
      if (!isCurrent()) return;
      const code = extractProblemCode(err);
      setError(errorMessages[code] ?? 'Không thể gửi lại mã.');
    } finally {
      busy.current = false;
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
            disabled={!isValidReporterOtp(code) || loading}
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

import { useCallback, useRef, useState } from 'react';
import {
  Image,
  Modal,
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
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '../../src/components/Button';
import { InputField } from '../../src/components/InputField';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { loginReal, requestPasswordRecoveryReal, extractProblemCode } from '../../src/api/authApi';
import { isReporterSession } from '../../src/api/uploads';
import { buildUserFromActor, useAuthStore } from '../../src/store/auth';
import { useReporterStore } from '../../src/store/reporter';
import { bareClient } from '../../src/api/client';
import {
  AUTH_REGISTER,
  REPORTER_HOME,
  ROLE_HOMES,
} from '../../src/constants/routes';

export default function LoginScreen() {
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);
  const router = useRouter();
  const { passwordChanged } = useLocalSearchParams<{ passwordChanged?: string }>();
  const busy = useRef(false);
  const active = useRef(true);
  const generation = useRef(0);
  useFocusEffect(useCallback(() => {
    active.current = true;
    generation.current++;
    const unsubscribe = useAuthStore.subscribe?.(() => { generation.current++; });
    return () => { active.current = false; generation.current++; unsubscribe?.(); setRecoveryOpen(false); setRecoveryEmail(''); setRecoveryMessage(''); };
  }, []));
  const captureAttempt = () => {
    const attempt = generation.current;
    const environment = bareClient.defaults.baseURL;
    const { token, user, status } = useAuthStore.getState();
    return () => {
      const live = useAuthStore.getState();
      return active.current && generation.current === attempt && bareClient.defaults.baseURL === environment &&
        live.token === token && live.user?.id === user?.id && live.status === status;
    };
  };

  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [recoveryLocked, setRecoveryLocked] = useState(false);
  const recoveryBusy = useRef(false);
  const requestRecovery = async () => {
    if (recoveryBusy.current || recoveryLocked) return;
    const email = recoveryEmail.trim().toLowerCase();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setRecoveryMessage('Vui lòng nhập email hợp lệ.'); return;
    }
    const isCurrent = captureAttempt();
    recoveryBusy.current = true; setRecoveryLocked(true); setRecoveryMessage('Đang gửi yêu cầu…');
    try {
      await requestPasswordRecoveryReal(email);
      if (isCurrent()) setRecoveryMessage('Đã tiếp nhận yêu cầu khôi phục mật khẩu.');
    } catch {
      if (isCurrent()) setRecoveryMessage('Chưa xác nhận được kết quả. Không tự gửi lại yêu cầu; bạn có thể chủ động chọn gửi yêu cầu khác.');
    } finally { recoveryBusy.current = false; }
  };

  const isSubmitDisabled = !phoneOrEmail.trim() || !password.trim();

  const handleLogin = async () => {
    if (busy.current) return;
    busy.current = true;
    const isCurrent = captureAttempt();
    setLoading(true);
    setError(null);
    try {
      // Wire: `AuthTokenResponseDto` camelCase trần — map sang `User` domain ở đây.
      const response = await loginReal(phoneOrEmail, password);
      if (!isCurrent()) return;
      if (!response.user) {
        setError('Máy chủ không trả về thông tin tài khoản. Vui lòng thử lại.');
        return;
      }
      const loggedUser = buildUserFromActor(
        response.user,
        phoneOrEmail.trim().toLowerCase(),
        response.mustChangePassword,
      );
      if (!loggedUser) {
        setError('Tài khoản không có vai trò hợp lệ cho ứng dụng di động.');
        return;
      }
      if (!response.accessToken) {
        setError('Chưa có phiên đăng nhập hợp lệ. Vui lòng thử lại.');
        return;
      }
      login(loggedUser, response);
      if (loggedUser.must_change_password) {
        router.replace('/(auth)/force-change-password');
        return;
      }
      if (isReporterSession(useAuthStore.getState())) {
        const reporter = useReporterStore.getState();
        reporter.markVerified(loggedUser.phone_or_email);
        // AuthGuard restores only an exact-owned draft before choosing the destination.
        return;
      }
      const home = ROLE_HOMES[loggedUser.role_code];
      if (home) {
        router.replace(home as any);
      }
    } catch (err: unknown) {
      if (!isCurrent()) return;
      const code = extractProblemCode(err);
      if (code === 'auth_invalid_credentials') {
        setError('Sai tài khoản hoặc mật khẩu.');
      } else if (code === 'auth_account_locked' || code === 'auth_account_disabled') {
        setError('Tài khoản đã bị khoá. Vui lòng liên hệ quản trị viên.');
      } else if (code === 'auth_password_change_required') {
        // Candidate3 normally returns 200 + mustChangePassword; handle explicit 403 too.
        useAuthStore.getState().beginForcedPasswordChange(phoneOrEmail);
        setPassword('');
        router.replace('/(auth)/force-change-password');
      } else {
        setError('Không kết nối được máy chủ. Kiểm tra mạng và thử lại.');
      }
    } finally {
      busy.current = false;
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Nền trang trí 2 mảng tròn vàng gold rất nhạt, pointerEvents none */}
      <View style={styles.decorCircleTop} pointerEvents="none" />
      <View style={styles.decorCircleBottom} pointerEvents="none" />

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
            <Text style={styles.brandTitle}>HOÀNG HẢI</Text>
            <View style={styles.brandDivider} />
            <Text style={[typography.caption, styles.subtitle]}>
              Hệ thống quản lý bảo hành & sửa chữa hạ tầng đường bộ
            </Text>
          </View>

          {/* Card trắng chứa form đăng nhập - bo 20, bóng nhẹ, tiêu đề Đăng nhập tác nghiệp */}
          <View style={styles.loginCard}>
            {passwordChanged === '1' ? (
              <Text style={[typography.caption, styles.pendingNoticeText]}>Đã đổi mật khẩu. Vui lòng đăng nhập lại bằng mật khẩu mới.</Text>
            ) : null}
            <Text style={[typography.titleMd, styles.cardTitle]}>Đăng nhập tác nghiệp</Text>

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

            <Button variant="secondary" title="Quên mật khẩu?" style={{ marginTop: spacing.sm }} disabled={loading} onPress={() => setRecoveryOpen(true)} />
            {isSubmitDisabled ? (
              <Text style={[typography.caption, styles.disabledReason]}>
                Vui lòng nhập tài khoản và mật khẩu để tiếp tục
              </Text>
            ) : null}
          </View>

          {/* Cổng phản ánh dân sinh: viền vàng trái 4px + icon trong vòng tròn + chevron-right */}
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
              <View style={styles.reporterIconCircle}>
                <MaterialIcons name="campaign" size={24} color={colors.brandGold} />
              </View>
              <View style={styles.reporterCardText}>
                <Text style={[typography.titleMd, styles.reporterCardTitle]}>
                  Cổng phản ánh dân sinh
                </Text>
                <Text style={[typography.caption, styles.reporterCardSubtitle]}>
                  Xem cổng phản ánh · Đăng nhập để gửi
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color={colors.brandGold} />
            </Pressable>

            <Pressable
              onPress={() => router.push(AUTH_REGISTER)}
              style={styles.registerLink}
              accessibilityRole="button"
              accessibilityLabel="Đăng ký tài khoản người phản ánh"
            >
              <Text style={[typography.caption, styles.registerLinkText]}>
                Chưa có tài khoản? Đăng ký người phản ánh
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal visible={recoveryOpen} transparent animationType="fade" onRequestClose={() => setRecoveryOpen(false)}>
        <SafeAreaView style={styles.safe}>
          <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.recoveryContent} keyboardShouldPersistTaps="handled">
          <View style={[styles.loginCard, styles.recoveryCard]}>
            <Text style={typography.titleMd}>Quên mật khẩu</Text>
            <InputField label="Email khôi phục" value={recoveryEmail} onChangeText={text => { if (!recoveryLocked) setRecoveryEmail(text); }} autoCapitalize="none" keyboardType="email-address" />
            <Text style={typography.bodyMd}>{recoveryMessage}</Text>
            <Button variant="primary" title="Gửi yêu cầu khôi phục" onPress={requestRecovery} disabled={recoveryLocked} />
            {recoveryLocked ? <Button variant="secondary" title="Chủ động gửi yêu cầu khác" onPress={() => {
              if (recoveryBusy.current) return;
              setRecoveryLocked(false); setRecoveryMessage('');
            }} /> : null}
            <Button variant="secondary" title="Đóng" onPress={() => setRecoveryOpen(false)} />
          </View>
          </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    position: 'relative',
    overflow: 'hidden',
  },
  decorCircleTop: {
    position: 'absolute',
    top: -90,
    right: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(201,162,39,0.08)',
  },
  decorCircleBottom: {
    position: 'absolute',
    bottom: -110,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(201,162,39,0.06)',
  },
  flex: {
    flex: 1,
  },
  recoveryContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.screenMargin,
    paddingVertical: spacing.lg,
  },
  recoveryCard: { gap: spacing.sm },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#1A1D20',
        shadowOpacity: 0.1,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 4,
      },
    }),
  },
  logoImage: {
    width: 104,
    height: 104,
  },
  brandTitle: {
    fontFamily: 'Sansation',
    fontSize: 27,
    fontWeight: '500',
    letterSpacing: 3,
    color: colors.brandGold,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  brandDivider: {
    width: 44,
    height: 3,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    marginVertical: spacing.sm,
  },
  subtitle: {
    color: colors.secondary,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  loginCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 20,
    marginBottom: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#1A1D20',
        shadowOpacity: 0.08,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardTitle: {
    color: colors.neutral,
    marginBottom: spacing.sm,
  },
  pendingNoticeText: {
    color: colors.info,
    flexShrink: 1,
    marginBottom: spacing.sm,
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
    minHeight: 54,
    borderRadius: radius.lg,
    marginTop: spacing.xs,
    width: '100%',
  },
  disabledReason: {
    color: colors.secondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  demoSection: {
    marginBottom: spacing.lg,
  },
  demoToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  demoToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  demoToggleText: {
    color: colors.secondary,
  },
  demoBox: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 16,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  demoHint: {
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
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickTestChipPressed: {
    backgroundColor: colors.surface,
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
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    padding: spacing.cardPadding,
  },
  reporterCardPressed: {
    backgroundColor: colors.surfaceAlt,
  },
  reporterIconCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: 'rgba(201,162,39,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reporterCardText: {
    flex: 1,
    gap: 2,
  },
  reporterCardTitle: {
    color: colors.neutral,
  },
  reporterCardSubtitle: {
    color: colors.secondary,
  },
  registerLink: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  registerLinkText: {
    color: colors.primaryDark,
  },
});

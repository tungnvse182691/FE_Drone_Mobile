import React, { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Button } from '../../src/components/Button';
import { InputField } from '../../src/components/InputField';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { useAuthStore } from '../../src/store/auth';
import { RoleCode } from '../../src/types/enums';
import { requestPasswordRecovery } from '../../src/api/mock/auth';
import {
  AUTH_FORCE_CHANGE_PASSWORD,
  REPORTER_PROFILE,
} from '../../src/constants/routes';

const softShadow = Platform.select({
  ios: { shadowColor: '#1A1D20', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  android: { elevation: 3 },
  default: {},
});

const ROLE_LABELS: Record<RoleCode, string> = {
  [RoleCode.REPAIR_CREW]: 'Đội sửa chữa hiện trường',
  [RoleCode.DRONE_OPERATOR]: 'Phi công drone khảo sát',
  [RoleCode.REPORTER]: 'Người dân phản ánh',
  [RoleCode.PROJECT_MANAGER]: 'Quản lý dự án',
  [RoleCode.SUPERVISOR]: 'Giám sát viên',
};

export default function ReporterAccountScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [recoveryEmail, setRecoveryEmail] = useState(user?.phone_or_email ?? '');
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const roleLabel = user ? ROLE_LABELS[user.role_code] ?? 'Người dùng' : 'Khách';

  const sendRecovery = async () => {
    setNotice(null);
    setError(null);
    if (!recoveryEmail.includes('@')) {
      setError('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }
    setRecoveryBusy(true);
    try {
      await requestPasswordRecovery(recoveryEmail);
      setNotice('Đã ghi nhận yêu cầu khôi phục mật khẩu. Vui lòng kiểm tra email để tiếp tục.');
    } catch {
      setError('Không gửi được yêu cầu khôi phục. Vui lòng thử lại.');
    } finally {
      setRecoveryBusy(false);
    }
  };

  const signOut = () => {
    logout();
    router.replace('/(auth)');
  };

  return (
    <SafeAreaScreen scroll>
      <Text style={[typography.titleLg, styles.title]}>Tài khoản</Text>
      <Text style={[typography.caption, styles.subtitle]}>
        Thông tin phiên đăng nhập và bảo mật tài khoản phản ánh.
      </Text>

      <View style={styles.card}>
        <View style={styles.identityRow}>
          <View style={styles.avatar}>
            <MaterialIcons name="person" size={22} color={colors.onPrimary} />
          </View>
          <View style={styles.identityText}>
            <Text style={[typography.labelLg, styles.name]} numberOfLines={1}>
              {user?.full_name ?? 'Khách'}
            </Text>
            <Text style={[typography.caption, styles.meta]} numberOfLines={1}>
              {user?.phone_or_email ?? 'Chưa đăng nhập'}
            </Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={[typography.caption, styles.infoLabel]}>Vai trò</Text>
          <Text style={[typography.caption, styles.infoValue]}>{roleLabel}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[typography.caption, styles.infoLabel]}>Mã nhân sự</Text>
          <Text style={[typography.caption, styles.infoValue]}>
            {user?.employee_code || 'Không áp dụng'}
          </Text>
        </View>
        {user?.is_reporter ? (
          <Text style={[typography.caption, styles.reporterTag]}>Tài khoản người dân phản ánh</Text>
        ) : null}
      </View>

      <Text style={[typography.labelLg, styles.sectionTitle]}>Bảo mật</Text>
      <View style={styles.card}>
        <Text style={[typography.caption, styles.sectionText]}>
          Đổi mật khẩu sẽ áp dụng cho cả trường hợp bắt buộc đổi mật khẩu khi đăng nhập lần đầu.
        </Text>
        <Button
          variant="primary"
          title="Đổi mật khẩu"
          onPress={() => router.push(AUTH_FORCE_CHANGE_PASSWORD)}
        />
        <View style={styles.gap} />
        <InputField
          label="Khôi phục mật khẩu qua email"
          value={recoveryEmail}
          onChangeText={setRecoveryEmail}
          placeholder="email@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          testID="account-recovery-email"
        />
        <Text style={[typography.caption, styles.sectionText]}>
          Ứng dụng chỉ gửi yêu cầu khôi phục, không tự đặt lại mật khẩu.
        </Text>
        <Button
          variant="secondary"
          title="Gửi yêu cầu khôi phục"
          onPress={() => void sendRecovery()}
          loading={recoveryBusy}
        />
      </View>

      {notice ? (
        <View style={styles.noticeRow}>
          <MaterialIcons name="info-outline" size={16} color={colors.info} />
          <Text style={[typography.caption, styles.noticeText]}>{notice}</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorRow}>
          <MaterialIcons name="error-outline" size={16} color={colors.error} />
          <Text style={[typography.caption, styles.errorText]}>{error}</Text>
        </View>
      ) : null}

      <Text style={[typography.labelLg, styles.sectionTitle]}>Khác</Text>
      <View style={styles.footer}>
        <Button
          variant="secondary"
          title="Xem hồ sơ phản ánh"
          onPress={() => router.push(REPORTER_PROFILE)}
        />
        <Button variant="text" title="Đăng xuất" onPress={signOut} />
      </View>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.brandGold },
  subtitle: { color: colors.secondary, marginTop: spacing.xs, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.cardPadding,
    gap: spacing.sm,
    marginBottom: spacing.lg,
    ...softShadow,
  },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityText: { flex: 1, gap: 2 },
  name: { color: colors.neutral },
  meta: { color: colors.secondary },
  divider: { height: 1, backgroundColor: colors.border },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  infoLabel: { color: colors.secondary },
  infoValue: { color: colors.neutral },
  reporterTag: { color: colors.brandGold },
  sectionTitle: { color: colors.secondary, marginBottom: spacing.sm },
  sectionText: { color: colors.secondary },
  gap: { height: spacing.xs },
  noticeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  noticeText: { color: colors.info, flex: 1 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  errorText: { color: colors.error, flex: 1 },
  footer: { gap: spacing.sm },
});

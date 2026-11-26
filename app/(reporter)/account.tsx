import { reporterAppearance } from '../../src/components/reporter/appearance';
import { ReporterHeader } from '../../src/components/ReporterHeader';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Button } from '../../src/components/reporter/Button';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { useAuthStore } from '../../src/store/auth';
import { RoleCode } from '../../src/types/enums';
import { isReporterSession } from '../../src/api/uploads';
import {
  AUTH_REGISTER,
  AUTH_FORCE_CHANGE_PASSWORD,
  REPORTER_PROFILE,
} from '../../src/constants/routes';

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
  const token = useAuthStore((state) => state.token);
  const status = useAuthStore((state) => state.status);
  const logout = useAuthStore((state) => state.logout);
  const reporterSession = isReporterSession({ user, token, status });

  const roleLabel = user ? ROLE_LABELS[user.role_code] ?? 'Người dùng' : 'Khách';

  const signOut = () => {
    logout();
    router.replace('/(auth)');
  };

  if (!reporterSession) return (
    <SafeAreaScreen scroll header={<ReporterHeader title="Tài khoản" />}>
      <View style={styles.card}>
        <Text style={typography.labelLg}>Khách</Text>
        <Text style={[typography.caption, styles.sectionText]}>
          Đăng nhập để sử dụng hồ sơ phản ánh và các chức năng bảo mật tài khoản.
        </Text>
        <Button variant="primary" title="Đăng nhập" onPress={() => router.push('/(auth)')} />
        <Button variant="secondary" title="Đăng ký" onPress={() => router.push(AUTH_REGISTER)} />
      </View>
    </SafeAreaScreen>
  );

  return (
    <SafeAreaScreen scroll header={<ReporterHeader title="Tài khoản" />}>
      <View style={styles.card}>
        <View style={styles.identityRow}>
          <View style={styles.avatar}>
            <MaterialIcons name="person" size={22} color={colors.neutral} />
          </View>
          <View style={styles.identityText}>
            <Text style={[typography.labelLg, styles.name]}>
              {user?.full_name ?? 'Khách'}
            </Text>
            <Text style={[typography.caption, styles.meta]}>
              {user?.phone_or_email ?? 'Chưa đăng nhập'}
            </Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={[typography.caption, styles.infoLabel]}>Vai trò</Text>
          <Text style={[typography.caption, styles.infoValue]}>{roleLabel}</Text>
        </View>

      </View>

      <Text style={[typography.labelLg, styles.sectionTitle]}>Bảo mật</Text>
      <View style={styles.card}>
        <Button
          variant="primary"
          title="Đổi mật khẩu"
          onPress={() => router.push(AUTH_FORCE_CHANGE_PASSWORD)}
        />
      </View>

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
  card: {
    padding: spacing.cardPadding,
    gap: spacing.sm,
    marginBottom: spacing.lg,
    ...reporterAppearance.card,
  },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: reporterAppearance.pressed,
    borderWidth: 1,
    borderColor: reporterAppearance.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityText: { flex: 1, gap: 2 },
  name: { color: colors.neutral },
  meta: { color: colors.secondary },
  divider: { height: 1, backgroundColor: colors.border },
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  infoLabel: { color: colors.secondary },
  infoValue: { color: colors.neutral },
  sectionTitle: { color: colors.neutral, marginBottom: spacing.sm },
  sectionText: { color: colors.secondary },
  footer: { gap: spacing.sm },
});

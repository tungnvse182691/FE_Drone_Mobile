import React, { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/auth';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { Toast } from '../../src/components/Toast';
import { useCrewInbox, CrewInboxState } from './tasks';
import { crewTaskIsComplete } from '../../src/api/crewApi';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

const PERFORMANCE_STATS = [
  {
    value: '',
    label: 'HOÀN THÀNH',
    color: colors.neutral,
  },
  {
    value: '',
    label: 'CHƯA HOÀN THÀNH',
    color: colors.primary,
  },
  {
    value: '',
    label: 'ĐÃ TẢI',
    color: colors.success,
  },
];

const SETTINGS_ROWS = [
  {
    icon: 'badge' as const,
    label: 'Thông tin cá nhân',
    action: 'profile' as const,
  },
  {
    icon: 'history' as const,
    label: 'Đổi mật khẩu',
    action: 'password' as const,
  },
  {
    icon: 'sync' as const,
    label: 'Cài đặt đồng bộ',
    subtitle: 'Tự động qua Wi-Fi • Lưu ngoại tuyến',
    action: 'sync' as const,
    route: '/(crew)/sync',
  },
  {
    icon: 'help-outline' as const,
    label: 'Trợ giúp & Hỗ trợ kỹ thuật',
    action: 'help' as const,
  },
];

/** Bỏ phần vai trò trong ngoặc, ví dụ "Nguyễn Văn Tuấn (Kỹ thuật viên)" -> "Nguyễn Văn Tuấn" */
function normalizeName(raw: string | undefined, fallback: string): string {
  const cleaned = (raw ?? '').replace(/\s*\([^)]*\)/g, '').trim();
  return cleaned.length > 0 ? cleaned : fallback;
}

export default function CrewProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const inbox = useCrewInbox();
  const completed = inbox.tasks.filter(crewTaskIsComplete).length;
  const displayName = normalizeName(inbox.enabled ? user?.full_name : undefined, 'Chưa có tên tài khoản');
  const logout = useAuthStore((state) => state.logout);
  const [toast, setToast] = useState<string | null>(null);

  const handleLogout = () => {
    logout();
    router.replace('/(auth)');
  };

  const handleRow = (row: (typeof SETTINGS_ROWS)[number]) => {
    switch (row.action) {
      case 'sync':
        router.push(row.route);
        return;
      case 'password':
        router.push('/(auth)/force-change-password');
        return;
      case 'profile':
        Alert.alert(
          'Thông tin cá nhân',
          `Họ tên: ${displayName}\nMã nhân viên: ${user?.employee_code ?? 'Chưa có dữ liệu'}\nVai trò: Kỹ thuật viên sửa chữa\nĐội phụ trách: Chưa có dữ liệu\nTrạng thái hoạt động: Chưa có dữ liệu`,
        );
        return;
      case 'help':
        Alert.alert(
          'Trợ giúp & Hỗ trợ kỹ thuật',
          'Hotline: 1900 8866\nEmail: hotro@hoanghai.vn',
        );
        return;
    }
  };

  return (
    <SafeAreaScreen scroll header={<AppHeader subtitle="Hồ Sơ" />}>
      <CrewInboxState inbox={inbox} />
      <View style={styles.profileHeader}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <MaterialIcons name="person" size={52} color={colors.secondary} />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đổi ảnh đại diện"
            style={styles.cameraBtn}
            onPress={() => setToast('Tính năng cập nhật ảnh đại diện sẽ đồng bộ qua tài khoản SSO')}
          >
            <MaterialIcons name="photo-camera" size={16} color={colors.surface} />
          </Pressable>
        </View>

        <Text style={[typography.titleLg, styles.name]}>{displayName}</Text>
        <Text style={[typography.bodyMd, styles.meta]}>
          Mã NV: {user?.employee_code ?? 'Chưa có dữ liệu'}
        </Text>
        <Text style={[typography.caption, styles.unit]}>
          Chưa có thông tin đội phụ trách
        </Text>
        <Text style={[typography.caption, styles.email]}>{inbox.enabled ? user?.phone_or_email ?? 'Chưa có dữ liệu liên hệ' : 'Chưa đăng nhập'}</Text>

        <View style={styles.roleChip}>
          <MaterialIcons name="build" size={14} color={colors.brandGold} />
          <Text style={[typography.labelSm, styles.roleText]}>Thợ đường</Text>
        </View>
      </View>

      <Card style={styles.statsCard}>
        <View style={styles.statsRow}>
          {PERFORMANCE_STATS.map((stat, idx) => (
            <React.Fragment key={stat.label}>
              {idx > 0 && <View style={styles.statDivider} />}
              <View style={styles.statCol}>
                <Text style={[typography.headlineLg, { color: stat.color, fontWeight: '700' }]}>
                  {inbox.error || inbox.query.isPending ? '—' : String(idx === 0 ? completed : idx === 1 ? inbox.tasks.length - completed : inbox.tasks.length)}
                </Text>
                <Text style={[typography.labelSm, styles.statLabel]}>{stat.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      </Card>

      <Text style={[typography.labelSm, styles.sectionLabel]}>CÀI ĐẶT HỆ THỐNG</Text>

      <Card style={styles.settingsCard}>
        {SETTINGS_ROWS.map((row, index) => (
          <Pressable
            key={row.label}
            accessibilityRole="button"
            style={({ pressed }) => [styles.row, index < SETTINGS_ROWS.length && styles.rowBorder, pressed && styles.rowPressed]}
            onPress={() => handleRow(row)}
          >
            <MaterialIcons name={row.icon} size={20} color={colors.secondary} />
            <View style={styles.rowText}>
              <Text style={[typography.bodyMd, styles.rowLabel]}>{row.label}</Text>
              {row.subtitle ? <Text style={[typography.caption, styles.rowSubtitle]}>{row.subtitle}</Text> : null}
            </View>
            <MaterialIcons name="chevron-right" size={20} color={colors.secondary} />
          </Pressable>
        ))}
        <View style={styles.row}>
          <MaterialIcons name="light-mode" size={20} color={colors.brandGold} />
          <View style={styles.rowText}>
            <Text style={[typography.bodyMd, styles.rowLabel]}>Giao diện: Tương phản cao ngoài trời</Text>
            <Text style={[typography.caption, styles.rowSubtitle]}>Cố định chế độ sáng</Text>
          </View>
        </View>
      </Card>

      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutPressed]}
        onPress={handleLogout}
      >
        <MaterialIcons name="logout" size={18} color={colors.error} />
        <Text style={[typography.labelLg, styles.logoutText]}>Đăng xuất</Text>
      </Pressable>

      <Text style={[typography.caption, styles.footer]}>
        Hoàng Hải Field v2.4.1 (Build 142) • Đội sửa chữa
      </Text>

      {toast ? <Toast type="info" message={toast} /> : null}
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  profileHeader: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  avatarWrap: {
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  name: {
    color: colors.neutral,
    textAlign: 'center',
  },
  meta: {
    color: colors.secondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  unit: {
    color: colors.secondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  email: {
    color: colors.secondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  roleText: {
    color: colors.brandGold,
  },
  statsCard: {
    borderRadius: radius.xl,
    marginBottom: spacing.lg,
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
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
    alignSelf: 'center',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    color: colors.secondary,
    marginTop: spacing.xs,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  sectionLabel: {
    color: colors.secondary,
    marginBottom: spacing.sm,
  },
  settingsCard: {
    borderRadius: radius.xl,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    minHeight: 56,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowPressed: {
    backgroundColor: colors.surfaceAlt,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    color: colors.neutral,
  },
  rowSubtitle: {
    color: colors.secondary,
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 48,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: '#FFFAFA',
    borderWidth: 1,
    borderColor: colors.error,
  },
  logoutPressed: {
    backgroundColor: '#F8EFEF',
  },
  logoutText: {
    color: colors.error,
  },
  footer: {
    color: colors.secondary,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: 96,
  },
});

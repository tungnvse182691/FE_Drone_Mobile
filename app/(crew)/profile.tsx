import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/auth';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Card } from '../../src/components/Card';
import { Toast } from '../../src/components/Toast';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

const PERFORMANCE_STATS = [
  { value: '36', label: 'CÔNG VIỆC ĐÃ HOÀN THÀNH', highlight: false },
  { value: '4.9 / 5.0 ⭐', label: 'ĐÁNH GIÁ NGHIỆM THU', highlight: true },
];

const SETTINGS_ROWS = [
  {
    icon: 'id-card-outline' as const,
    label: 'Thông tin cá nhân',
    action: 'profile' as const,
  },
  {
    icon: 'time-outline' as const,
    label: 'Đổi mật khẩu',
    action: 'password' as const,
  },
  {
    icon: 'sync-outline' as const,
    label: 'Cài đặt đồng bộ',
    subtitle: 'Tự động qua Wi-Fi • Lưu ngoại tuyến',
    action: 'sync' as const,
    route: '/(crew)/sync',
  },
  {
    icon: 'help-circle-outline' as const,
    label: 'Trợ giúp & Hỗ trợ kỹ thuật',
    action: 'help' as const,
  },
];

export default function CrewProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [darkMode, setDarkMode] = useState(false);
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
          `Họ tên: ${user?.full_name ?? 'Nguyễn Văn Tuấn'}\nMã nhân viên: ${user?.employee_code ?? 'CT-RC-084'}\nVai trò: Kỹ thuật viên sửa chữa\nĐội phụ trách: Đội 01 - Đồng Nai\nTrạng thái hoạt động: Đang hoạt động`,
        );
        return;
      case 'help':
        Alert.alert(
          'Trợ giúp & Hỗ trợ kỹ thuật',
          'Hotline: 1900 8866\nEmail: hotro@cattuong.vn',
        );
        return;
    }
  };

  return (
    <SafeAreaScreen scroll>
      <View style={styles.profileHeader}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={52} color={colors.secondary} />
          </View>
          <Pressable accessibilityRole="button" style={styles.cameraBtn}>
            <Ionicons name="camera-outline" size={16} color={colors.surface} />
          </Pressable>
        </View>

        <Text style={[typography.titleLg, styles.name]}>{user?.full_name ?? 'Nguyễn Văn Tuấn'}</Text>
        <Text style={[typography.bodyMd, styles.meta]}>
          Mã NV: {user?.employee_code ?? 'CT-RC-084'} • Đội sửa chữa số 2
        </Text>
        <Text style={[typography.caption, styles.unit]}>
          Đội sửa chữa số 2 — Phụ trách Vá dặm mặt đường Đồng Nai
        </Text>
        <Text style={[typography.caption, styles.email]}>{user?.email ?? 'crew@cattuong.vn'}</Text>

        <View style={styles.roleChip}>
          <Ionicons name="build" size={14} color={colors.brandGold} />
          <Text style={[typography.labelSm, styles.roleText]}>Repair Crew</Text>
        </View>
      </View>

      <Card style={styles.statsCard}>
        <View style={styles.statsRow}>
          {PERFORMANCE_STATS.map((stat) => (
            <View key={stat.label} style={styles.statCol}>
              <Text style={[typography.titleLg, stat.highlight ? styles.statValueGold : styles.statValue]}>
                {stat.value}
              </Text>
              <Text style={[typography.labelSm, styles.statLabel]}>{stat.label}</Text>
            </View>
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
            <Ionicons name={row.icon} size={20} color={colors.secondary} />
            <View style={styles.rowText}>
              <Text style={[typography.bodyMd, styles.rowLabel]}>{row.label}</Text>
              {row.subtitle ? <Text style={[typography.caption, styles.rowSubtitle]}>{row.subtitle}</Text> : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.secondary} />
          </Pressable>
        ))}
        <View style={styles.row}>
          <Ionicons name="moon-outline" size={20} color={colors.secondary} />
          <Text style={[typography.bodyMd, styles.rowLabel, styles.rowText]}>Chế độ tối</Text>
          <Switch
            value={darkMode}
            onValueChange={(value) => {
              setDarkMode(value);
              setToast(value ? 'Đã bật chế độ tối' : 'Đã tắt chế độ tối');
            }}
            accessibilityLabel="Chế độ tối"
            trackColor={{ true: colors.primary }}
            thumbColor={colors.surface}
          />
        </View>
      </Card>

      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutPressed]}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={18} color={colors.error} />
        <Text style={[typography.labelLg, styles.logoutText]}>Đăng xuất</Text>
      </Pressable>

      <Text style={[typography.caption, styles.footer]}>
        Cát Tường Field v2.4.1 (Build 142) • Repair Crew Edition
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
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: colors.neutral,
  },
  statValueGold: {
    color: colors.primary,
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
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    minHeight: 52,
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
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: '#FFFAFA',
    borderWidth: 1,
    borderColor: '#F3C1C3',
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
    marginBottom: spacing.lg,
  },
});
import React from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/auth';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { useCrewInbox } from './tasks';
import { crewTaskIsComplete } from '../../src/api/crewApi';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { CrewContentTransition, CrewPressable } from '../../src/components/crew/CrewMotion';

const PERFORMANCE_STATS = [
  {
    value: '',
    label: 'Hoàn thành',
    color: colors.secondary,
  },
  {
    value: '',
    label: 'Chưa hoàn thành',
    color: colors.secondary,
  },
  {
    value: '',
    label: 'Đã tải',
    color: colors.neutral,
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
    subtitle: 'Xem hàng đợi và trạng thái xác nhận',
    action: 'sync' as const,
    route: '/(crew)/sync',
  },
  {
    icon: 'help-outline' as const,
    label: 'Trợ giúp và hỗ trợ kỹ thuật',
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
          `Họ tên: ${displayName}\nMã nhân viên: ${user?.employee_code?.trim() || 'Chưa có dữ liệu'}\nVai trò: Kỹ thuật viên sửa chữa\nĐội phụ trách: Chưa có dữ liệu\nTrạng thái hoạt động: Chưa có dữ liệu`,
        );
        return;
      case 'help':
        Alert.alert(
          'Trợ giúp và hỗ trợ kỹ thuật',
          'Chưa có thông tin liên hệ hỗ trợ được cấu hình. Vui lòng liên hệ người quản lý dự án.',
        );
        return;
    }
  };

  return (
    <SafeAreaScreen scroll header={<AppHeader subtitle="Hồ sơ" />}>
      <CrewContentTransition ready>
      <Card style={styles.profileHeader}>
        <View style={styles.identityRow}>
          <View style={styles.avatar} accessibilityLabel="Biểu tượng tài khoản">
            <MaterialIcons name="person" size={28} color={colors.secondary} />
          </View>
          <View style={styles.identityText}>
            <Text style={[typography.titleLg, styles.name]}>{displayName}</Text>
            <Text style={[typography.caption, styles.roleText]}>Kỹ thuật viên sửa chữa</Text>
          </View>
        </View>
        <View style={styles.accountDetails}>
          <Text selectable style={[typography.bodyMd, styles.email]}>{inbox.enabled ? user?.phone_or_email ?? 'Chưa có dữ liệu liên hệ' : 'Chưa đăng nhập'}</Text>
          <Text style={[typography.caption, styles.meta]}>
            Mã nhân viên: {user?.employee_code?.trim() || 'Chưa có dữ liệu'}
          </Text>
        </View>
      </Card>

      <Card style={styles.statsCard}>
        <View style={styles.statsHeading}><View style={styles.statsHeadingText}><Text style={[typography.titleMd, styles.statsTitle]}>Tiến độ nhiệm vụ</Text></View><CrewPressable accessibilityRole="button" accessibilityLabel="Tải lại thống kê" disabled={!inbox.enabled || inbox.query.isFetching} onPress={() => { void inbox.query.refetch(); }} style={styles.refreshButton}>
            {inbox.query.isFetching ? <ActivityIndicator size="small" color={colors.secondary} /> : <MaterialIcons name="refresh" size={22} color={colors.secondary} />}
          </CrewPressable></View>
        {inbox.error ? <Text accessibilityLiveRegion="polite" style={[typography.bodyMd, { color: colors.secondary }]}>{inbox.error}</Text> :
          inbox.query.isPending && inbox.enabled ? <Text style={typography.bodyMd}>Đang tải thống kê…</Text> :
          !inbox.tasks.length ? <Text style={typography.bodyMd}>Chưa có nhiệm vụ được giao.</Text> : null}
        <View style={styles.statsRow}>
          {PERFORMANCE_STATS.map((stat, idx) => (
            <React.Fragment key={stat.label}>
              <View style={styles.statCol}>
                <Text style={[typography.titleLg, styles.statNumber, { color: stat.color }]}>
                  {inbox.error || inbox.query.isPending ? '—' : String(idx === 0 ? completed : idx === 1 ? inbox.tasks.length - completed : inbox.tasks.length)}
                </Text>
                <Text style={[typography.labelSm, styles.statLabel]}>{stat.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
        <Text style={[typography.caption, styles.statsCaption]}>
          {inbox.query.hasNextPage && !inbox.error
            ? 'Chỉ tính nhiệm vụ đã tải. Còn dữ liệu chưa tải.'
            : 'Chỉ tính nhiệm vụ đã tải, không phải toàn bộ lịch sử.'}
        </Text>
      </Card>

      <Text style={[typography.labelSm, styles.sectionLabel]}>Cài đặt hệ thống</Text>

      <Card style={styles.settingsCard}>
        {SETTINGS_ROWS.map((row, index) => (
          <CrewPressable
            key={row.label}
            accessibilityRole="button"
            style={({ pressed }) => [styles.row, index < SETTINGS_ROWS.length && styles.rowBorder, pressed && styles.rowPressed]}
            onPress={() => handleRow(row)}
          >
            <View style={styles.settingIcon}><MaterialIcons name={row.icon} size={20} color={colors.secondary} /></View>
            <View style={styles.rowText}>
              <Text style={[typography.bodyMd, styles.rowLabel]}>{row.label}</Text>
              {row.subtitle ? <Text style={[typography.caption, styles.rowSubtitle]}>{row.subtitle}</Text> : null}
            </View>
            <MaterialIcons name="chevron-right" size={20} color={colors.secondary} />
          </CrewPressable>
        ))}
        <View style={styles.row}>
          <MaterialIcons name="light-mode" size={20} color={colors.secondary} />
          <View style={styles.rowText}>
            <Text style={[typography.bodyMd, styles.rowLabel]}>Giao diện: Tương phản cao ngoài trời</Text>
            <Text style={[typography.caption, styles.rowSubtitle]}>Cố định chế độ sáng</Text>
          </View>
        </View>
      </Card>

      <CrewPressable
        accessibilityRole="button"
        style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutPressed]}
        onPress={handleLogout}
      >
        <MaterialIcons name="logout" size={18} color={colors.error} />
        <Text style={[typography.labelLg, styles.logoutText]}>Đăng xuất</Text>
      </CrewPressable>

      <Text style={[typography.caption, styles.footer]}>
        RoadGuard • Bê tông Hoàng Hải
      </Text>
      </CrewContentTransition>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  profileHeader: {
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  identityText: { flex: 1, minWidth: 0, gap: spacing.xs },
  accountDetails: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.md, paddingTop: spacing.sm, gap: spacing.xs },
  avatar: {
    width: 48,
    height: 48,
    flexShrink: 0,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    color: colors.secondary,
    fontSize: 18,
    lineHeight: 26,
  },
  meta: {
    color: colors.secondary,
  },
  email: {
    color: colors.secondary,
  },
  roleText: {
    color: colors.secondary,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Roboto',
  },
  statsCard: {
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statsHeading: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, gap: spacing.sm },
  statsHeadingText: { flex: 1, gap: 2 },
  statsTitle: { color: colors.secondary },
  statsCaption: { color: colors.secondary, marginTop: spacing.sm },
  refreshButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full },
  statCol: {
    flex: 1,
    minWidth: 88,
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
  },
  statLabel: {
    color: colors.secondary,
    marginTop: spacing.xs,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Roboto',
  },
  statNumber: { fontSize: 24, lineHeight: 32, color: colors.secondary, fontVariant: ['tabular-nums'] },
  sectionLabel: {
    color: colors.secondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  settingsCard: {
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
  },
  settingIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, borderRadius: radius.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    minHeight: 56,
    borderRadius: radius.md,
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
    borderRadius: radius.lg,
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
    marginBottom: spacing.md,
  },
});

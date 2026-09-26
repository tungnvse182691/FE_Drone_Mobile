import React, { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Card } from '../../src/components/Card';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { useAuthStore } from '../../src/store/auth';

export default function DroneProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [darkMode, setDarkMode] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2000);
  };

  const handleLogout = () => {
    logout();
    router.replace('/(auth)');
  };

  return (
    <SafeAreaScreen scroll>
      {/* Toast Notification */}
      {toastMsg && (
        <View style={styles.toast}>
          <Ionicons name="information-circle" size={18} color={colors.surface} />
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      )}

      {/* Avatar & Personal Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarCircle}>
          <Ionicons name="person" size={44} color={colors.primaryDark} />
          <View style={styles.verifiedCheck}>
            <Ionicons name="checkmark" size={12} color={colors.surface} />
          </View>
        </View>

        <Text style={[typography.titleLg, styles.userName]}>
          {user?.full_name ?? 'Nguyễn Văn An'}
        </Text>

        <Text style={[typography.caption, styles.userSub]}>
          Mã NV: {user?.employee_code ?? 'HH-2089'} • Đội Khảo sát Số 1
        </Text>

        <View style={styles.roleChip}>
          <Ionicons name="airplane" size={14} color={colors.brandGold} />
          <Text style={styles.roleChipText}>DRONE OPERATOR</Text>
        </View>
      </View>

      {/* 3 Flight Statistics */}
      <Card style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={[typography.headlineLg, styles.statNumber]}>128h</Text>
          <Text style={[typography.caption, styles.statLabel]}>Giờ bay</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Text style={[typography.headlineLg, styles.statNumber]}>45</Text>
          <Text style={[typography.caption, styles.statLabel]}>Nhiệm vụ</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Text style={[typography.headlineLg, styles.statSuccess]}>0</Text>
          <Text style={[typography.caption, styles.statLabel]}>Sự cố</Text>
        </View>
      </Card>

      {/* Hardware / Devices Card */}
      <Card style={styles.deviceCard}>
        <View style={styles.deviceHeader}>
          <Ionicons name="hardware-chip-outline" size={18} color={colors.primary} />
          <Text style={[typography.labelSm, styles.deviceTitle]}>THIẾT BỊ PHÂN BỔ HIỆN TRƯỜNG</Text>
        </View>

        <View style={styles.deviceList}>
          <View style={styles.deviceRow}>
            <Ionicons name="airplane-outline" size={16} color={colors.secondary} />
            <Text style={[typography.bodyMd, styles.deviceName]}>
              Flycam DJI Matrice 350 RTK (Seri: M350-HH-02)
            </Text>
          </View>
          <View style={styles.deviceRow}>
            <Ionicons name="radio-outline" size={16} color={colors.secondary} />
            <Text style={[typography.bodyMd, styles.deviceName]}>
              Trạm tham chiếu mặt đất D-RTK 2 High-Precision
            </Text>
          </View>
        </View>
      </Card>

      {/* Settings Menu List */}
      <Card style={styles.menuCard}>
        <Pressable
          style={styles.menuItem}
          onPress={() => showToast('Mở thông tin chi tiết phi công')}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons name="person-outline" size={18} color={colors.secondary} />
            <Text style={[typography.bodyMd, styles.menuItemTitle]}>Thông tin cá nhân</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.secondary} />
        </Pressable>

        <View style={styles.menuDivider} />

        <Pressable
          style={styles.menuItem}
          onPress={() => router.push('/(auth)/force-change-password')}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.secondary} />
            <Text style={[typography.bodyMd, styles.menuItemTitle]}>Đổi mật khẩu</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.secondary} />
        </Pressable>

        <View style={styles.menuDivider} />

        <Pressable
          style={styles.menuItem}
          onPress={() => router.push('/(drone)/sync')}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons name="sync-outline" size={18} color={colors.secondary} />
            <Text style={[typography.bodyMd, styles.menuItemTitle]}>Cài đặt đồng bộ ngoại tuyến</Text>
          </View>
          <Text style={[typography.caption, styles.menuSubText]}>Chỉ Wi-Fi</Text>
        </Pressable>

        <View style={styles.menuDivider} />

        <View style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="moon-outline" size={18} color={colors.secondary} />
            <Text style={[typography.bodyMd, styles.menuItemTitle]}>Chế độ tối (Dark Mode)</Text>
          </View>
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            thumbColor={darkMode ? colors.primary : colors.surface}
            trackColor={{ false: colors.border, true: '#FEF3E2' }}
          />
        </View>

        <View style={styles.menuDivider} />

        <Pressable
          style={styles.menuItem}
          onPress={() => showToast('Đã dọn dẹp 142 MB bộ nhớ cache ứng dụng')}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons name="trash-outline" size={18} color={colors.secondary} />
            <Text style={[typography.bodyMd, styles.menuItemTitle]}>Dọn dẹp cache máy</Text>
          </View>
          <Text style={[typography.caption, styles.menuSubText]}>142 MB</Text>
        </Pressable>
      </Card>

      {/* Logout Action */}
      <View style={styles.logoutContainer}>
        <Pressable style={styles.logoutBtn} onPress={handleLogout} accessibilityRole="button">
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={[typography.labelLg, styles.logoutText]}>Đăng xuất tài khoản</Text>
        </Pressable>

        <Text style={[typography.caption, styles.versionFootnote]}>
          Hoàng Hải Field v2.4.1 (Build 2026.09) • Thiết kế chuẩn hiện trường
        </Text>
      </View>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  toast: {
    backgroundColor: colors.neutral,
    padding: spacing.sm,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  toastText: {
    color: colors.surface,
    fontSize: 12,
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  avatarCircle: {
    width: 84,
    height: 84,
    borderRadius: radius.full,
    backgroundColor: '#FEF3E2',
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: spacing.xs,
  },
  verifiedCheck: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: radius.full,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  userName: {
    color: colors.neutral,
    marginTop: 2,
  },
  userSub: {
    color: colors.secondary,
    marginTop: 2,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    marginTop: spacing.xs,
  },
  roleChipText: {
    color: colors.brandGold,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    color: colors.neutral,
  },
  statSuccess: {
    color: colors.success,
  },
  statLabel: {
    color: colors.secondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  deviceCard: {
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.xs,
  },
  deviceTitle: {
    color: colors.secondary,
  },
  deviceList: {
    gap: 8,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceAlt,
    padding: spacing.xs,
    borderRadius: radius.sm,
  },
  deviceName: {
    color: colors.neutral,
    fontSize: 13,
    flex: 1,
  },
  menuCard: {
    padding: 0,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  menuItemTitle: {
    color: colors.neutral,
  },
  menuSubText: {
    color: colors.secondary,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  logoutContainer: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FDECEC',
    borderWidth: 1,
    borderColor: '#F8D7DA',
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  logoutText: {
    color: colors.error,
    fontWeight: 'bold',
  },
  versionFootnote: {
    textAlign: 'center',
    color: colors.secondary,
    marginTop: 4,
  },
});

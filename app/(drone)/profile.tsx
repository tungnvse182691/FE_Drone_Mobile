import React, { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Card } from '../../src/components/Card';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { useAuthStore } from '../../src/store/auth';

const softShadow = Platform.select({
  ios: { shadowColor: '#1A1D20', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  android: { elevation: 3 },
  default: {},
});

function normalizeName(name: string): string {
  return name.replace(/\s*\([^)]*\)/g, '').trim();
}

export default function DroneProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [infoVisible, setInfoVisible] = useState(false);
  const handleLogout = () => {
    logout();
    router.replace('/(auth)');
  };

  return (
    <SafeAreaScreen scroll>
      {/* Avatar & Personal Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarCircle}>
          <MaterialIcons name="person" size={44} color={colors.primaryDark} />

        </View>

        <Text style={[typography.titleLg, styles.userName]}>
          {normalizeName(user?.full_name ?? '') || 'Phi công hiện trường'}
        </Text>

        <Text style={[typography.caption, styles.userSub]}>
          Mã NV: {user?.employee_code?.trim() || 'Chưa có mã nhân viên'}
        </Text>

        <View style={styles.roleChip}>
          <MaterialIcons name="flight-takeoff" size={14} color={colors.primaryDark} />
          <Text style={styles.roleChipText}>Phi công hiện trường</Text>
        </View>
      </View>

      {/* 3 Flight Statistics */}
      <Card style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={[typography.headlineLg, styles.statNumber]}>—</Text>
          <Text style={[typography.caption, styles.statLabel]}>Giờ bay</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Text style={[typography.headlineLg, styles.statNumber]}>—</Text>
          <Text style={[typography.caption, styles.statLabel]}>Nhiệm vụ</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Text style={[typography.headlineLg, styles.statSuccess]}>—</Text>
          <Text style={[typography.caption, styles.statLabel]}>Sự cố</Text>
        </View>
      </Card>

      <Text style={[typography.caption, styles.versionFootnote]}>Chưa có dữ liệu giờ bay, chuyến bay, sự cố và chứng nhận từ máy chủ.</Text>

      {/* Hardware / Devices Card */}
      <Card style={styles.deviceCard}>
        <View style={styles.deviceHeader}>
          <MaterialIcons name="memory" size={18} color={colors.primary} />
          <Text style={[typography.labelSm, styles.deviceTitle]}>THIẾT BỊ PHÂN BỔ HIỆN TRƯỜNG</Text>
        </View>

        <View style={styles.deviceList}>
          <View style={styles.deviceRow}>
            <MaterialIcons name="flight-takeoff" size={16} color={colors.secondary} />
            <Text style={[typography.bodyMd, styles.deviceName]}>
              Thiết bị bay: Chưa có dữ liệu phân bổ
            </Text>
          </View>
          <View style={styles.deviceRow}>
            <MaterialIcons name="cell-tower" size={16} color={colors.secondary} />
            <Text style={[typography.bodyMd, styles.deviceName]}>
              Trạm RTK: Chưa có dữ liệu
            </Text>
          </View>
        </View>
      </Card>

      {/* Settings Menu List */}
      <Card style={styles.menuCard}>
        <Pressable
          style={styles.menuItem}
          onPress={() => setInfoVisible(true)}
          accessibilityRole="button"
        >
          <View style={styles.menuItemLeft}>
            <MaterialIcons name="person" size={18} color={colors.secondary} />
            <Text style={[typography.bodyMd, styles.menuItemTitle]}>Thông tin cá nhân</Text>
          </View>
          <MaterialIcons name="chevron-right" size={16} color={colors.secondary} />
        </Pressable>

        <View style={styles.menuDivider} />

        <Pressable
          style={styles.menuItem}
          onPress={() => router.push('/(auth)/force-change-password')}
          accessibilityRole="button"
        >
          <View style={styles.menuItemLeft}>
            <MaterialIcons name="lock" size={18} color={colors.secondary} />
            <Text style={[typography.bodyMd, styles.menuItemTitle]}>Đổi mật khẩu</Text>
          </View>
          <MaterialIcons name="chevron-right" size={16} color={colors.secondary} />
        </Pressable>

        <View style={styles.menuDivider} />

        <Pressable
          style={styles.menuItem}
          onPress={() => router.push('/(drone)/sync')}
          accessibilityRole="button"
        >
          <View style={styles.menuItemLeft}>
            <MaterialIcons name="sync" size={18} color={colors.secondary} />
            <Text style={[typography.bodyMd, styles.menuItemTitle]}>Cài đặt đồng bộ ngoại tuyến</Text>
          </View>
          <Text style={[typography.caption, styles.menuSubText]}>Xem hàng đợi</Text>
        </Pressable>

        <View style={styles.menuDivider} />

        <View style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <MaterialIcons name="inventory-2" size={18} color={colors.secondary} />
            <Text style={[typography.bodyMd, styles.menuItemTitle]}>Dữ liệu trên thiết bị</Text>
          </View>
          <Text style={[typography.caption, styles.menuSubText]}>Được giữ để khôi phục</Text>
        </View>
      </Card>

      {/* Logout Action */}
      <View style={styles.logoutContainer}>
        <Pressable style={styles.logoutBtn} onPress={handleLogout} accessibilityRole="button">
          <MaterialIcons name="logout" size={20} color={colors.error} />
          <Text style={[typography.labelLg, styles.logoutText]}>Đăng xuất tài khoản</Text>
        </Pressable>

        <Text style={[typography.caption, styles.versionFootnote]}>
          RoadGuard • Bê tông Hoàng Hải
        </Text>
      </View>

      {/* Pilot Information Modal */}
      <Modal
        visible={infoVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setInfoVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.infoModalCard}>
            <View style={styles.infoModalHeader}>
              <Text style={[typography.titleMd, styles.infoModalTitle]}>Thông tin phi công</Text>
              <Pressable
                style={styles.infoModalCloseBtn}
                onPress={() => setInfoVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Đóng"
              >
                <MaterialIcons name="close" size={20} color={colors.secondary} />
              </Pressable>
            </View>

            <View style={styles.infoModalBody}>
              <View style={styles.infoRow}>
                <Text style={[typography.caption, styles.infoLabel]}>Họ và tên</Text>
                <Text style={[typography.bodyMd, styles.infoValue]}>
                  {normalizeName(user?.full_name ?? '') || 'Phi công hiện trường'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={[typography.caption, styles.infoLabel]}>Mã nhân viên</Text>
                <Text style={[typography.bodyMd, styles.infoValue]}>
                  {user?.employee_code?.trim() || 'Chưa có mã nhân viên'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={[typography.caption, styles.infoLabel]}>Đội phụ trách</Text>
                <Text style={[typography.bodyMd, styles.infoValue]}>Chưa có dữ liệu</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={[typography.caption, styles.infoLabel]}>Vai trò</Text>
                <Text style={[typography.bodyMd, styles.infoValue]}>Phi công hiện trường</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={[typography.caption, styles.infoLabel]}>Thiết bị phân bổ</Text>
                <Text style={[typography.bodyMd, styles.infoValue]}>
                  Chưa có dữ liệu phân bổ
                </Text>
              </View>
            </View>

            <Pressable
              style={styles.infoModalFooterBtn}
              onPress={() => setInfoVisible(false)}
              accessibilityRole="button"
            >
              <Text style={[typography.labelLg, styles.infoModalFooterText]}>Đóng</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
    width: 88,
    height: 88,
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
    backgroundColor: '#FEF3E2',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    marginTop: spacing.xs,
  },
  roleChipText: {
    color: colors.primaryDark,
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
    borderRadius: radius.xl,
    ...softShadow,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  infoModalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  infoModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  infoModalTitle: {
    color: colors.neutral,
    fontWeight: '700',
  },
  infoModalCloseBtn: {
    padding: 4,
  },
  infoModalBody: {
    gap: spacing.sm,
  },
  infoRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceAlt,
    paddingBottom: spacing.xs,
  },
  infoLabel: {
    color: colors.secondary,
    marginBottom: 2,
  },
  infoValue: {
    color: colors.neutral,
    fontWeight: '500',
  },
  infoModalFooterBtn: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  infoModalFooterText: {
    color: colors.neutral,
    fontWeight: '700',
  },
});

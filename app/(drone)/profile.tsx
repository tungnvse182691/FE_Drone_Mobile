import React, { useState } from 'react';
import { Alert, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
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
  const [cacheSize, setCacheSize] = useState('142 MB');
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
          <MaterialIcons name="info" size={18} color={colors.surface} />
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      )}

      {/* Avatar & Personal Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarCircle}>
          <MaterialIcons name="person" size={44} color={colors.primaryDark} />
          <View style={styles.verifiedCheck}>
            <MaterialIcons name="check" size={12} color={colors.surface} />
          </View>
        </View>

        <Text style={[typography.titleLg, styles.userName]}>
          {normalizeName(user?.full_name ?? 'Nguyễn Văn An')}
        </Text>

        <Text style={[typography.caption, styles.userSub]}>
          Mã NV: {user?.employee_code ?? 'HH-2089'} • Đội Khảo sát Số 1
        </Text>

        <View style={styles.roleChip}>
          <MaterialIcons name="flight-takeoff" size={14} color={colors.primaryDark} />
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
          <MaterialIcons name="memory" size={18} color={colors.primary} />
          <Text style={[typography.labelSm, styles.deviceTitle]}>THIẾT BỊ PHÂN BỔ HIỆN TRƯỜNG</Text>
        </View>

        <View style={styles.deviceList}>
          <View style={styles.deviceRow}>
            <MaterialIcons name="flight-takeoff" size={16} color={colors.secondary} />
            <Text style={[typography.bodyMd, styles.deviceName]}>
              Flycam DJI Matrice 350 RTK (Seri: M350-HH-02)
            </Text>
          </View>
          <View style={styles.deviceRow}>
            <MaterialIcons name="cell-tower" size={16} color={colors.secondary} />
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
          <Text style={[typography.caption, styles.menuSubText]}>Chỉ Wi-Fi</Text>
        </Pressable>

        <View style={styles.menuDivider} />

        <Pressable
          style={styles.menuItem}
          onPress={() =>
            Alert.alert(
              'Dọn dẹp cache',
              `Xóa toàn bộ dữ liệu tạm (${cacheSize})? Dữ liệu đã đồng bộ không bị ảnh hưởng.`,
              [
                { text: 'Hủy', style: 'cancel' },
                {
                  text: 'Đồng ý',
                  onPress: () => {
                    setCacheSize('0 MB');
                    showToast('Đã dọn dẹp bộ nhớ cache máy');
                  },
                },
              ],
            )
          }
          accessibilityRole="button"
        >
          <View style={styles.menuItemLeft}>
            <MaterialIcons name="delete" size={18} color={colors.secondary} />
            <Text style={[typography.bodyMd, styles.menuItemTitle]}>Dọn dẹp cache máy</Text>
          </View>
          <Text style={[typography.caption, styles.menuSubText]}>{cacheSize}</Text>
        </Pressable>
      </Card>

      {/* Logout Action */}
      <View style={styles.logoutContainer}>
        <Pressable style={styles.logoutBtn} onPress={handleLogout} accessibilityRole="button">
          <MaterialIcons name="logout" size={20} color={colors.error} />
          <Text style={[typography.labelLg, styles.logoutText]}>Đăng xuất tài khoản</Text>
        </Pressable>

        <Text style={[typography.caption, styles.versionFootnote]}>
          Hoàng Hải Field v2.4.1 (Build 2026.09) • Thiết kế chuẩn hiện trường
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
                  {normalizeName(user?.full_name ?? 'Nguyễn Văn An')}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={[typography.caption, styles.infoLabel]}>Mã nhân viên</Text>
                <Text style={[typography.bodyMd, styles.infoValue]}>
                  {user?.employee_code ?? 'HH-2089'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={[typography.caption, styles.infoLabel]}>Đội phụ trách</Text>
                <Text style={[typography.bodyMd, styles.infoValue]}>Đội Khảo sát Số 1</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={[typography.caption, styles.infoLabel]}>Vai trò</Text>
                <Text style={[typography.bodyMd, styles.infoValue]}>DRONE OPERATOR</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={[typography.caption, styles.infoLabel]}>Thiết bị phân bổ</Text>
                <Text style={[typography.bodyMd, styles.infoValue]}>
                  Flycam DJI Matrice 350 RTK — M350-HH-02
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

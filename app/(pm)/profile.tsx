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
  { value: '28', label: 'KHẢO SÁT ĐÃ TẠO', highlight: false },
  { value: '45', label: 'ĐỢT SỬA CHỮA HOÀN THÀNH', highlight: true },
];

const ACCOUNT_ROWS = [
  { icon: 'id-card-outline' as const, label: 'Thông tin cá nhân', action: 'profile' as const },
  { icon: 'map-outline' as const, label: 'Phạm vi công trình phụ trách', action: 'scope' as const },
  {
    icon: 'create-outline' as const,
    label: 'Chữ ký số phê duyệt',
    subtitle: 'Đã kích hoạt',
    action: 'signature' as const,
    signatureTone: true,
  },
  { icon: 'key-outline' as const, label: 'Đổi mật khẩu', action: 'password' as const },
];

const FIELD_CONFIG_ROWS = [
  { icon: 'map' as const, label: 'Bản đồ vệ tinh offline', subtitle: 'Bình Dương & Bình Phước (240 MB)', action: 'offline-map' as const },
  { icon: 'notifications-outline' as const, label: 'Cài đặt thông báo & cảnh báo lỗi', action: 'notify' as const },
];

const LEGAL_ROWS = [
  { icon: 'headset-outline' as const, label: 'Hỗ trợ kỹ thuật nội bộ Cát Tường', value: '1900 8866', mono: true, gold: true },
  { icon: 'information-circle-outline' as const, label: 'Phiên bản Cát Tường Field', value: 'v2.4.12-pro', mono: true },
];

export default function PmProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [autoSync, setAutoSync] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'warning' | 'error' | 'info'; message: string } | null>(null);

  const handleLogout = () => {
    logout();
    router.replace('/(auth)');
  };

  const handleAccountRow = (row: (typeof ACCOUNT_ROWS)[number]) => {
    switch (row.action) {
      case 'password':
        router.push('/(auth)/force-change-password');
        return;
      case 'profile':
        Alert.alert(
          'Thông tin cá nhân',
          `Họ tên: ${user?.full_name ?? 'Nguyễn Thùy Lan'}\nMã nhân sự: ${user?.employee_code ?? 'PM-0428'}\nVai trò: Quản lý Dự án (Cát Tường Project Manager)\nBan QLDA phụ trách: Tuyến Quốc Lộ 1A, Tuyến ĐT.741 Đồng Nai`,
        );
        return;
      default:
        setToast({ type: 'info', message: `Mở: ${row.label}` });
    }
  };

  const handleFieldRow = (row: (typeof FIELD_CONFIG_ROWS)[number]) => {
    setToast({ type: 'info', message: `Mở: ${row.label}` });
  };

  return (
    <SafeAreaScreen scroll>
      <View style={styles.profileHeader}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>NL</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.cameraBtn, pressed && styles.pressed]}
            onPress={() => setToast({ type: 'info', message: 'Chỉnh sửa ảnh đại diện' })}
          >
            <Ionicons name="camera" size={15} color={colors.surface} />
          </Pressable>
        </View>

        <Text style={[typography.titleLg, styles.name]}>{user?.full_name ?? 'Nguyễn Thùy Lan'}</Text>
        <Text style={[typography.caption, styles.email]}>{user?.email ?? 'lan.nguyen@cattuonginfra.vn'}</Text>

        <View style={styles.roleChip}>
          <Ionicons name="construct-outline" size={15} color={colors.brandGold} />
          <Text style={[typography.labelSm, styles.roleText]}>PROJECT MANAGER</Text>
        </View>
      </View>

      <View style={styles.scopeCard}>
        <View style={styles.scopeCol}>
          <Text style={[typography.labelSm, styles.scopeLabel]}>DỰ ÁN PHỤ TRÁCH</Text>
          <Text style={[typography.bodyMd, styles.scopeValue]}>QL.1A & Tuyến ĐT.741</Text>
        </View>
        <View style={styles.scopeDivider} />
        <View style={styles.scopeCol}>
          <Text style={[typography.labelSm, styles.scopeLabel]}>MÃ NHÂN SỰ</Text>
          <Text style={[typography.bodyMd, styles.scopeValueMono]}>
            {user?.employee_code ?? 'PM-0428'}
          </Text>
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

      <Text style={[typography.labelSm, styles.sectionLabel]}>TÀI KHOẢN & DỰ ÁN</Text>

      <Card style={styles.settingsCard}>
        {ACCOUNT_ROWS.map((row, index) => (
          <Pressable
            key={row.label}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.row,
              index < ACCOUNT_ROWS.length - 1 && styles.rowBorder,
              pressed && styles.rowPressed,
            ]}
            onPress={() => handleAccountRow(row)}
          >
            <Ionicons name={row.icon} size={20} color={colors.secondary} />
            <View style={styles.rowText}>
              <Text style={[typography.bodyMd, styles.rowLabel]}>{row.label}</Text>
              {row.subtitle ? (
                <View style={styles.signatureRow}>
                  <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                  <Text style={[typography.caption, styles.signatureText]}>{row.subtitle}</Text>
                </View>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.secondary} />
          </Pressable>
        ))}
      </Card>

      <Text style={[typography.labelSm, styles.sectionLabel]}>CẤU HÌNH THỰC ĐỊA</Text>

      <Card style={styles.settingsCard}>
        {FIELD_CONFIG_ROWS.map((row, index) => (
          <Pressable
            key={row.label}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.row,
              index < FIELD_CONFIG_ROWS.length - 1 && styles.rowBorder,
              pressed && styles.rowPressed,
            ]}
            onPress={() => handleFieldRow(row)}
          >
            <Ionicons name={row.icon} size={20} color={colors.secondary} />
            <View style={styles.rowText}>
              <Text style={[typography.bodyMd, styles.rowLabel]}>{row.label}</Text>
              {row.subtitle ? <Text style={[typography.caption, styles.rowSubtitle]}>{row.subtitle}</Text> : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.secondary} />
          </Pressable>
        ))}
        <View style={[styles.row, styles.rowBorder]}>
          <Ionicons name="wifi-outline" size={20} color={colors.secondary} />
          <View style={styles.rowText}>
            <Text style={[typography.bodyMd, styles.rowLabel]}>Tự động đồng bộ khi có Wi-Fi</Text>
            <Text style={[typography.caption, styles.rowSubtitle]}>Tiết kiệm 4G ngoài hiện trường</Text>
          </View>
          <Switch
            value={autoSync}
            onValueChange={(value) => {
              setAutoSync(value);
              setToast({ type: 'success', message: value ? 'Đã bật tự động đồng bộ Wi-Fi' : 'Đã tắt tự động đồng bộ Wi-Fi' });
            }}
            accessibilityLabel="Tự động đồng bộ khi có Wi-Fi"
            trackColor={{ true: colors.primary }}
            thumbColor={colors.surface}
          />
        </View>
      </Card>

      <Text style={[typography.labelSm, styles.sectionLabel]}>ỨNG DỤNG & PHÁP LÝ</Text>

      <Card style={styles.settingsCard}>
        {LEGAL_ROWS.map((row, index) => (
          <View key={row.label} style={[styles.row, index < LEGAL_ROWS.length - 1 && styles.rowBorder]}>
            <Ionicons name={row.icon} size={20} color={colors.secondary} />
            <View style={styles.rowText}>
              <Text style={[typography.bodyMd, styles.rowLabel]}>{row.label}</Text>
            </View>
            <Text style={[typography.caption, row.gold ? styles.legalGold : styles.legalValue, row.mono && styles.legalMono]}>
              {row.value}
            </Text>
          </View>
        ))}
      </Card>

      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutPressed]}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={18} color={colors.error} />
        <Text style={[typography.labelLg, styles.logoutText]}>Đăng xuất tài khoản</Text>
      </Pressable>

      <Text style={[typography.caption, styles.footer]}>
        Đăng xuất sẽ chuyển hướng về màn hình đăng nhập hệ thống.
      </Text>

      {toast ? <Toast type={toast.type} message={toast.message} /> : null}
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
    width: 96,
    height: 96,
    borderRadius: radius.full,
    backgroundColor: '#FEF3E2',
    borderWidth: 2,
    borderColor: 'rgba(201,162,39,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.brandGold,
    fontSize: 24,
    fontWeight: '700',
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
  pressed: {
    opacity: 0.7,
  },
  name: {
    color: colors.neutral,
    textAlign: 'center',
  },
  email: {
    color: colors.secondary,
    marginTop: 2,
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
    letterSpacing: 0.8,
  },
  scopeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: spacing.md,
  },
  scopeCol: {
    flex: 1,
    alignItems: 'center',
  },
  scopeDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
  },
  scopeLabel: {
    color: colors.secondary,
    letterSpacing: 0.4,
  },
  scopeValue: {
    color: colors.neutral,
    marginTop: spacing.xs,
  },
  scopeValueMono: {
    color: colors.neutral,
    marginTop: spacing.xs,
    fontFamily: 'monospace',
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
    letterSpacing: 0.4,
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
    minWidth: 0,
  },
  rowLabel: {
    color: colors.neutral,
  },
  rowSubtitle: {
    color: colors.secondary,
    marginTop: 2,
  },
  signatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  signatureText: {
    color: colors.success,
    fontWeight: '600',
  },
  legalValue: {
    color: colors.secondary,
  },
  legalGold: {
    color: colors.brandGold,
    fontWeight: '700',
  },
  legalMono: {
    fontFamily: 'monospace',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutPressed: {
    backgroundColor: '#FEE2E2',
  },
  logoutText: {
    color: colors.error,
  },
  footer: {
    color: colors.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
});
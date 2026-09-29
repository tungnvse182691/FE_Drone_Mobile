import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Toast } from '../../src/components/Toast';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { useAuthStore } from '../../src/store/auth';
import { useReporterStore } from '../../src/store/reporter';
import { listMyReports } from '../../src/api/mock/reporter';
import { REPORTER_REPORT, REPORTER_TRACK } from '../../src/constants/routes';
import { ReporterReport } from '../../src/types/domain';
import { ReporterReportStatus } from '../../src/types/enums';

export default function ReporterProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const verifiedEmail = useReporterStore((state) => state.verifiedEmail);
  const clearSession = useReporterStore((state) => state.clearSession);

  const [reports, setReports] = useState<ReporterReport[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const activeEmail = user?.phone_or_email || verifiedEmail;
  const isVerified = Boolean(activeEmail);

  useEffect(() => {
    if (!activeEmail) {
      setReports([]);
      return;
    }
    listMyReports(activeEmail)
      .then(({ items }) => setReports(items))
      .catch(() => setReports([]));
  }, [activeEmail]);

  const totalReports = reports.length;
  const inProgressReports = reports.filter(
    (r) =>
      r.status === ReporterReportStatus.SUBMITTED ||
      r.status === ReporterReportStatus.RECEIVED ||
      r.status === ReporterReportStatus.INSPECTING ||
      r.status === ReporterReportStatus.REPAIRING,
  ).length;
  const completedReports = reports.filter(
    (r) => r.status === ReporterReportStatus.COMPLETED,
  ).length;

  const handleLogout = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng phản ánh?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: () => {
            logout();
            clearSession();
            router.replace('/(auth)');
          },
        },
      ],
    );
  };

  const displayName = user?.full_name || (isVerified ? 'Người dân phản ánh' : 'Khách vãng lai');

  return (
    <SafeAreaScreen scroll>
      <View style={styles.profileHeader}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <MaterialIcons name="person" size={52} color={colors.secondary} />
          </View>
          {isVerified && (
            <View style={styles.verifiedBadge}>
              <MaterialIcons name="check" size={14} color={colors.surface} />
            </View>
          )}
        </View>

        <Text style={[typography.titleLg, styles.name]}>{displayName}</Text>
        <Text style={[typography.bodyMd, styles.email]}>
          {activeEmail || 'Chưa liên kết email'}
        </Text>

        <View style={styles.statusPill}>
          <View style={[styles.statusDot, isVerified ? styles.statusDotGreen : styles.statusDotYellow]} />
          <Text style={[typography.caption, isVerified ? styles.statusTextGreen : styles.statusTextYellow]}>
            {isVerified ? 'Tài khoản đã xác thực OTP' : 'Chưa xác thực email'}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={[typography.headlineLg, styles.statValue]}>{totalReports}</Text>
          <Text style={[typography.caption, styles.statLabel]}>Đã gửi</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[typography.headlineLg, styles.statValuePrimary]}>{inProgressReports}</Text>
          <Text style={[typography.caption, styles.statLabel]}>Đang xử lý</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[typography.headlineLg, styles.statValueSuccess]}>{completedReports}</Text>
          <Text style={[typography.caption, styles.statLabel]}>Hoàn thành</Text>
        </Card>
      </View>

      <Text style={[typography.titleMd, styles.sectionTitle]}>Thao tác nhanh</Text>

      <Card style={styles.menuCard}>
        <Pressable
          style={styles.menuItem}
          onPress={() => router.push(REPORTER_REPORT)}
          accessibilityRole="button"
        >
          <View style={styles.menuIconWrap}>
            <MaterialIcons name="add-circle-outline" size={22} color={colors.primary} />
          </View>
          <View style={styles.menuTextWrap}>
            <Text style={[typography.bodyMd, styles.menuLabel]}>Gửi phản ánh khuyết tật mới</Text>
            <Text style={[typography.caption, styles.menuSub]}>Chụp ảnh và ghi nhận vị trí hư hại</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={colors.secondary} />
        </Pressable>

        <View style={styles.divider} />

        <Pressable
          style={styles.menuItem}
          onPress={() => router.push(REPORTER_TRACK)}
          accessibilityRole="button"
        >
          <View style={styles.menuIconWrap}>
            <MaterialIcons name="search" size={22} color={colors.primary} />
          </View>
          <View style={styles.menuTextWrap}>
            <Text style={[typography.bodyMd, styles.menuLabel]}>Tra cứu tiến độ xử lý</Text>
            <Text style={[typography.caption, styles.menuSub]}>Theo dõi trạng thái các phản ánh đã gửi</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={colors.secondary} />
        </Pressable>
      </Card>

      <Text style={[typography.titleMd, styles.sectionTitle]}>Hỗ trợ & Thông tin dự án</Text>

      <Card style={styles.menuCard}>
        <Pressable
          style={styles.menuItem}
          onPress={() =>
            Alert.alert(
              'Dự án ĐH.05 Bình Chánh',
              'Tuyến đường: ĐH.05 (Huyện Bình Chánh, TP. Hồ Chí Minh)\nĐơn vị thi công & bảo hành: Công ty Bê tông Hoàng Hải\nPhạm vi bảo hành: Mặt đường bê tông xi măng, hệ thống thoát nước và an toàn giao thông.',
            )
          }
          accessibilityRole="button"
        >
          <View style={styles.menuIconWrap}>
            <MaterialIcons name="info-outline" size={22} color={colors.secondary} />
          </View>
          <View style={styles.menuTextWrap}>
            <Text style={[typography.bodyMd, styles.menuLabel]}>Thông tin dự án ĐH.05 Bình Chánh</Text>
            <Text style={[typography.caption, styles.menuSub]}>Quy mô tuyến đường và phạm vi bảo hành</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={colors.secondary} />
        </Pressable>

        <View style={styles.divider} />

        <Pressable
          style={styles.menuItem}
          onPress={() =>
            Alert.alert(
              'Tổng đài hỗ trợ dân sinh',
              'Hotline tiếp nhận sự cố: 1900 8866\nThời gian làm việc: 24/7\nEmail tiếp nhận: phananh@hoanghai.vn',
            )
          }
          accessibilityRole="button"
        >
          <View style={styles.menuIconWrap}>
            <MaterialIcons name="headset-mic" size={22} color={colors.secondary} />
          </View>
          <View style={styles.menuTextWrap}>
            <Text style={[typography.bodyMd, styles.menuLabel]}>Tổng đài tiếp nhận sự cố 24/7</Text>
            <Text style={[typography.caption, styles.menuSub]}>Hotline: 1900 8866 (miễn phí)</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={colors.secondary} />
        </Pressable>

        <View style={styles.divider} />

        <Pressable
          style={styles.menuItem}
          onPress={() =>
            Alert.alert(
              'Chính sách quyền riêng tư',
              'RoadGuard cam kết bảo mật tuyệt đối thông tin người dân phản ánh. Dữ liệu hình ảnh và GPS chỉ phục vụ công tác khảo sát, sửa chữa và không chia sẻ cho bên thứ ba.',
            )
          }
          accessibilityRole="button"
        >
          <View style={styles.menuIconWrap}>
            <MaterialIcons name="security" size={22} color={colors.secondary} />
          </View>
          <View style={styles.menuTextWrap}>
            <Text style={[typography.bodyMd, styles.menuLabel]}>Chính sách bảo mật & Quyền riêng tư</Text>
            <Text style={[typography.caption, styles.menuSub]}>Bảo vệ dữ liệu cá nhân theo quy chuẩn</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={colors.secondary} />
        </Pressable>
      </Card>

      <View style={styles.logoutWrapper}>
        <Button
          variant="secondary"
          title="Đăng xuất tài khoản"
          onPress={handleLogout}
          icon={<MaterialIcons name="logout" size={18} color={colors.error} />}
        />
        <Text style={[typography.caption, styles.logoutHint]}>
          Đăng xuất sẽ đóng phiên hiện tại và quay về màn hình đăng nhập hệ thống.
        </Text>
      </View>

      {toast && <Toast message={toast} type="info" />}
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  profileHeader: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.md,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  name: {
    color: colors.neutral,
    fontFamily: 'Roboto-Bold',
    marginBottom: 2,
  },
  email: {
    color: colors.secondary,
    marginBottom: spacing.xs,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotGreen: {
    backgroundColor: colors.success,
  },
  statusDotYellow: {
    backgroundColor: colors.warning,
  },
  statusTextGreen: {
    color: colors.success,
    fontFamily: 'Roboto-Medium',
  },
  statusTextYellow: {
    color: colors.warning,
    fontFamily: 'Roboto-Medium',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  statValue: {
    color: colors.neutral,
    fontFamily: 'Roboto-Bold',
  },
  statValuePrimary: {
    color: colors.primary,
    fontFamily: 'Roboto-Bold',
  },
  statValueSuccess: {
    color: colors.success,
    fontFamily: 'Roboto-Bold',
  },
  statLabel: {
    color: colors.secondary,
    marginTop: 2,
  },
  sectionTitle: {
    color: colors.neutral,
    marginBottom: spacing.sm,
  },
  menuCard: {
    padding: 0,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextWrap: {
    flex: 1,
  },
  menuLabel: {
    color: colors.neutral,
    fontFamily: 'Roboto-Medium',
  },
  menuSub: {
    color: colors.secondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 56,
  },
  logoutWrapper: {
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  logoutHint: {
    color: colors.secondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});

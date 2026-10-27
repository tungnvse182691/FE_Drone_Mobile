import React, { useCallback, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Toast } from '../../src/components/Toast';
import { AnimatedPressable } from '../../src/components/AnimatedPressable';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { useAuthStore } from '../../src/store/auth';
import { useReporterStore } from '../../src/store/reporter';
import { reporterReportsOptions, reportItemsFromPages, canShowReportPages } from '../../src/api/reporterApi';
import { fetchProfile, passwordSessionIdentity } from '../../src/api/authApi';
import { isReporterSession } from '../../src/api/uploads';
import { REPORTER_REPORT, REPORTER_TRACK } from '../../src/constants/routes';


const softShadow = Platform.select({
  ios: { shadowColor: '#1A1D20', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  android: { elevation: 3 },
  default: {},
});

function normalizeName(fullName?: string | null): string {
  if (!fullName) return 'Người dân';
  return fullName.trim() || 'Người dân';
}

export default function ReporterProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const clearSession = useReporterStore((state) => state.clearSession);

  const token = useAuthStore(state => state.token);
  const status = useAuthStore(state => state.status);
  const scope = passwordSessionIdentity(token);
  const enabled = isReporterSession({ user, token, status }) && !!scope;
  const [toast] = useState<string | null>(null);
  const reportQuery = useInfiniteQuery({ ...reporterReportsOptions(scope ?? 'guest'), enabled });
  const profileQuery = useQuery({
    queryKey: ['reporter-profile', scope], enabled, retry: false, gcTime: 0,
    queryFn: async ({ signal }) => {
      const profile = await fetchProfile(signal);
      if (profile.userId !== user?.id || profile.roleCode !== 'REPORTER') throw new Error('profile_identity_mismatch');
      return profile;
    },
  });
  const { refetch: refreshReports } = reportQuery;
  const { refetch: refreshProfile } = profileQuery;
  useFocusEffect(useCallback(() => {
    if (enabled) { void refreshReports(); void refreshProfile(); }
  }, [enabled, refreshReports, refreshProfile]));
  const reports = enabled ? reportItemsFromPages(reportQuery.data?.pages) : [];
  const profile = enabled && !profileQuery.isError ? profileQuery.data : undefined;
  const activeEmail = profile?.email;
  // GET /profile has no emailVerified/OTP claim. Do not invent one from an email.
  const isActive = profile?.status === 'ACTIVE';
  const countAvailable = enabled && !!reportQuery.data && canShowReportPages(reportQuery);
  const totalReports = reports.length;
  const totalEvidence = reports.reduce((sum, r) => sum + r.evidence.length, 0);
  const totalSupplements = reports.reduce((sum, r) => sum + r.supplements.length, 0);

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

  const displayName = profile ? normalizeName(profile.displayName) : 'Chưa tải hồ sơ';

  return (
    <SafeAreaScreen scroll>
      <View style={styles.profileHeader}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <MaterialIcons name="person" size={52} color={colors.secondary} />
          </View>

        </View>

        <Text style={[typography.titleLg, styles.name]}>{displayName}</Text>
        <Text style={[typography.bodyMd, styles.email]}>
          {activeEmail || 'Chưa có dữ liệu hồ sơ'}
        </Text>

        <View style={styles.statusPill}>
          <View style={[styles.statusDot, isActive ? styles.statusDotGreen : styles.statusDotYellow]} />
          <Text style={[typography.caption, isActive ? styles.statusTextGreen : styles.statusTextYellow]}>
            {profile ? (profile.status === 'ACTIVE' ? 'Tài khoản đang hoạt động' : 'Trạng thái: ' + profile.status) : 'Chưa xác nhận trạng thái tài khoản'}
          </Text>
        </View>
      </View>

      <Button variant="secondary" title="Làm mới hồ sơ" loading={enabled && (profileQuery.isFetching || (reportQuery.isFetching && !reportQuery.isFetchingNextPage))}
        disabled={!enabled} onPress={() => { void refreshProfile(); void refreshReports(); }} />
      {!enabled ? <Text>Vui lòng đăng nhập để xem hồ sơ.</Text> : null}
      {enabled && (profileQuery.isError || reportQuery.isError) ? <Text style={{ color: colors.error }}>{reportQuery.isFetchNextPageError && canShowReportPages(reportQuery) && !profileQuery.isError ? 'Không tải thêm được. Thống kê hiện chỉ gồm các phản ánh đã tải.' : 'Không tải được dữ liệu. Vui lòng làm mới để thử lại.'}</Text> : null}
      {enabled && (profileQuery.isPending || reportQuery.isPending) ? <Text>Đang tải hồ sơ…</Text> : null}
      <Text style={typography.caption}>Thống kê trong các phản ánh đã tải; không phải tổng toàn bộ lịch sử.</Text>
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={[typography.headlineLg, styles.statValue]}>{countAvailable ? totalReports : '—'}</Text>
          <Text style={[typography.caption, styles.statLabel]}>Phản ánh đã tải</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[typography.headlineLg, styles.statValuePrimary]}>{countAvailable ? totalEvidence : '—'}</Text>
          <Text style={[typography.caption, styles.statLabel]}>Ảnh hiện trường</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[typography.headlineLg, styles.statValueSuccess]}>{countAvailable ? totalSupplements : '—'}</Text>
          <Text style={[typography.caption, styles.statLabel]}>Bổ sung</Text>
        </Card>
      </View>

      {enabled && reportQuery.hasNextPage ? <Button variant="secondary" title="Tải thêm phản ánh" loading={reportQuery.isFetchingNextPage} disabled={reportQuery.isFetching} onPress={() => void reportQuery.fetchNextPage()} /> : null}
      <Text style={[typography.titleMd, styles.sectionTitle]}>Thao tác nhanh</Text>

      <Card style={styles.menuCard}>
        <AnimatedPressable
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
        </AnimatedPressable>

        <View style={styles.divider} />

        <AnimatedPressable
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
        </AnimatedPressable>
      </Card>

      <Text style={[typography.titleMd, styles.sectionTitle]}>Hỗ trợ & Thông tin dự án</Text>

      <Card style={styles.menuCard}>
        <AnimatedPressable
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
        </AnimatedPressable>

        <View style={styles.divider} />

        <AnimatedPressable
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
        </AnimatedPressable>

        <View style={styles.divider} />

        <AnimatedPressable
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
        </AnimatedPressable>
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
    borderRadius: radius.xl,
    ...softShadow,
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
    borderRadius: radius.xl,
    ...softShadow,
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

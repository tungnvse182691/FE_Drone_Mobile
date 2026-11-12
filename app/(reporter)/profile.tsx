import { reporterAppearance } from '../../src/components/reporter/appearance';
import { ReporterHeader } from '../../src/components/ReporterHeader';
import React, { useCallback, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/reporter/Button';
import { Toast } from '../../src/components/Toast';
import { AnimatedPressable } from '../../src/components/AnimatedPressable';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { useAuthStore } from '../../src/store/auth';
import { useReporterStore } from '../../src/store/reporter';
import { reporterReportsOptions, reportItemsFromPages, canShowReportPages } from '../../src/api/reporterApi';
import { fetchProfile, passwordSessionIdentity } from '../../src/api/authApi';
import { isReporterSession } from '../../src/api/uploads';
import { REPORTER_ACCOUNT, REPORTER_REPORT, REPORTER_TRACK } from '../../src/constants/routes';


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
  const refreshing = enabled && (profileQuery.isFetching || (reportQuery.isFetching && !reportQuery.isFetchingNextPage));

  return (
    <SafeAreaScreen scroll header={<ReporterHeader title="Hồ sơ cá nhân" onBack={() => router.canGoBack() ? router.back() : router.replace(REPORTER_ACCOUNT)}
      rightAction={<Pressable testID="refresh-profile" accessibilityRole="button" accessibilityLabel="Làm mới hồ sơ"
        accessibilityState={{ disabled: !enabled || refreshing, busy: refreshing }} disabled={!enabled || refreshing}
        onPress={() => { void refreshProfile(); void refreshReports(); }}
        style={{ width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', opacity: !enabled ? 0.4 : 1 }}>
        {refreshing ? <ActivityIndicator size="small" color={colors.secondary} /> : <MaterialIcons name="refresh" size={24} color={colors.secondary} />}
      </Pressable>} />}>
      <View style={styles.profileHeader}>
        <View style={styles.identityRow}>
          <View style={styles.avatar}>
            <MaterialIcons name="person" size={32} color={colors.secondary} />
          </View>
          <View style={styles.identityText}>
            <Text style={[typography.titleMd, styles.name]}>{displayName}</Text>
            <Text style={[typography.bodyMd, styles.email]}>
              {activeEmail || 'Chưa có dữ liệu hồ sơ'}
            </Text>
          </View>
        </View>

        <View style={styles.statusPill}>
          <View style={[styles.statusDot, isActive ? styles.statusDotGreen : styles.statusDotYellow]} />
          <Text style={[typography.caption, isActive ? styles.statusTextGreen : styles.statusTextYellow]}>
            {profile ? (profile.status === 'ACTIVE' ? 'Tài khoản đang hoạt động' : 'Tài khoản chưa ở trạng thái hoạt động') : 'Chưa xác nhận trạng thái tài khoản'}
          </Text>
        </View>
      </View>

      {!enabled ? <Text>Vui lòng đăng nhập để xem hồ sơ.</Text> : null}
      {enabled && (profileQuery.isError || reportQuery.isError) ? <Text style={{ color: colors.error }}>{reportQuery.isFetchNextPageError && canShowReportPages(reportQuery) && !profileQuery.isError ? 'Không tải thêm được. Thống kê hiện chỉ gồm các phản ánh đã tải.' : 'Không tải được dữ liệu. Vui lòng làm mới để thử lại.'}</Text> : null}
      {enabled && (profileQuery.isPending || reportQuery.isPending) ? <Text>Đang tải hồ sơ…</Text> : null}
      <Card style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={[typography.headlineLg, styles.statValue]}>{countAvailable ? totalReports : '—'}</Text>
          <Text style={[typography.caption, styles.statLabel]}>Phản ánh đã tải</Text>
        </View>
        <View style={[styles.statCard, styles.statDivider]}>
          <Text style={[typography.headlineLg, styles.statValuePrimary]}>{countAvailable ? totalEvidence : '—'}</Text>
          <Text style={[typography.caption, styles.statLabel]}>Ảnh hiện trường</Text>
        </View>
        <View style={[styles.statCard, styles.statDivider]}>
          <Text style={[typography.headlineLg, styles.statValueSuccess]}>{countAvailable ? totalSupplements : '—'}</Text>
          <Text style={[typography.caption, styles.statLabel]}>Bổ sung</Text>
        </View>
      </Card>

      {enabled && reportQuery.hasNextPage ? <Button variant="secondary" title="Tải thêm phản ánh" loading={reportQuery.isFetchingNextPage} disabled={reportQuery.isFetching} onPress={() => void reportQuery.fetchNextPage()} /> : null}
      <Text style={[typography.titleMd, styles.sectionTitle]}>Thao tác nhanh</Text>

      <Card style={styles.menuCard}>
        <AnimatedPressable
          style={styles.menuItem}
          android_ripple={{ color: reporterAppearance.pressed, foreground: true }}
          onPress={() => router.push(REPORTER_REPORT)}
          accessibilityRole="button"
        >
          <View style={styles.menuIconWrap}>
            <MaterialIcons name="add-circle-outline" size={22} color={colors.primaryDark} />
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
          android_ripple={{ color: reporterAppearance.pressed, foreground: true }}
          onPress={() => router.push(REPORTER_TRACK)}
          accessibilityRole="button"
        >
          <View style={styles.menuIconWrap}>
            <MaterialIcons name="description" size={22} color={colors.primaryDark} />
          </View>
          <View style={styles.menuTextWrap}>
            <Text style={[typography.bodyMd, styles.menuLabel]}>Phản ánh của tôi</Text>
            <Text style={[typography.caption, styles.menuSub]}>Xem cập nhật đã công bố</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={colors.secondary} />
        </AnimatedPressable>
      </Card>

      <Text style={[typography.titleMd, styles.sectionTitle]}>Quyền riêng tư</Text>
      <Card style={styles.menuCard}>
        <AnimatedPressable
          style={styles.menuItem}
          android_ripple={{ color: reporterAppearance.pressed, foreground: true }}
          onPress={() =>
            Alert.alert(
              'Chính sách quyền riêng tư',
              'Form chưa bấm Gửi không được tự lưu hoặc khôi phục. Lệnh đã bắt đầu gửi và ảnh liên quan được giữ để đối soát theo tài khoản và phiên. Chỉ gửi nội dung bạn có quyền chia sẻ; không đưa thông tin riêng tư không cần thiết vào ảnh hoặc mô tả.',
            )
          }
          accessibilityRole="button"
        >
          <View style={styles.menuIconWrap}>
            <MaterialIcons name="security" size={22} color={colors.secondary} />
          </View>
          <View style={styles.menuTextWrap}>
            <Text style={[typography.bodyMd, styles.menuLabel]}>Chính sách bảo mật & Quyền riêng tư</Text>
            <Text style={[typography.caption, styles.menuSub]}>Lưu ý khi gửi ảnh và thông tin cá nhân</Text>
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
      </View>

      {toast && <Toast message={toast} type="info" />}
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  profileHeader: {
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
    ...reporterAppearance.card,
  },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  identityText: { flex: 1 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: reporterAppearance.pressed,
    borderWidth: 1,
    borderColor: reporterAppearance.border,
    alignItems: 'center',
    justifyContent: 'center',
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
    alignSelf: 'flex-start',
    maxWidth: '100%',
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
    flexShrink: 0,
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
    flexShrink: 1,
    color: colors.success,
    fontFamily: 'Roboto-Medium',
  },
  statusTextYellow: {
    flexShrink: 1,
    color: colors.warning,
    fontFamily: 'Roboto-Medium',
  },
  statsRow: {
    ...reporterAppearance.card,
    padding: 0,
    overflow: 'hidden',
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: 80,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  statDivider: { borderLeftWidth: 1, borderLeftColor: reporterAppearance.border },
  statValue: {
    color: colors.neutral,
    fontFamily: 'Roboto-Bold',
  },
  statValuePrimary: {
    color: colors.primary,
    fontFamily: 'Roboto-Bold',
  },
  statValueSuccess: {
    color: colors.neutral,
    fontFamily: 'Roboto-Bold',
  },
  statLabel: {
    textAlign: 'center',
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
    ...reporterAppearance.card,
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
    backgroundColor: reporterAppearance.pressed,
    borderWidth: 1,
    borderColor: reporterAppearance.border,
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
});

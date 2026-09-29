import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Card } from '../../src/components/Card';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { ReporterStatusBadge } from '../../src/components/ReporterStatusBadge';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { listMyReports } from '../../src/api/mock/reporter';
import { useReporterStore } from '../../src/store/reporter';
import { useAuthStore } from '../../src/store/auth';
import { REPORTER_PROFILE, REPORTER_REPORT, REPORTER_TRACK } from '../../src/constants/routes';
import { ReporterReport } from '../../src/types/domain';

export default function ReporterHomeScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const verifiedEmail = useReporterStore((state) => state.verifiedEmail);
  const markVerified = useReporterStore((state) => state.markVerified);
  const [reports, setReports] = useState<ReporterReport[]>([]);

  const activeEmail = user?.phone_or_email || verifiedEmail;

  useEffect(() => {
    if (user?.phone_or_email && !verifiedEmail) {
      markVerified(user.phone_or_email);
    }
  }, [user?.phone_or_email, verifiedEmail, markVerified]);

  const loadReports = useCallback(async () => {
    if (!activeEmail) {
      setReports([]);
      return;
    }
    try {
      const { items } = await listMyReports(activeEmail);
      setReports(items);
    } catch {
      setReports([]);
    }
  }, [activeEmail]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  return (
    <SafeAreaScreen
      scroll
      header={
        <View style={styles.header}>
          <Image
            source={require('../../assets/logo_hoanghai_icon.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <View style={styles.headerTextBlock}>
            <Text style={[typography.titleMd, styles.headerTitle]}>BÊ TÔNG HOÀNG HẢI</Text>
            <Text style={[typography.caption, styles.headerSubtitle]}>Cổng phản ánh dân sinh</Text>
          </View>
          <Pressable
            onPress={() => router.push(REPORTER_PROFILE)}
            style={({ pressed }) => [styles.profileBtn, pressed && styles.profileBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Hồ sơ tài khoản"
          >
            <MaterialIcons name="account-circle" size={28} color={colors.primaryDark} />
          </Pressable>
        </View>
      }
    >
      <Card style={styles.banner}>
        <View style={styles.bannerRow}>
          <MaterialIcons name="campaign" size={28} color={colors.primaryDark} />
          <Text style={[typography.titleMd, styles.bannerTitle]}>
            Hệ thống tiếp nhận phản ánh hư hại đường bê tông ĐH.05 Bình Chánh
          </Text>
        </View>
        <Text style={[typography.caption, styles.bannerBody]}>
          Phản ánh của bạn sẽ được Ban Quản lý dự án tiếp nhận, khảo sát và phản hồi kết quả xử lý.
        </Text>
      </Card>

      <View style={styles.actions}>
        <ActionCard
          icon="add-circle"
          title="Gửi phản ánh khuyết tật mới"
          description="Chụp ảnh hiện trường và mô tả vị trí hư hại"
          onPress={() => router.push(REPORTER_REPORT)}
          testID="reporter-action-report"
        />
        <ActionCard
          icon="search"
          title="Tra cứu tiến độ xử lý"
          description="Nhập mã phản ánh để theo dõi từng bước xử lý"
          onPress={() => router.push(REPORTER_TRACK)}
          testID="reporter-action-track"
        />
      </View>

      <Text style={[typography.titleMd, styles.sectionTitle]}>Phản ánh gần đây của bạn</Text>

      {!activeEmail ? (
        <Card style={styles.hintCard}>
          <View style={styles.hintRow}>
            <MaterialIcons name="mail-outline" size={20} color={colors.secondary} />
            <Text style={[typography.bodyMd, styles.hintText]}>
              Chưa có email đã xác thực. Gửi phản ánh để hệ thống gửi mã OTP xác thực tới email của bạn.
            </Text>
          </View>
        </Card>
      ) : reports.length === 0 ? (
        <Card style={styles.hintCard}>
          <View style={styles.hintRow}>
            <MaterialIcons name="inbox" size={20} color={colors.secondary} />
            <Text style={[typography.bodyMd, styles.hintText]}>
              Bạn chưa có phản ánh nào với email {activeEmail}.
            </Text>
          </View>
        </Card>
      ) : (
        <View style={styles.reportList}>
          {reports.map((report) => (
            <Pressable
              key={report.tracking_code}
              onPress={() =>
                router.push({ pathname: REPORTER_TRACK, params: { code: report.tracking_code } })
              }
              accessibilityRole="button"
              accessibilityLabel={`Xem tiến độ phản ánh ${report.tracking_code}`}
            >
              <Card style={styles.reportCard}>
                <View style={styles.reportHeader}>
                  <Text style={[typography.titleMd, styles.reportCode]}>{report.tracking_code}</Text>
                  <ReporterStatusBadge status={report.status} />
                </View>
                <Text style={[typography.bodyMd, styles.reportRoute]} numberOfLines={1}>
                  {report.route_hint || 'Chưa cung cấp vị trí cụ thể'}
                </Text>
                <Text style={[typography.caption, styles.reportDescription]} numberOfLines={2}>
                  {report.description}
                </Text>
                <View style={styles.reportFooter}>
                  <MaterialIcons name="schedule" size={12} color={colors.secondary} />
                  <Text style={[typography.caption, styles.reportDate]}>
                    {formatDate(report.submitted_at)}
                  </Text>
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      )}
    </SafeAreaScreen>
  );
}

interface ActionCardProps {
  icon: 'add-circle' | 'search';
  title: string;
  description: string;
  onPress: () => void;
  testID?: string;
}

function ActionCard({ icon, title, description, onPress, testID }: ActionCardProps) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [styles.actionWrapper, pressed && styles.actionPressed]}
    >
      <Card style={styles.actionCard}>
        <View style={styles.actionIcon}>
          <MaterialIcons name={icon} size={26} color={colors.brandGold} />
        </View>
        <View style={styles.actionText}>
          <Text style={[typography.titleMd, styles.actionTitle]}>{title}</Text>
          <Text style={[typography.caption, styles.actionDescription]}>{description}</Text>
        </View>
        <MaterialIcons name="chevron-right" size={22} color={colors.secondary} />
      </Card>
    </Pressable>
  );
}

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.screenMargin,
    paddingVertical: spacing.md,
  },
  headerLogo: {
    width: 40,
    height: 40,
  },
  headerTextBlock: {
    flex: 1,
  },
  profileBtn: {
    padding: spacing.xs,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBtnPressed: {
    opacity: 0.7,
    backgroundColor: colors.surfaceAlt,
  },
  headerTitle: {
    color: colors.brandGold,
  },
  headerSubtitle: {
    color: colors.secondary,
  },
  banner: {
    backgroundColor: colors.surfaceAlt,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  bannerTitle: {
    flex: 1,
    color: colors.onSurface,
  },
  bannerBody: {
    color: colors.secondary,
  },
  actions: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  actionWrapper: {
    borderRadius: radius.lg,
  },
  actionPressed: {
    opacity: 0.85,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    flex: 1,
    gap: 2,
  },
  actionTitle: {
    color: colors.onSurface,
  },
  actionDescription: {
    color: colors.secondary,
  },
  sectionTitle: {
    color: colors.onSurface,
    marginBottom: spacing.md,
  },
  hintCard: {
    backgroundColor: colors.surfaceAlt,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  hintText: {
    flex: 1,
    color: colors.secondary,
  },
  reportList: {
    gap: spacing.md,
  },
  reportCard: {
    gap: spacing.xs,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  reportCode: {
    color: colors.brandGold,
  },
  reportRoute: {
    color: colors.onSurface,
  },
  reportDescription: {
    color: colors.secondary,
  },
  reportFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  reportDate: {
    color: colors.secondary,
  },
});

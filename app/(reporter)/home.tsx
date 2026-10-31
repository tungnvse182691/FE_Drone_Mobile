import { listHistoricalReporterCommands, checkHistoricalReporterCommand, type HistoricalReporterCommand } from '../../src/store/reporterRecovery';
import { useReporterDraftScope } from '../../src/store/reporter';
import React, { useCallback, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Card } from '../../src/components/Card';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AnimatedPressable } from '../../src/components/AnimatedPressable';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { reporterReportsOptions, reportItemsFromPages, canShowReportPages } from '../../src/api/reporterApi';
import { passwordSessionIdentity } from '../../src/api/authApi';
import { isReporterSession } from '../../src/api/uploads';
import { Button } from '../../src/components/Button';
import { useAuthStore } from '../../src/store/auth';
import { REPORTER_PROFILE, REPORTER_REPORT, REPORTER_TRACK, REPORTER_REPORT_DETAIL } from '../../src/constants/routes';

const softShadow = Platform.select({
  ios: { shadowColor: '#1A1D20', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  android: { elevation: 3 },
  default: {},
});

export default function ReporterHomeScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore(state => state.token);
  const status = useAuthStore(state => state.status);
  const scope = passwordSessionIdentity(token);
  const enabled = isReporterSession({ user, token, status }) && !!scope;
  const query = useInfiniteQuery({ ...reporterReportsOptions(scope ?? 'guest'), enabled });
  const { refetch } = query;
  useFocusEffect(useCallback(() => { if (enabled) void refetch(); }, [enabled, refetch]));
  const reports = enabled && canShowReportPages(query) ? reportItemsFromPages(query.data?.pages) : [];
  const activeEmail = enabled ? user?.phone_or_email : null;

  const recoveryScope = useReporterDraftScope();
  const [history, setHistory] = useState<{ scope: string; rows: HistoricalReporterCommand[] } | null>(null);
  const [historyMessage, setHistoryMessage] = useState('');
  const [checking, setChecking] = useState(false);
  useFocusEffect(useCallback(() => {
    let active = true;
    const current = recoveryScope.capture();
    setHistory(null); setHistoryMessage(''); setChecking(false);
    if (enabled) void listHistoricalReporterCommands().then(rows => {
      if (active && current()) setHistory({ scope: recoveryScope.key, rows });
    }).catch(() => {
      if (active && current()) setHistoryMessage('Chưa kiểm tra được lệnh của phiên trước. Dữ liệu cũ vẫn được giữ.');
    });
    return () => { active = false; };
  }, [enabled, recoveryScope.key]));
  const inspect = async (id: string) => {
    if (checking || history?.scope !== recoveryScope.key) return;
    const current = recoveryScope.capture();
    setChecking(true);
    try {
      const result = await checkHistoricalReporterCommand(id);
      if (current()) setHistoryMessage(result.resourceReadable
        ? 'Đã đọc được phản ánh theo quyền hiện tại. Chưa có xác nhận riêng cho lệnh này từ máy chủ; chưa xác nhận hoàn tất và không tự gửi lại.'
        : 'Chưa có mã phản ánh để đối soát. Cần xác nhận lệnh từ máy chủ; lệnh và ảnh vẫn được giữ, không tự gửi lại.');
    } catch {
      if (current()) setHistoryMessage('Chưa đối soát được lệnh theo quyền hiện tại. Lệnh và ảnh vẫn được giữ.');
    } finally { if (current()) setChecking(false); }
  };

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
            Phản ánh hiện trạng hư hại đường bê tông
          </Text>
        </View>
        <Text style={[typography.caption, styles.bannerBody]}>
          Gửi ảnh và mô tả hiện trạng. Theo dõi tình trạng tiếp nhận và xử lý qua dữ liệu phản hồi từ hệ thống.
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
          title="Phản ánh của tôi"
          description="Xem lại các phản ánh đã gửi và bổ sung thông tin"
          onPress={() => router.push(REPORTER_TRACK)}
          testID="reporter-action-track"
        />
      </View>

      {enabled && history?.scope === recoveryScope.key && history.rows.length ? <Card>
        <Text style={typography.titleMd}>Lệnh gửi trước cần kiểm tra</Text>
        {history.rows.map((command, index) => <Button key={command.id} variant="secondary"
          title={`Kiểm tra lệnh ${command.kind === 'supplement' ? 'bổ sung' : 'phản ánh'} ${index + 1}`}
          disabled={checking} onPress={() => void inspect(command.id)} />)}
      </Card> : null}
      {enabled && historyMessage ? <Text style={typography.caption}>{historyMessage}</Text> : null}
      <Text style={[typography.titleMd, styles.sectionTitle]}>Phản ánh gần đây của bạn</Text>

      {enabled ? <Button variant="secondary" title="Làm mới" loading={query.isFetching && !query.isFetchingNextPage} onPress={() => void query.refetch()} /> : null}
      {enabled && query.isError ? <Text style={{ color: colors.error }}>{query.isFetchNextPageError && canShowReportPages(query) ? 'Không tải thêm được. Đang hiển thị phản ánh đã tải; thử tải thêm hoặc làm mới.' : 'Không tải được phản ánh. Vui lòng làm mới để thử lại.'}</Text> : null}
      {enabled && query.isPending ? <Text>Đang tải phản ánh…</Text> : null}
      {!activeEmail ? (
        <Card style={styles.hintCard}>
          <View style={styles.hintRow}>
            <MaterialIcons name="mail-outline" size={20} color={colors.secondary} />
            <Text style={[typography.bodyMd, styles.hintText]}>
              Nội dung chưa gửi không được lưu. Vui lòng đăng nhập để gửi và xem các phản ánh của bạn.
            </Text>
          </View>
        </Card>
      ) : !query.isPending && !query.isError && reports.length === 0 ? (
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
            <AnimatedPressable
              key={report.id}
              onPress={() =>
                router.push({
                  pathname: REPORTER_REPORT_DETAIL,
                  params: { reportId: report.id },
                })
              }
              accessibilityRole="button"
              accessibilityLabel={`Xem chi tiết phản ánh gửi lúc ${formatDate(report.createdAt)}`}
            >
              <Card style={styles.reportCard}>
                <View style={styles.reportHeader}>
                  <Text style={[typography.titleMd, styles.reportCode]}>
                    {formatDate(report.createdAt)}
                  </Text>
                  <MaterialIcons name="chevron-right" size={18} color={colors.secondary} />
                </View>
                <Text style={[typography.caption, styles.reportDescription]} numberOfLines={2}>
                  {report.description?.trim() || 'Chưa có mô tả'}
                </Text>
                <View style={styles.reportFooter}>
                  <MaterialIcons name="photo-library" size={12} color={colors.secondary} />
                  <Text style={[typography.caption, styles.reportDate]}>
                    {report.evidence.length} ảnh hiện trường
                  </Text>
                </View>
              </Card>
            </AnimatedPressable>
          ))}
        </View>
      )}
      {enabled && query.hasNextPage ? <Button variant="secondary" title="Tải thêm phản ánh" loading={query.isFetchingNextPage} disabled={query.isFetching} onPress={() => void query.fetchNextPage()} /> : null}
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
    <AnimatedPressable
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
    </AnimatedPressable>
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
    borderRadius: radius.xl,
    ...softShadow,
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
    borderRadius: radius.xl,
    ...softShadow,
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

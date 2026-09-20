import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { Toast } from '../../src/components/Toast';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

type ToastMessage = {
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
};

type StatusKind = 'pending' | 'approved' | 'rejected';

interface SubmitItem {
  id: string;
  route: string;
  title: string;
  sentAt: string;
  status: StatusKind;
  statusLabel: string;
  footer: string;
  footerKind: 'muted' | 'success';
  action: 'view' | 'assign' | 'resubmit';
  actionLabel: string;
  reason?: string;
}

const SUBMITTED: SubmitItem[] = [
  {
    id: '#DF-0231',
    route: 'Tuyến ĐH.05 (Km02+150)',
    title: 'Ổ gà sâu vỡ tấm bê tông',
    sentAt: 'Gửi lúc 14:30 • Hôm qua',
    status: 'pending',
    statusLabel: 'Đang chờ',
    footer: 'Supervisor chưa xử lý (Chế độ chỉ xem)',
    footerKind: 'muted',
    action: 'view',
    actionLabel: 'Xem lại',
  },
  {
    id: '#DF-0228',
    route: 'Tuyến ĐH.05 (Km03+400)',
    title: 'Bể mép tấm bê tông tiếp giáp lề',
    sentAt: 'Gửi lúc 09:15 • 24/10/2023',
    status: 'approved',
    statusLabel: 'Đã duyệt — chờ giao việc',
    footer: 'Đã được duyệt bởi Trưởng ca',
    footerKind: 'success',
    action: 'assign',
    actionLabel: 'Giao việc ngay',
  },
  {
    id: '#DF-0219',
    route: 'Tuyến NT-08 (Km03+100)',
    title: 'Nứt vỡ khe co giãn tấm bê tông',
    sentAt: 'Gửi lúc 16:40 • 23/10/2023',
    status: 'rejected',
    statusLabel: 'Bị từ chối',
    footer: 'Có thể chỉnh sửa và gửi lại',
    footerKind: 'muted',
    action: 'resubmit',
    actionLabel: 'Gửi lại phê duyệt',
    reason:
      'Dự toán chi phí vượt hạn mức bảo hành, yêu cầu khảo sát lại kích thước vết nứt và bổ sung báo giá vật tư chi tiết.',
  },
  {
    id: '#DF-0205',
    route: 'Tuyến ĐH.01 (Km01+700)',
    title: 'Đọng nước cục bộ mép đường',
    sentAt: 'Gửi lúc 11:00 • 22/10/2023',
    status: 'approved',
    statusLabel: 'Đã duyệt — chờ giao việc',
    footer: 'Đã được duyệt bởi Trưởng ca',
    footerKind: 'success',
    action: 'assign',
    actionLabel: 'Giao việc ngay',
  },
  {
    id: '#DF-0198',
    route: 'Tuyến NT-08 (Km02+500)',
    title: 'Sụt lún bề mặt bó vỉa hè',
    sentAt: 'Gửi lúc 08:30 • 21/10/2023',
    status: 'pending',
    statusLabel: 'Đang chờ',
    footer: 'Supervisor chưa xử lý (Chế độ chỉ xem)',
    footerKind: 'muted',
    action: 'view',
    actionLabel: 'Xem lại',
  },
];

function StatusPill({ kind, label }: { kind: StatusKind; label: string }) {
  const pill =
    kind === 'approved'
      ? styles.pillApproved
      : kind === 'rejected'
        ? styles.pillRejected
        : styles.pillPending;
  const text =
    kind === 'approved'
      ? styles.pillApprovedText
      : kind === 'rejected'
        ? styles.pillRejectedText
        : styles.pillPendingText;
  return (
    <View style={[styles.pill, pill]}>
      <Text style={[typography.labelSm, text]}>{label}</Text>
    </View>
  );
}

export default function PmSubmittedTabScreen() {
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const handleAction = (item: SubmitItem) => {
    if (item.action === 'view') {
      router.push('/(pm)/verify-a');
    } else if (item.action === 'resubmit') {
      router.push('/(pm)/resubmit');
    } else {
      router.push('/(pm)/assign-crew');
    }
  };

  return (
    <SafeAreaScreen scroll header={<AppHeader subtitle="Xác Minh" />}>
      <View style={styles.tabRow}>
        <Pressable
          onPress={() => router.push('/(pm)/ai-inbox')}
          accessibilityRole="tab"
          style={styles.tab}
        >
          <Text style={[typography.labelLg, styles.tabLabel]}>Lỗi mới</Text>
          <View style={styles.tabCount}>
            <Text style={[typography.labelSm, styles.tabCountText]}>12</Text>
          </View>
        </Pressable>
        <Pressable
          onPress={() => setToast({ type: 'info', message: '🔔 Chuyển sang tab Hàng Chờ' })}
          accessibilityRole="tab"
          style={styles.tab}
        >
          <Text style={[typography.labelLg, styles.tabLabel]}>Hàng Chờ</Text>
          <View style={styles.tabCount}>
            <Text style={[typography.labelSm, styles.tabCountText]}>12</Text>
          </View>
        </Pressable>
        <Pressable accessibilityRole="tab" accessibilityState={{ selected: true }} style={[styles.tab, styles.tabActive]}>
          <Text style={[typography.labelLg, styles.tabLabel, styles.tabLabelActive]}>Đã duyệt</Text>
          <View style={[styles.tabCount, styles.tabCountActive]}>
            <Text style={[typography.labelSm, styles.tabCountTextActive]}>4</Text>
          </View>
        </Pressable>
      </View>

      <View style={styles.subheaderRow}>
        <View style={styles.subheaderLeft}>
          <Ionicons name="arrow-up-outline" size={16} color={colors.primary} />
          <Text style={[typography.labelLg, styles.subheaderText]}>
            5 yêu cầu đã gửi Supervisor phê duyệt
          </Text>
        </View>
        <Pressable
          onPress={() => setToast({ type: 'info', message: '🔎 Mở bộ lọc danh sách' })}
          style={styles.filterBtn}
          accessibilityRole="button"
        >
          <Text style={[typography.labelSm, styles.filterText]}>Bộ lọc</Text>
          <Ionicons name="options-outline" size={14} color={colors.brandGold} />
        </Pressable>
      </View>

      {SUBMITTED.map((item) => (
        <Card key={item.id} style={styles.itemCard}>
          <View style={styles.itemTopRow}>
            <Text style={[typography.labelSm, styles.itemId]}>
              {item.id} • {item.route}
            </Text>
            <StatusPill kind={item.status} label={item.statusLabel} />
          </View>
          <Text style={[typography.titleMd, styles.itemTitle]}>{item.title}</Text>
          <View style={styles.itemTimeRow}>
            <Ionicons name="time-outline" size={13} color={colors.secondary} />
            <Text style={[typography.caption, styles.itemTime]}>{item.sentAt}</Text>
          </View>

          {item.reason ? (
            <View style={styles.reasonBox}>
              <Ionicons name="warning-outline" size={16} color={colors.error} />
              <Text style={[typography.caption, styles.reasonText]}>
                <Text style={styles.reasonBold}>Lý do: </Text>
                {item.reason}
              </Text>
            </View>
          ) : null}

          <View style={styles.itemFooter}>
            <View style={styles.itemFooterLeft}>
              <Ionicons
                name={item.footerKind === 'success' ? 'checkmark-circle' : 'eye-outline'}
                size={14}
                color={item.footerKind === 'success' ? colors.success : colors.secondary}
              />
              <Text
                style={[
                  typography.caption,
                  item.footerKind === 'success' ? styles.footerSuccess : styles.footerMuted,
                ]}
              >
                {item.footer}
              </Text>
            </View>
            <Pressable onPress={() => handleAction(item)} accessibilityRole="button" style={styles.actionBtn}>
              <Text
                style={[
                  typography.labelSm,
                  item.action === 'resubmit' ? styles.actionTextReject : styles.actionText,
                ]}
              >
                {item.actionLabel}
              </Text>
              {item.action === 'resubmit' ? (
                <Ionicons name="arrow-forward" size={14} color={colors.error} />
              ) : (
                <Ionicons name="chevron-forward" size={14} color={colors.brandGold} />
              )}
            </Pressable>
          </View>
        </Card>
      ))}

      {toast ? <Toast type={toast.type} message={toast.message} /> : null}
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabLabel: {
    color: colors.secondary,
  },
  tabLabelActive: {
    color: colors.neutral,
  },
  tabCount: {
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
  tabCountActive: {
    backgroundColor: colors.surfaceAlt,
  },
  tabCountText: {
    color: colors.secondary,
  },
  tabCountTextActive: {
    color: colors.brandGold,
  },
  subheaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  subheaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  subheaderText: {
    color: colors.secondary,
    flexShrink: 1,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.md,
  },
  filterText: {
    color: colors.brandGold,
  },
  itemCard: {
    marginBottom: spacing.md,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  itemId: {
    color: colors.secondary,
    flexShrink: 1,
  },
  itemTitle: {
    color: colors.neutral,
    marginBottom: spacing.xs,
  },
  itemTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.sm,
  },
  itemTime: {
    color: colors.secondary,
  },
  reasonBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.lg,
    padding: 10,
    marginBottom: spacing.sm,
  },
  reasonText: {
    color: colors.error,
    flex: 1,
    lineHeight: 16,
  },
  reasonBold: {},
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  itemFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  footerMuted: {
    color: colors.secondary,
    flexShrink: 1,
  },
  footerSuccess: {
    color: colors.success,
    flexShrink: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  actionText: {
    color: colors.brandGold,
  },
  actionTextReject: {
    color: colors.error,
  },
  pill: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  pillPending: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
  },
  pillPendingText: {
    color: colors.secondary,
  },
  pillApproved: {
    backgroundColor: '#FEF3E2',
    borderColor: colors.primary,
  },
  pillApprovedText: {
    color: colors.brandGold,
  },
  pillRejected: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.error,
  },
  pillRejectedText: {
    color: colors.error,
  },
});
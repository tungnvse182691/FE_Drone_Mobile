import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { StatusBadge } from '../../src/components/StatusBadge';
import { EmptyState } from '../../src/components/EmptyState';
import { Toast } from '../../src/components/Toast';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { SyncStatus } from '../../src/types/enums';

type SyncSegment = 'pending' | 'done';

interface QueueItem {
  name: string;
  meta: string;
  size: string;
  status: SyncStatus;
  progress?: number;
}

const SEGMENTS: { key: SyncSegment; label: string; count: number }[] = [
  { key: 'pending', label: 'Đang chờ', count: 3 },
  { key: 'done', label: 'Đã đồng bộ', count: 12 },
];

const QUEUE_ITEMS: QueueItem[] = [
  {
    name: 'Bằng chứng nghiệm thu #WO-118',
    meta: 'Km1842+150 QL1A • Trám vá ổ gà',
    size: '4 ảnh • 14.2 MB',
    status: SyncStatus.UPLOADING,
    progress: 65,
  },
  {
    name: 'Báo cáo sự cố phát sinh #WR-004',
    meta: 'Nứt lún lề đường phát sinh thêm',
    size: '1 video • 12.8 MB',
    status: SyncStatus.QUEUED,
  },
  {
    name: 'Cập nhật nhật ký thi công #WO-118',
    meta: 'Lỗi kết nối máy chủ',
    size: '1.5 MB',
    status: SyncStatus.INVALID,
  },
];

export default function CrewSyncScreen() {
  const [segment, setSegment] = useState<SyncSegment>('pending');
  const [toast, setToast] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const syncNow = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setSegment('done');
      setToast('Bắt đầu đồng bộ 3 mục…');
      setTimeout(() => setToast('Đồng bộ dữ liệu thành công!'), 1500);
    }, 1200);
  };

  const refresh = () => {
    setToast('Đang làm mới danh sách đồng bộ…');
  };

  const retry = () => {
    setToast('Đang thử lại tải lên nhật ký thi công…');
  };

  const cleanupCache = () => {
    setToast('Đã dọn dẹp 120MB bộ nhớ đệm');
  };

  return (
    <SafeAreaScreen scroll header={<AppHeader subtitle="Đồng Bộ" />}>
      <View style={styles.titleRow}>
        <View style={styles.titleGroup}>
          <Ionicons name="sync" size={22} color={colors.primary} />
          <Text style={[typography.titleLg, styles.pageTitle]}>Đồng bộ dữ liệu</Text>
        </View>
        <Pressable accessibilityRole="button" style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]} onPress={refresh}>
          <Ionicons name="refresh" size={20} color={colors.secondary} />
        </Pressable>
      </View>

      <View style={styles.segments}>
        {SEGMENTS.map((s) => {
          const active = s.key === segment;
          return (
            <Pressable
              key={s.key}
              style={[styles.segment, active && styles.segmentActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setSegment(s.key)}
            >
              <Text style={[typography.labelSm, active ? styles.segmentLabelActive : styles.segmentLabel]}>
                {s.label} ({s.count})
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Card style={styles.statusCard}>
        <View style={styles.statusTop}>
          <View style={styles.statusInfo}>
            <View style={styles.statusDot} />
            <Text style={[typography.labelLg, styles.statusText]}>3 mục đang chờ đồng bộ • 28.5 MB</Text>
          </View>
          <View style={styles.networkRow}>
            <Ionicons name="wifi" size={15} color={colors.success} />
            <Text style={[typography.labelSm, styles.networkText]}>4G/Wi-Fi kết nối</Text>
          </View>
        </View>
        <Text style={[typography.bodyMd, styles.statusDesc]}>
          Chỉ qua Wi-Fi / 4G khả dụng. Các tác vụ trường hiện trường sẽ được ưu tiên theo thứ tự thực hiện.
        </Text>
        <View style={styles.syncBtnWrap}>
          <Button variant="primary" title="Đồng bộ ngay" loading={syncing} onPress={syncNow} />
        </View>
      </Card>

      {segment === 'pending' ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={[typography.labelSm, styles.sectionTitle]}>MỤC CẦN TẢI LÊN</Text>
            <Text style={[typography.caption, styles.sectionHint]}>Tự động khi có mạng</Text>
          </View>

          {QUEUE_ITEMS.map((item) => (
            <Card key={item.name} style={styles.itemCard}>
              <View style={styles.itemTop}>
                <View style={styles.itemContent}>
                  <Text style={[typography.labelLg, styles.itemName]}>{item.name}</Text>
                  <Text style={[typography.caption, styles.itemMeta]}>{item.meta}</Text>
                </View>
                <View style={styles.itemSide}>
                  <StatusBadge status={item.status} />
                  {item.status === SyncStatus.INVALID ? (
                    <Pressable accessibilityRole="button" style={({ pressed }) => [styles.retryBtn, pressed && styles.pressed]} onPress={retry}>
                      <Ionicons name="refresh" size={16} color={colors.secondary} />
                    </Pressable>
                  ) : null}
                </View>
              </View>
              <Text style={[typography.caption, styles.itemSize]}>{item.size}</Text>
              {item.progress != null ? (
                <View style={styles.progressWrap}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${item.progress}%` }]} />
                  </View>
                  <Text style={[typography.labelSm, styles.progressText]}>{item.progress}%</Text>
                </View>
              ) : null}
            </Card>
          ))}

          <Card style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="shield-checkmark-outline" size={22} color={colors.secondary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[typography.labelLg, styles.infoTitle]}>Bảo toàn dữ liệu ngoại tuyến</Text>
                <Text style={[typography.caption, styles.infoDesc]}>
                  Dữ liệu sửa chữa và hình ảnh nghiệm thu được lưu an toàn tại bộ nhớ thiết bị. Hệ thống sẽ tự động
                  đồng bộ ngay khi phát hiện kết nối mạng ổn định hoặc khi bấm “Đồng bộ ngay”.
                </Text>
              </View>
            </View>
          </Card>

          <Card style={styles.cacheCard}>
            <View style={styles.cacheRow}>
              <View style={styles.cacheIcon}>
                <Ionicons name="albums-outline" size={20} color={colors.secondary} />
              </View>
              <View style={styles.cacheContent}>
                <Text style={[typography.labelLg, styles.cacheTitle]}>Bộ nhớ đệm hiện trường</Text>
                <Text style={[typography.caption, styles.cacheDesc]}>2.1 GB còn trống trên máy</Text>
              </View>
            </View>
            <Pressable accessibilityRole="button" style={({ pressed }) => [styles.cleanupBtn, pressed && styles.cleanupPressed]} onPress={cleanupCache}>
              <Text style={[typography.labelSm, styles.cleanupText]}>DỌN DẸP</Text>
            </Pressable>
          </Card>
        </>
      ) : (
        <EmptyState
          icon="sync-outline"
          title="Đã đồng bộ xong"
          message="Toàn bộ dữ liệu hiện trường đã được đồng bộ lên máy chủ."
        />
      )}

      {toast ? <Toast type="success" message={toast} /> : null}
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pageTitle: {
    color: colors.neutral,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: colors.surfaceAlt,
  },
  segments: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.lg,
    backgroundColor: colors.border,
    borderRadius: radius.lg,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: colors.surface,
  },
  segmentLabel: {
    color: colors.secondary,
  },
  segmentLabelActive: {
    color: colors.neutral,
  },
  statusCard: {
    marginBottom: spacing.lg,
  },
  statusTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.warning,
  },
  statusText: {
    color: colors.neutral,
  },
  networkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  networkText: {
    color: colors.success,
  },
  statusDesc: {
    color: colors.secondary,
    marginTop: spacing.sm,
  },
  syncBtnWrap: {
    marginTop: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.secondary,
  },
  sectionHint: {
    color: colors.secondary,
  },
  itemCard: {
    marginBottom: spacing.sm,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    color: colors.neutral,
  },
  itemMeta: {
    color: colors.secondary,
    marginTop: 2,
  },
  itemSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  retryBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemSize: {
    color: colors.secondary,
    marginTop: spacing.xs,
  },
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  progressText: {
    color: colors.primaryDark,
  },
  infoCard: {
    marginTop: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    color: colors.neutral,
  },
  infoDesc: {
    color: colors.secondary,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  cacheCard: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  cacheRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  cacheIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cacheContent: {
    flex: 1,
  },
  cacheTitle: {
    color: colors.neutral,
  },
  cacheDesc: {
    color: colors.secondary,
    marginTop: 2,
  },
  cleanupBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  cleanupPressed: {
    backgroundColor: colors.surfaceAlt,
  },
  cleanupText: {
    color: colors.primaryDark,
    letterSpacing: 0.04,
  },
});
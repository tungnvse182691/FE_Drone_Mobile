import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

interface SyncItem {
  id: string;
  name: string;
  meta: string;
  type: 'video' | 'photo' | 'form';
  status: 'uploading' | 'queued' | 'error' | 'confirmed';
  statusText: string;
  sha256: string;
}

const INITIAL_QUEUE: SyncItem[] = [
  {
    id: '1',
    name: 'DJI_0482_SURVEY_DT741.MP4',
    meta: '184.2 MB · Đoạn ĐT.741',
    type: 'video',
    status: 'uploading',
    statusText: 'Đang tải lên (65%)',
    sha256: '7f8a3c...e4b1',
  },
  {
    id: '2',
    name: 'DJI_0483_PHOTO_TALUY.JPG',
    meta: '12.4 MB · 4 ảnh chụp chi tiết',
    type: 'photo',
    status: 'queued',
    statusText: 'Đang chờ Wi-Fi',
    sha256: 'a1b2c3...f902',
  },
  {
    id: '3',
    name: 'Biên bản kiểm tra hiện trường #REQ-KS-089',
    meta: '45 KB · Bản nháp ngoại tuyến',
    type: 'form',
    status: 'queued',
    statusText: 'Đang chờ',
    sha256: 'd4e5f6...3312',
  },
];

const COMPLETED_QUEUE: SyncItem[] = [
  {
    id: 'c1',
    name: 'DJI_0481_SURVEY_DT741_PART1.MP4',
    meta: '178.5 MB · Đoạn ĐT.741',
    type: 'video',
    status: 'confirmed',
    statusText: 'Đã đối soát SHA-256',
    sha256: '9a8b7c...11d2',
  },
  {
    id: 'c2',
    name: 'DJI_0480_SURVEY_SONGBE.MP4',
    meta: '192.1 MB · Cầu Sông Bé',
    type: 'video',
    status: 'confirmed',
    statusText: 'Đã đối soát SHA-256',
    sha256: '3f4e5d...88c9',
  },
  {
    id: 'c3',
    name: 'DJI_0479_SURVEY_QL1A.MP4',
    meta: '165.4 MB · Km1842+150',
    type: 'video',
    status: 'confirmed',
    statusText: 'Đã đối soát SHA-256',
    sha256: '5a6b7c...22e3',
  },
];

export default function DroneSyncScreen() {
  const [queueTab, setQueueTab] = useState<'pending' | 'completed'>('pending');
  const [pendingQueue, setPendingQueue] = useState<SyncItem[]>(INITIAL_QUEUE);
  const [completedQueue, setCompletedQueue] = useState<SyncItem[]>(COMPLETED_QUEUE);
  const [uploadPercent, setUploadPercent] = useState<number>(65);
  const [syncing, setSyncing] = useState(false);
  const [purged, setPurged] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleSyncAll = () => {
    if (pendingQueue.length === 0) {
      showToast('Tất cả tệp đã được đồng bộ an toàn lên máy chủ!');
      return;
    }
    setSyncing(true);
    showToast('Bắt đầu tải lên: 65% → 85% → 100% (Chunked upload)...');
    
    // Simulate upload progress
    setTimeout(() => {
      setUploadPercent(85);
      setTimeout(() => {
        setUploadPercent(100);
        setTimeout(() => {
          setSyncing(false);
          // Move items to completed
          const syncedItems: SyncItem[] = pendingQueue.map((item) => ({
            ...item,
            status: 'confirmed',
            statusText: 'Đã đối soát SHA-256',
          }));
          setCompletedQueue((prev) => [...syncedItems, ...prev]);
          setPendingQueue([]);
          setQueueTab('completed');
          showToast('Đã đồng bộ 3 tệp & đối soát mã SHA-256 an toàn 100%!');
        }, 800);
      }, 900);
    }, 800);
  };

  const handleSafePurge = () => {
    if (pendingQueue.length > 0) {
      showToast('Cảnh báo: Còn tệp chưa đồng bộ lên máy chủ, chỉ giải phóng tệp đã đối soát.');
    }
    setPurged(true);
    showToast('Đã giải phóng an toàn 196.6 MB bản sao trên bộ nhớ thiết bị.');
  };

  const activeItems = queueTab === 'pending' ? pendingQueue : completedQueue;

  return (
    <SafeAreaScreen scroll header={<AppHeader subtitle="Đồng bộ ngoại tuyến" />}>
      {/* Toast Notification */}
      {toastMsg && (
        <View style={styles.toast}>
          <Ionicons name="information-circle" size={18} color={colors.surface} />
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      )}

      {/* Switcher */}
      <View style={styles.headerRow}>
        <Text style={[typography.labelSm, styles.headerTitle]}>HÀNG ĐỢI ĐỒNG BỘ NỀN</Text>
        <View style={styles.tabToggle}>
          <Pressable
            style={[styles.toggleBtn, queueTab === 'pending' && styles.toggleBtnActive]}
            onPress={() => setQueueTab('pending')}
          >
            <Text
              style={[styles.toggleBtnText, queueTab === 'pending' && styles.toggleBtnTextActive]}
            >
              Đang chờ ({pendingQueue.length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.toggleBtn, queueTab === 'completed' && styles.toggleBtnActive]}
            onPress={() => setQueueTab('completed')}
          >
            <Text
              style={[styles.toggleBtnText, queueTab === 'completed' && styles.toggleBtnTextActive]}
            >
              Đã xong ({completedQueue.length})
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Summary & Single CTA */}
      <Card style={styles.summaryCard}>
        <View style={styles.summaryInfo}>
          <View style={styles.syncPulseRow}>
            <View
              style={[
                styles.pulseDot,
                pendingQueue.length === 0 && { backgroundColor: colors.success },
              ]}
            />
            <Text style={[typography.titleMd, styles.summaryCount]}>
              {pendingQueue.length > 0
                ? `${pendingQueue.length} tệp đang chờ đồng bộ`
                : 'Đã hoàn tất mọi tệp đồng bộ'}
            </Text>
          </View>
          <Text style={[typography.caption, styles.totalSize]}>
            {pendingQueue.length > 0 ? 'Tổng: 196.6 MB' : 'Dung lượng: 0 B'}
          </Text>
        </View>

        <Button
          variant="primary"
          title={
            syncing
              ? `Đang tải lên (${uploadPercent}%)...`
              : pendingQueue.length > 0
              ? 'Đồng bộ tất cả ngay'
              : 'Đã đồng bộ đầy đủ'
          }
          loading={syncing}
          disabled={pendingQueue.length === 0 || syncing}
          onPress={handleSyncAll}
        />
      </Card>

      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <Text style={[typography.labelSm, styles.sectionTitle]}>
          {queueTab === 'pending' ? 'DANH SÁCH TỆP CHỜ TẢI' : 'TỆP ĐÃ XÁC NHẬN TOÀN VẸN (SERVER)'}
        </Text>
        <Text style={[typography.caption, styles.sectionSub]}>
          {queueTab === 'pending' ? 'Tự động tải khi có Wi-Fi/4G' : 'Khớp mã băm SHA-256'}
        </Text>
      </View>

      {/* Queue Items */}
      <View style={styles.itemsList}>
        {activeItems.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="checkmark-circle-outline" size={36} color={colors.success} />
            <Text style={[typography.bodyMd, { color: colors.secondary, marginTop: 6 }]}>
              Không có tệp nào trong danh sách
            </Text>
          </Card>
        ) : (
          activeItems.map((item) => (
            <Card key={item.id} style={styles.itemCard}>
              <View style={styles.itemMain}>
                <View style={styles.itemIconWrap}>
                  {item.type === 'video' && (
                    <Ionicons name="videocam" size={20} color={colors.primary} />
                  )}
                  {item.type === 'photo' && (
                    <Ionicons name="images" size={20} color={colors.info} />
                  )}
                  {item.type === 'form' && (
                    <Ionicons name="document-text" size={20} color={colors.secondary} />
                  )}
                </View>

                <View style={styles.itemInfo}>
                  <Text style={[typography.bodyMd, styles.itemName]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[typography.caption, styles.itemMeta]}>{item.meta}</Text>
                  <Text style={[typography.caption, styles.itemHash]}>SHA: {item.sha256}</Text>
                </View>
              </View>

              <View style={styles.statusBadge}>
                {item.status === 'uploading' && (
                  <View style={styles.uploadingPill}>
                    <Ionicons name="sync" size={12} color={colors.info} />
                    <Text style={styles.uploadingText}>
                      {syncing ? `Đang tải (${uploadPercent}%)` : item.statusText}
                    </Text>
                  </View>
                )}
                {item.status === 'queued' && (
                  <View style={styles.queuedPill}>
                    <Text style={styles.queuedText}>
                      {syncing ? 'Đang xếp hàng...' : item.statusText}
                    </Text>
                  </View>
                )}
                {item.status === 'confirmed' && (
                  <View style={styles.confirmedPill}>
                    <Ionicons name="shield-checkmark" size={12} color={colors.success} />
                    <Text style={styles.confirmedText}>{item.statusText}</Text>
                  </View>
                )}
              </View>
            </Card>
          ))
        )}
      </View>

      {/* Safe Local Purge Section */}
      <Card style={styles.purgeCard}>
        <View style={styles.purgeHeader}>
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.success} />
          <Text style={[typography.labelSm, styles.purgeTitle]}>
            QUY TRÌNH DỌN DẸP BẢN SAO AN TOÀN (SAFE LOCAL PURGE)
          </Text>
        </View>

        <Text style={[typography.bodyMd, styles.purgeDesc]}>
          Ứng dụng hỗ trợ tiếp tục tại điểm ngắt (Auto-resume chunked upload). Bản sao cục bộ trên thẻ SD và bộ nhớ trong chỉ được giải phóng sau khi máy chủ xác nhận nhận đủ bytes và khớp mã SHA-256 100%.
        </Text>

        <Pressable
          style={[styles.purgeBtn, purged && styles.purgeBtnDisabled]}
          onPress={handleSafePurge}
          disabled={purged}
          accessibilityRole="button"
        >
          <Ionicons name="trash-outline" size={16} color={purged ? colors.secondary : colors.error} />
          <Text style={[typography.labelSm, { color: purged ? colors.secondary : colors.error }]}>
            {purged ? 'Đã giải phóng an toàn 196.6 MB' : 'Dọn dẹp bản sao an toàn sau đối soát'}
          </Text>
        </Pressable>
      </Card>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  headerTitle: {
    color: colors.secondary,
  },
  tabToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  toggleBtnActive: {
    backgroundColor: colors.surfaceAlt,
  },
  toggleBtnText: {
    fontSize: 11,
    color: colors.secondary,
  },
  toggleBtnTextActive: {
    color: colors.neutral,
    fontWeight: 'bold',
  },
  summaryCard: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  summaryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  syncPulseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  summaryCount: {
    color: colors.neutral,
  },
  totalSize: {
    color: colors.secondary,
    fontFamily: 'Roboto',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    color: colors.secondary,
  },
  sectionSub: {
    color: colors.secondary,
  },
  itemsList: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
  },
  itemMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    marginRight: spacing.xs,
  },
  itemIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    color: colors.neutral,
    fontWeight: '500',
  },
  itemMeta: {
    color: colors.secondary,
    marginTop: 1,
  },
  itemHash: {
    color: colors.secondary,
    fontSize: 10,
    marginTop: 1,
  },
  statusBadge: {
    alignItems: 'flex-end',
  },
  uploadingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  uploadingText: {
    color: colors.info,
    fontSize: 10,
    fontWeight: 'bold',
  },
  queuedPill: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  queuedText: {
    color: colors.secondary,
    fontSize: 10,
    fontWeight: '600',
  },
  confirmedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  confirmedText: {
    color: colors.success,
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  purgeCard: {
    marginBottom: spacing.xl,
    gap: spacing.sm,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: colors.border,
  },
  purgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  purgeTitle: {
    color: colors.neutral,
    flex: 1,
  },
  purgeDesc: {
    color: colors.secondary,
    lineHeight: 20,
    fontSize: 12,
  },
  purgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.md,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    marginTop: spacing.xs,
  },
  purgeBtnDisabled: {
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
});

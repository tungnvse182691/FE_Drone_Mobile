import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { StatusBadge } from '../../src/components/StatusBadge';
import { Toast } from '../../src/components/Toast';
import { colors, spacing, typography } from '../../src/design-tokens';
import { SyncStatus } from '../../src/types/enums';

interface QueueItem {
  name: string;
  meta: string;
  status: SyncStatus;
}

export default function SyncScreen() {
  const [items, setItems] = useState<QueueItem[]>([
    { name: 'DJI_0042.MP4', meta: '3.2 GB', status: SyncStatus.QUEUED },
    { name: 'DJI_0041.MP4', meta: 'Đã đồng bộ 100%', status: SyncStatus.SERVER_CONFIRMED },
  ]);
  const [loading, setLoading] = useState(false);
  const [cleaned, setCleaned] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const allConfirmed = items.every((item) => item.status === SyncStatus.SERVER_CONFIRMED);

  const syncNow = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setItems((prev) =>
        prev.map((item) =>
          item.status === SyncStatus.QUEUED
            ? { ...item, status: SyncStatus.SERVER_CONFIRMED, meta: 'Đã đồng bộ 100%' }
            : item,
        ),
      );
      setToast('Đã đồng bộ dữ liệu khảo sát qua 4G/Wi-Fi.');
    }, 1500);
  };

  const cleanup = () => {
    setCleaned(true);
    setToast('Bản sao an toàn đã được dọn dẹp, chỉ giữ gốc trên Cloud.');
  };

  return (
    <SafeAreaScreen scroll header={<AppHeader subtitle="Đồng bộ" />}>
      <Text style={[typography.titleLg, styles.pageTitle]}>Đồng bộ dữ liệu</Text>

      <Text style={[typography.caption, styles.sectionLabel]}>HÀNG ĐỢI ĐỒNG BỘ</Text>
      {items.map((item) => (
        <Card key={item.name} style={styles.itemCard}>
          <View style={styles.itemTop}>
            <Text style={[typography.bodyLg, styles.itemName]}>{item.name}</Text>
            <StatusBadge status={item.status} />
          </View>
          <Text style={[typography.caption, styles.itemMeta]}>{item.meta}</Text>
        </Card>
      ))}

      <View style={styles.syncRow}>
        <Button variant="primary" title="Đồng bộ ngay" loading={loading} onPress={syncNow} />
      </View>

      <Text style={[typography.caption, styles.sectionLabel]}>DỌN DẸP BẢN SAO AN TOÀN</Text>
      <Card style={styles.card}>
        <Text style={[typography.bodyMd, styles.cleanupText]}>
          Chỉ mở khóa khi server đã đối soát SHA-256 thành công cho toàn bộ gói đang chờ.
        </Text>
        <View style={styles.cleanupRow}>
          <Button
            variant="secondary"
            title={cleaned ? 'Đã dọn dẹp' : 'Dọn dẹp bản sao an toàn'}
            disabled={!allConfirmed || cleaned}
            onPress={cleanup}
          />
        </View>
      </Card>

      {toast ? <Toast type="success" message={toast} /> : null}
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  pageTitle: {
    color: colors.neutral,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    color: colors.secondary,
    marginBottom: spacing.sm,
  },
  itemCard: {
    marginBottom: spacing.sm,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemName: {
    color: colors.neutral,
  },
  itemMeta: {
    color: colors.secondary,
    marginTop: spacing.xs,
  },
  syncRow: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  card: {
    marginBottom: spacing.md,
  },
  cleanupText: {
    color: colors.secondary,
  },
  cleanupRow: {
    marginTop: spacing.md,
  },
});
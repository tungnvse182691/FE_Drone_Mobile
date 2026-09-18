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

const FLIGHT_STATS = [
  { label: 'Thời gian bay thực tế', value: '24 phút' },
  { label: 'Vận tốc trung bình', value: '18 km/h' },
  { label: 'Ảnh trực giao', value: '420 ảnh' },
];

const CHECKSUM = '7f8a3c...e4b1';

export default function LogScreen() {
  const [status, setStatus] = useState<SyncStatus>(SyncStatus.LOCAL);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const sync = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStatus(SyncStatus.SERVER_CONFIRMED);
      setToast('Chuyến bay đã đồng bộ. Hệ thống AI đang phân tích khuyết tật.');
    }, 1500);
  };

  return (
    <SafeAreaScreen scroll header={<AppHeader subtitle="Nhật ký" />}>
      <Text style={[typography.titleLg, styles.pageTitle]}>Nhật ký chuyến bay</Text>

      <Card style={styles.card}>
        <Text style={[typography.titleMd, styles.flightId]}>#FL-20231024-01</Text>
        <Text style={[typography.caption, styles.routeName]}>
          Tuyến ĐT.741 - Cầu Sông Bé Km14+250
        </Text>
        <View style={styles.statsRow}>
          {FLIGHT_STATS.map((stat) => (
            <View key={stat.label} style={styles.statCol}>
              <Text style={[typography.bodyLg, styles.statValue]}>{stat.value}</Text>
              <Text style={[typography.caption, styles.statLabel]}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={[typography.caption, styles.sectionLabel]}>MÃ BĂM KIỂM TRA TOÀN VẸN</Text>
        <View style={styles.checksumRow}>
          <Text style={[typography.bodyMd, styles.checksum]}>{CHECKSUM}</Text>
          <StatusBadge status={status} />
        </View>
        <Text style={[typography.caption, styles.checksumHint]}>
          SHA-256 đối soát với server trước khi AI phân tích.
        </Text>
      </Card>

      <Button variant="primary" title="Đồng bộ dữ liệu lên Cloud" loading={loading} onPress={sync} />

      {toast ? <Toast type="success" message={toast} /> : null}
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  pageTitle: {
    color: colors.neutral,
    marginBottom: spacing.lg,
  },
  card: {
    marginBottom: spacing.md,
  },
  flightId: {
    color: colors.neutral,
  },
  routeName: {
    color: colors.secondary,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.md,
  },
  statCol: {
    flex: 1,
  },
  statValue: {
    color: colors.neutral,
  },
  statLabel: {
    color: colors.secondary,
    marginTop: 2,
  },
  sectionLabel: {
    color: colors.secondary,
    marginBottom: spacing.sm,
  },
  checksumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checksum: {
    color: colors.neutral,
  },
  checksumHint: {
    color: colors.secondary,
    marginTop: spacing.sm,
  },
});
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuthStore } from '../../src/store/auth';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { colors, spacing, typography } from '../../src/design-tokens';

const DEVICES = ['Flycam DJI Matrice 350 RTK', 'Trạm định vị D-RTK 2'];

const SAFETY_STATS = [
  { value: '128', label: 'giờ bay' },
  { value: '45', label: 'nhiệm vụ' },
  { value: '0', label: 'sự cố' },
];

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <SafeAreaScreen scroll>
      <Text style={[typography.titleLg, styles.pageTitle]}>Hồ sơ phi công</Text>

      <Card style={styles.card}>
        <Text style={[typography.titleMd, styles.name]}>{user?.full_name ?? 'Phi công Drone'}</Text>
        <Text style={[typography.bodyMd, styles.meta]}>
          Mã NV: {user?.employee_code ?? '---'} - Đội Khảo sát Số 1
        </Text>
      </Card>

      <Text style={[typography.caption, styles.sectionLabel]}>THIẾT BỊ ĐƯỢC GÁN</Text>
      {DEVICES.map((device) => (
        <Card key={device} style={styles.deviceCard}>
          <Text style={[typography.bodyMd, styles.deviceText]}>{device}</Text>
        </Card>
      ))}

      <Text style={[typography.caption, styles.sectionLabel]}>THỐNG KÊ AN TOÀN</Text>
      <Card style={styles.card}>
        <View style={styles.statsRow}>
          {SAFETY_STATS.map((stat) => (
            <View key={stat.label} style={styles.statCol}>
              <Text style={[typography.bodyLg, styles.statValue]}>{stat.value}</Text>
              <Text style={[typography.caption, styles.statLabel]}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Button variant="secondary" title="Đăng xuất" onPress={logout} />
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
  name: {
    color: colors.neutral,
  },
  meta: {
    color: colors.secondary,
    marginTop: spacing.xs,
  },
  sectionLabel: {
    color: colors.secondary,
    marginBottom: spacing.sm,
  },
  deviceCard: {
    marginBottom: spacing.sm,
  },
  deviceText: {
    color: colors.neutral,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: colors.primary,
  },
  statLabel: {
    color: colors.secondary,
    marginTop: 2,
  },
});
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

interface CompletedWorkOrder {
  id: string;
  woCode: string;
  road: string;
  completedDate: string;
  pmName: string;
}

const COMPLETED_ORDERS: CompletedWorkOrder[] = [
  {
    id: '1',
    woCode: '#WO-118',
    road: 'Tuyến ĐH.05 — Cầu Bà Lát (Km01+850)',
    completedDate: '26/10/2026',
    pmName: 'Nguyễn Thùy Lan',
  },
  {
    id: '2',
    woCode: '#WO-115',
    road: 'Tuyến ĐH.05 — Vĩnh Lộc B (Km02+180)',
    completedDate: '24/10/2026',
    pmName: 'Trần Văn Nam',
  },
  {
    id: '3',
    woCode: '#WO-112',
    road: 'Tuyến ĐH.05 — Tân Kiên (Km03+100)',
    completedDate: '21/10/2026',
    pmName: 'Lê Minh Tuấn',
  },
  {
    id: '4',
    woCode: '#WO-109',
    road: 'Tuyến ĐH.05 — Vĩnh Lộc B (Km01+450)',
    completedDate: '18/10/2026',
    pmName: 'Nguyễn Thùy Lan',
  },
  {
    id: '5',
    woCode: '#WO-104',
    road: 'Tuyến ĐH.05 — Vĩnh Lộc B (Km01+200)',
    completedDate: '14/10/2026',
    pmName: 'Nguyễn Thùy Lan',
  },
];

export default function SupervisorReportsScreen() {
  return (
    <SafeAreaScreen scroll header={<AppHeader subtitle="Báo cáo & Nghiệm thu" />}>
      {/* 3 Stat KPI Cards */}
      <View style={styles.kpiRow}>
        <Card style={styles.kpiCard}>
          <Text style={[typography.caption, styles.kpiLabel]}>Đã hoàn thành</Text>
          <View style={styles.kpiNumberRow}>
            <Text style={[typography.headlineLg, styles.kpiGold]}>18</Text>
            <Text style={[typography.caption, styles.kpiUnit]}>việc</Text>
          </View>
        </Card>

        <Card style={styles.kpiCard}>
          <Text style={[typography.caption, styles.kpiLabel]}>Tuyến triển khai</Text>
          <View style={styles.kpiNumberRow}>
            <Text style={[typography.headlineLg, styles.kpiNeutral]}>3</Text>
            <Text style={[typography.caption, styles.kpiUnit]}>tuyến</Text>
          </View>
        </Card>

        <Card style={styles.kpiCard}>
          <Text style={[typography.caption, styles.kpiLabel]}>Nghiệm thu</Text>
          <View style={styles.kpiNumberRow}>
            <Text style={[typography.headlineLg, styles.kpiSuccess]}>100%</Text>
          </View>
        </Card>
      </View>

      {/* Export Action Banner */}
      <Card style={styles.exportBannerCard}>
        <View style={styles.exportLeft}>
          <MaterialIcons name="description" size={24} color={colors.primary} />
          <View style={styles.exportTextGroup}>
            <Text style={[typography.titleMd, styles.exportTitle]}>Trích xuất hồ sơ kiểm định</Text>
            <Text style={[typography.caption, styles.exportSub]}>
              Xuất báo cáo PDF đóng dấu số hoặc gói ZIP bằng chứng
            </Text>
          </View>
        </View>

        <Button
          variant="primary"
          title="Xuất PDF / ZIP"
          onPress={() => router.push('/(sup)/export-modal')}
        />
      </Card>

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={[typography.labelSm, styles.sectionTitle]}>
          DANH SÁCH CÔNG VIỆC ĐÃ NGHIỆM THU
        </Text>
        <Text style={[typography.caption, styles.sectionMeta]}>Hiển thị 5 / 18 việc</Text>
      </View>

      {/* Work Orders List */}
      <View style={styles.listContainer}>
        {COMPLETED_ORDERS.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => {
              router.push({
                pathname: '/(sup)/signoff',
                params: { code: item.woCode, woCode: item.woCode },
              });
            }}
            accessibilityRole="button"
          >
            <Card style={styles.orderCard}>
              <View style={styles.orderLeft}>
                <View style={styles.checkCircle}>
                  <MaterialIcons name="check" size={16} color={colors.success} />
                </View>

                <View style={styles.orderInfo}>
                  <View style={styles.orderTitleRow}>
                    <Text style={[typography.titleMd, styles.roadText]}>{item.road}</Text>
                    <View style={styles.donePill}>
                      <Text style={styles.donePillText}>Đạt</Text>
                    </View>
                  </View>

                  <Text style={[typography.caption, styles.woSub]}>
                    {item.woCode} • Hoàn thành: {item.completedDate}
                  </Text>
                  <Text style={[typography.caption, styles.pmText]}>
                    Xác nhận bởi PM: <Text style={styles.boldText}>{item.pmName}</Text>
                  </Text>
                </View>
              </View>

              <MaterialIcons name="chevron-right" size={16} color={colors.secondary} />
            </Card>
          </Pressable>
        ))}
      </View>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  kpiRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  kpiCard: {
    flex: 1,
    padding: spacing.sm,
    gap: 2,
  },
  kpiLabel: {
    color: colors.secondary,
  },
  kpiNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 2,
  },
  kpiGold: {
    color: colors.primary,
  },
  kpiNeutral: {
    color: colors.neutral,
  },
  kpiSuccess: {
    color: colors.success,
  },
  kpiUnit: {
    color: colors.secondary,
  },
  exportBannerCard: {
    marginBottom: spacing.md,
    gap: spacing.sm,
    backgroundColor: '#FEF3E2',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  exportLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  exportTextGroup: {
    flex: 1,
  },
  exportTitle: {
    color: colors.neutral,
    fontWeight: 'bold',
  },
  exportSub: {
    color: colors.secondary,
    marginTop: 2,
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
  sectionMeta: {
    color: colors.secondary,
  },
  listContainer: {
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  orderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    padding: spacing.sm,
  },
  orderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    marginRight: spacing.xs,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: '#E9F7EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderInfo: {
    flex: 1,
  },
  orderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  roadText: {
    color: colors.neutral,
    fontSize: 13,
    flex: 1,
  },
  donePill: {
    backgroundColor: '#E9F7EC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  donePillText: {
    color: colors.success,
    fontSize: 9,
    fontWeight: 'bold',
  },
  woSub: {
    color: colors.secondary,
    marginTop: 1,
  },
  pmText: {
    color: colors.secondary,
    marginTop: 1,
    fontSize: 11,
  },
  boldText: {
    fontWeight: 'bold',
    color: colors.neutral,
  },
});

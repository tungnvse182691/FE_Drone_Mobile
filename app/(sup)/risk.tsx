import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Card } from '../../src/components/Card';
import { Chip } from '../../src/components/Chip';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

interface ProjectRiskItem {
  id: string;
  code: string;
  name: string;
  sub: string;
  riskLevel: 'severity-high' | 'severity-medium' | 'severity-low';
  riskLabel: string;
  openDefects: number;
  repairingDefects: number;
}

const PROJECT_RISKS: ProjectRiskItem[] = [
  {
    id: '1',
    code: '#DF-0231',
    name: 'Tuyến ĐH.05 — Cầu Bà Lát (Km01+850)',
    sub: 'Cầu dây văng qua sông • Nguy cơ ổ gà sâu lan trên mặt cầu',
    riskLevel: 'severity-high',
    riskLabel: 'CAO',
    openDefects: 4,
    repairingDefects: 2,
  },
  {
    id: '2',
    code: '#DF-0220',
    name: 'Tuyến ĐH.05 — Tân Kiên (Km03+100)',
    sub: 'Đoạn giao cắt đường huyện, lưu lượng lớn',
    riskLevel: 'severity-high',
    riskLabel: 'CAO',
    openDefects: 3,
    repairingDefects: 1,
  },
  {
    id: '3',
    code: '#DF-0229',
    name: 'Tuyến ĐH.05 — Vĩnh Lộc B (Km02+180)',
    sub: 'Đoạn gần mố cầu bờ Nam • Nguy cơ vỡ mép tấm',
    riskLevel: 'severity-medium',
    riskLabel: 'VỪA',
    openDefects: 2,
    repairingDefects: 3,
  },
  {
    id: '4',
    code: '#DF-0219',
    name: 'Tuyến ĐH.05 — Vĩnh Lộc B (Km01+200)',
    sub: 'Đoạn ngoài đồng nông nghiệp, vai đường yếu',
    riskLevel: 'severity-high',
    riskLabel: 'CAO',
    openDefects: 2,
    repairingDefects: 1,
  },
  {
    id: '5',
    code: '#DF-0215',
    name: 'Tuyến ĐH.05 — Vĩnh Lộc B (Km01+450)',
    sub: 'Đoạn nằm trong vùng ngập cục bộ',
    riskLevel: 'severity-low',
    riskLabel: 'THẤP',
    openDefects: 1,
    repairingDefects: 2,
  },
  {
    id: '6',
    code: '#DF-0210',
    name: 'Tuyến ĐH.05 — Tân Kiên (Km03+100)',
    sub: 'Đoạn dân cư ven đường • Nguy cơ xói lở vai đường',
    riskLevel: 'severity-low',
    riskLabel: 'THẤP',
    openDefects: 0,
    repairingDefects: 1,
  },
];

export default function SupervisorRiskScreen() {
  return (
    <SafeAreaScreen scroll>
      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <Pressable
          style={styles.circleIconButton}
          onPress={() => router.push('/(sup)/home')}
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={20} color={colors.secondary} />
        </Pressable>

        <View style={styles.topBarCenter}>
          <Text style={[typography.titleMd, styles.topBarTitle]}>
            Tổng quan rủi ro dự án
          </Text>
          <Text style={[typography.caption, styles.topBarSub]}>
            Hệ thống Giám sát kỹ thuật Hoàng Hải
          </Text>
        </View>

        <View style={styles.circleIconButton}>
          <Ionicons name="map-outline" size={18} color={colors.secondary} />
        </View>
      </View>

      {/* Summary KPI Card */}
      <Card style={styles.summaryCard}>
        <View style={styles.summaryLeft}>
          <Text style={[typography.caption, styles.summaryLabel]}>Tổng số dự án theo dõi</Text>
          <Text style={[typography.headlineLg, styles.summaryCount]}>6 tuyến đường</Text>
        </View>

        <View style={styles.badgeGroup}>
          <View style={[styles.miniBadge, { backgroundColor: '#FDECEC' }]}>
            <Text style={[styles.miniBadgeText, { color: colors.error }]}>2 Cao</Text>
          </View>
          <View style={[styles.miniBadge, { backgroundColor: '#FEF3E2' }]}>
            <Text style={[styles.miniBadgeText, { color: colors.warning }]}>2 Vừa</Text>
          </View>
          <View style={[styles.miniBadge, { backgroundColor: '#E9F7EC' }]}>
            <Text style={[styles.miniBadgeText, { color: colors.success }]}>2 Thấp</Text>
          </View>
        </View>
      </Card>

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={[typography.labelSm, styles.sectionTitle]}>DANH SÁCH DỰ ÁN BẢO HÀNH</Text>
        <Text style={[typography.caption, styles.sortLabel]}>Sắp xếp theo rủi ro</Text>
      </View>

      {/* Project Cards List */}
      <View style={styles.listContainer}>
        {PROJECT_RISKS.map((project) => (
          <Pressable
            key={project.id}
            onPress={() =>
              router.push({
                pathname: '/(sup)/approve',
                params: { code: project.code },
              })
            }
            accessibilityRole="button"
          >
            <Card style={styles.projectCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleWrap}>
                  <Text style={[typography.titleMd, styles.projectName]}>{project.name}</Text>
                  <Text style={[typography.caption, styles.projectSub]}>{project.sub}</Text>
                </View>
                <Chip variant={project.riskLevel} label={project.riskLabel} />
              </View>

              <View style={styles.cardFooter}>
                <Text style={[typography.caption, styles.defectStats]}>
                  Lỗi mở: <Text style={styles.boldText}>{project.openDefects}</Text> • Đang sửa:{' '}
                  <Text style={styles.boldText}>{project.repairingDefects}</Text>
                </Text>

                <View style={styles.linkGroup}>
                  <Text style={[typography.labelSm, styles.linkText]}>Chi tiết</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.brandGold} />
                </View>
              </View>
            </Card>
          </Pressable>
        ))}
      </View>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  circleIconButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarCenter: {
    alignItems: 'center',
  },
  topBarTitle: {
    color: colors.neutral,
    fontWeight: 'bold',
  },
  topBarSub: {
    color: colors.secondary,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryLeft: {
    gap: 2,
  },
  summaryLabel: {
    color: colors.secondary,
  },
  summaryCount: {
    color: colors.neutral,
  },
  badgeGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  miniBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  miniBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
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
  sortLabel: {
    color: colors.secondary,
  },
  listContainer: {
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  projectCard: {
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  cardTitleWrap: {
    flex: 1,
  },
  projectName: {
    color: colors.neutral,
  },
  projectSub: {
    color: colors.secondary,
    marginTop: 2,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  defectStats: {
    color: colors.secondary,
  },
  boldText: {
    fontWeight: 'bold',
    color: colors.neutral,
  },
  linkGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  linkText: {
    color: colors.brandGold,
    fontWeight: 'bold',
  },
});

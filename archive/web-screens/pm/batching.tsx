import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

interface DefectItem {
  id: string;
  title: string;
  method: string;
  dueDays: number;
  area: number;
  detail: string;
}

const DEFECTS: DefectItem[] = [
  {
    id: '#DF-0231',
    title: 'Lún nứt Tuyến ĐH.05 Km02+150',
    method: 'Đắp bù BTXM M300 đá 1x2',
    dueDays: 3,
    area: 14.5,
    detail: 'Sâu ~6.8cm • Diện tích: 14.5 m² • Đắp bù BTXM M300 đá 1x2',
  },
  {
    id: '#DF-0248',
    title: 'Bể mép tấm bê tông Tuyến ĐH.01',
    method: 'Đục tẩy 5cm & đổ bù BTXM',
    dueDays: 5,
    area: 18.0,
    detail: 'Dài 18m • Diện tích: 18.0 m² • Đục tẩy 5cm & đổ bù BTXM',
  },
  {
    id: '#DF-0256',
    title: 'Tấm đan rãnh vỡ Tuyến ĐX.12',
    method: 'Thay thế 6 tấm đan bê tông đúc sẵn 50x100cm',
    dueDays: 10,
    area: 6.0,
    detail: 'Thay thế 6 tấm đan bê tông đúc sẵn 50x100cm',
  },
];

const DEFAULT_SELECTED = ['#DF-0231', '#DF-0248'];

const dueLabel = (days: number) => `Trong ${days} ngày`;

export default function PmBatchingScreen() {
  const [selected, setSelected] = useState<string[]>(DEFAULT_SELECTED);

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const chosen = DEFECTS.filter((d) => selected.includes(d.id));
  const totalArea = chosen.reduce((sum, item) => sum + item.area, 0);
  const minDueDays = chosen.length > 0 ? Math.min(...chosen.map((item) => item.dueDays)) : 0;
  const maxDueDays = chosen.length > 0 ? Math.max(...chosen.map((item) => item.dueDays)) : 0;
  const dueRange =
    chosen.length === 0
      ? '—'
      : minDueDays === maxDueDays
        ? dueLabel(minDueDays)
        : `${dueLabel(minDueDays)} – ${dueLabel(maxDueDays)}`;

  const handleSubmit = () => {
    router.push('/(pm)/submit-approval');
  };

  return (
    <SafeAreaScreen scroll header={<AppHeader subtitle="Gộp Đợt Sửa Chữa" />}>
      <View style={styles.titleRow}>
        <Text style={[typography.titleLg, styles.heading]}>Lập kế hoạch thi công đợt</Text>
        <View style={styles.routeBadge}>
          <Text style={[typography.labelSm, styles.routeBadgeText]}>Tuyến ĐH.05 (Km01 - Km03)</Text>
        </View>
      </View>
      <Text style={[typography.caption, styles.headingMeta]}>
        Tích chọn các hư hỏng lân cận để thi công cùng một đợt, tối ưu máy lu và nhân công
        trước khi trình Giám sát phê duyệt:
      </Text>

      {DEFECTS.map((defect) => {
        const checked = selected.includes(defect.id);
        return (
          <Pressable
            key={defect.id}
            onPress={() => toggle(defect.id)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            style={({ pressed }) => [
              styles.item,
              checked && styles.itemChecked,
              pressed && styles.itemPressed,
            ]}
          >
            <Ionicons
              name={checked ? 'checkbox' : 'square-outline'}
              size={22}
              color={checked ? colors.primary : colors.border}
              style={styles.checkbox}
            />
            <View style={styles.itemBody}>
              <View style={styles.itemTopRow}>
                <Text style={[typography.labelLg, styles.itemId, !checked && styles.itemIdOff]}>
                  {defect.id} • {defect.title}
                </Text>
                <Text style={[typography.labelLg, styles.itemDue, !checked && styles.itemDueOff]}>
                  {dueLabel(defect.dueDays)}
                </Text>
              </View>
              <Text style={[typography.caption, styles.itemMethod]}>
                Phương án: {defect.method}
              </Text>
              <Text style={[typography.caption, styles.itemDetail]}>
                Khối lượng: {defect.detail}
              </Text>
            </View>
          </Pressable>
        );
      })}

      <Card style={styles.summaryCard}>
        <View style={styles.summaryTitleRow}>
          <Text style={[typography.titleMd, styles.summaryTitle]}>Hồ sơ đợt sửa chuẩn bị trình duyệt:</Text>
          <Text style={[typography.labelLg, styles.summaryId]}>#REQ-045</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={[typography.caption, styles.summaryLabel]}>Số lượng hư hỏng gộp đợt:</Text>
          <Text style={[typography.caption, styles.summaryValue]}>{selected.length} hư hỏng</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[typography.caption, styles.summaryLabel]}>Tổng khối lượng thi công:</Text>
          <Text style={[typography.caption, styles.summaryValue]}>{totalArea.toFixed(1)} m²</Text>
        </View>
        <View style={[styles.summaryRow, styles.summaryTotalRow]}>
          <Text style={[typography.labelLg, styles.summaryTotalLabel]}>Hạn hoàn thành đợt sửa:</Text>
          <Text style={[typography.titleMd, styles.summaryTotalValue]}>{dueRange}</Text>
        </View>
      </Card>

      <View style={styles.ctaWrap}>
        <Button
          variant="primary"
          disabled={selected.length === 0}
          title={`Soạn hồ sơ trình Giám sát phê duyệt (#REQ-045) →`}
          onPress={handleSubmit}
        />
        <Text style={[typography.caption, styles.ctaNote]}>
          Quy tắc nghiệp vụ: Đợt sửa phải được Ban Giám sát phê duyệt hồ sơ kỹ thuật trước khi PM
          phân công Repair Crew thi công.
        </Text>
      </View>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  heading: {
    color: colors.neutral,
    flex: 1,
  },
  routeBadge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  routeBadgeText: {
    color: colors.primaryDark,
  },
  headingMeta: {
    color: colors.secondary,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  itemChecked: {
    borderColor: colors.primary,
    borderWidth: 2,
    padding: spacing.md - 1,
  },
  itemPressed: {
    opacity: 0.7,
  },
  checkbox: {
    marginTop: 2,
  },
  itemBody: {
    flex: 1,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  itemId: {
    color: colors.primary,
    flex: 1,
  },
  itemIdOff: {
    color: colors.secondary,
  },
  itemDue: {
    color: colors.neutral,
  },
  itemDueOff: {
    color: colors.secondary,
  },
  itemMethod: {
    color: colors.neutral,
    lineHeight: 16,
  },
  itemDetail: {
    color: colors.secondary,
    lineHeight: 16,
  },
  summaryCard: {
    marginBottom: spacing.lg,
  },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  summaryTitle: {
    color: colors.neutral,
    flex: 1,
  },
  summaryId: {
    color: colors.brandGold,
    fontFamily: 'monospace',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  summaryLabel: {
    color: colors.secondary,
  },
  summaryValue: {
    color: colors.neutral,
  },
  summaryTotalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  summaryTotalLabel: {
    color: colors.neutral,
  },
  summaryTotalValue: {
    color: colors.primary,
  },
  ctaWrap: {
    marginBottom: spacing.sm,
  },
  ctaNote: {
    color: colors.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 15,
  },
});
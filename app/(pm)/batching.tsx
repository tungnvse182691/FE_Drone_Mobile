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
  cost: number;
  area: number;
  detail: string;
}

const DEFECTS: DefectItem[] = [
  {
    id: '#DF-0231',
    title: 'Lún nứt Km1842+150',
    cost: 42500000,
    area: 14.5,
    detail: 'Sâu ~6.8cm • Diện tích: 14.5 m² • Cào bóc & vá thảm BTN C12.5',
  },
  {
    id: '#DF-0248',
    title: 'Nứt lưới mai rùa Vành Đai 3',
    cost: 32400000,
    area: 18.0,
    detail: 'Dài 18m • Diện tích: 18.0 m² • Cào bóc 5cm & thảm lại',
  },
  {
    id: '#DF-0256',
    title: 'Tấm đan rãnh vỡ TL769',
    cost: 15200000,
    area: 6.0,
    detail: 'Thay thế 6 tấm đan bê tông đúc sẵn 50x100cm',
  },
];

const DEFAULT_SELECTED = ['#DF-0231', '#DF-0248'];

const formatCost = (value: number) => value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export default function PmBatchingScreen() {
  const [selected, setSelected] = useState<string[]>(DEFAULT_SELECTED);

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const chosen = DEFECTS.filter((d) => selected.includes(d.id));
  const totalCost = chosen.reduce((sum, item) => sum + item.cost, 0);
  const totalArea = chosen.reduce((sum, item) => sum + item.area, 0);

  const handleSubmit = () => {
    router.push('/(pm)/submit-approval');
  };

  return (
    <SafeAreaScreen scroll header={<AppHeader subtitle="Gộp Đợt Sửa Chữa" />}>
      <View style={styles.titleRow}>
        <Text style={[typography.titleLg, styles.heading]}>Lập kế hoạch thi công đợt</Text>
        <View style={styles.routeBadge}>
          <Text style={[typography.labelSm, styles.routeBadgeText]}>QL1A Km1842 - Km1845</Text>
        </View>
      </View>
      <Text style={[typography.caption, styles.headingMeta]}>
        Tích chọn các hư hỏng lân cận để thi công cùng một đợt, tối ưu dự toán máy lu và nhân công
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
                <Text style={[typography.labelLg, styles.itemCost, !checked && styles.itemCostOff]}>
                  {formatCost(defect.cost)} đ
                </Text>
              </View>
              <Text style={[typography.caption, styles.itemDetail]}>{defect.detail}</Text>
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
          <Text style={[typography.caption, styles.summaryLabel]}>Tổng diện tích thi công:</Text>
          <Text style={[typography.caption, styles.summaryValue]}>{totalArea.toFixed(1)} m²</Text>
        </View>
        <View style={[styles.summaryRow, styles.summaryTotalRow]}>
          <Text style={[typography.labelLg, styles.summaryTotalLabel]}>Tổng dự toán kinh phí đợt:</Text>
          <Text style={[typography.titleMd, styles.summaryTotalCost]}>{formatCost(totalCost)} VNĐ</Text>
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
          Quy tắc nghiệp vụ: Đợt sửa phải được Ban Giám sát phê duyệt ngân sách trước khi PM phân
          công Repair Crew thi công.
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
  itemCost: {
    color: colors.neutral,
  },
  itemCostOff: {
    color: colors.secondary,
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
  summaryTotalCost: {
    color: colors.primary,
    fontFamily: 'monospace',
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
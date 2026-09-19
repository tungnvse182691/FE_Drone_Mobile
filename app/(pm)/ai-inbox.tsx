import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { Chip } from '../../src/components/Chip';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

type InboxTab = 'new' | 'waiting' | 'approved';

interface TabDef {
  key: InboxTab;
  label: string;
  count: number;
}

const TABS: TabDef[] = [
  { key: 'new', label: 'Lỗi mới', count: 12 },
  { key: 'waiting', label: 'Hàng Chờ', count: 12 },
  { key: 'approved', label: 'Đã duyệt', count: 4 },
];

type DefectChip = 'severity-high' | 'severity-medium' | 'severity-low' | 'status-pending' | 'approved';

interface DefectItem {
  id: string;
  route: string;
  title: string;
  detail: string;
  chip: DefectChip;
  chipLabel: string;
}

const DEFECTS: Record<InboxTab, DefectItem[]> = {
  new: [
    {
      id: '#DF-0231',
      route: 'QL.1A Km1842+150',
      title: 'Ổ gà sâu mặt đường nhựa',
      detail: 'Sâu ~6.8cm',
      chip: 'severity-high',
      chipLabel: 'RỦI RO CAO',
    },
    {
      id: '#DF-0228',
      route: 'Tuyến ĐT.741 Km14+200',
      title: 'Rạn nứt mai rùa diện rộng',
      detail: 'Khoảng 14.5 m²',
      chip: 'severity-medium',
      chipLabel: 'RỦI RO TRUNG BÌNH',
    },
    {
      id: '#DF-0219',
      route: 'QL.51 Km22+400',
      title: 'Hư hỏng khe co giãn dầm cầu',
      detail: 'Chờ phân loại nguyên nhân',
      chip: 'severity-medium',
      chipLabel: 'RỦI RO TRUNG BÌNH',
    },
  ],
  waiting: [
    {
      id: '#DF-0230',
      route: 'QL.1A Km1841+900',
      title: 'Nứt dọc thảm nhựa',
      detail: 'Chờ phi công xác nhận ảnh gốc',
      chip: 'status-pending',
      chipLabel: 'CHỜ DUYỆT',
    },
    {
      id: '#DF-0226',
      route: 'Tuyến ĐT.741 Km13+400',
      title: 'Hằn lún vệt bánh xe',
      detail: 'Chờ dữ liệu so sánh đa kỳ',
      chip: 'status-pending',
      chipLabel: 'CHỜ DUYỆT',
    },
    {
      id: '#DF-0224',
      route: 'QL.51 Km21+800',
      title: 'Vỡ mép bê tông vai đường',
      detail: 'Chờ số đo thực địa',
      chip: 'status-pending',
      chipLabel: 'CHỜ DUYỆT',
    },
  ],
  approved: [
    {
      id: '#DF-0211',
      route: 'QL.1A Km1840+600',
      title: 'Ổ gà mặt đường nhựa',
      detail: 'Đã duyệt - Nhập đợt sửa chữa',
      chip: 'approved',
      chipLabel: 'ĐÃ DUYỆT',
    },
    {
      id: '#DF-0208',
      route: 'Tuyến ĐT.741 Km12+100',
      title: 'Lún cục bộ nền đường',
      detail: 'Đã duyệt - Nhập đợt sửa chữa',
      chip: 'approved',
      chipLabel: 'ĐÃ DUYỆT',
    },
    {
      id: '#DF-0203',
      route: 'QL.51 Km20+500',
      title: 'Nứt thảm mặt đường',
      detail: 'Đã duyệt - Nhập đợt sửa chữa',
      chip: 'approved',
      chipLabel: 'ĐÃ DUYỆT',
    },
  ],
};

export default function PmAiInboxScreen() {
  const [tab, setTab] = useState<InboxTab>('new');
  const defects = DEFECTS[tab];

  return (
    <SafeAreaScreen scroll header={<AppHeader subtitle="Hộp Thư AI" />}>
      <Text style={[typography.titleLg, styles.heading]}>Kết quả phát hiện từ AI</Text>
      <Text style={[typography.caption, styles.headingMeta]}>
        Duyệt lỗi do AI nhận diện từ ảnh flycam trước khi lập đợt sửa chữa.
      </Text>

      <View style={styles.tabRow}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                styles.tab,
                active && styles.tabActive,
                pressed && styles.tabPressed,
              ]}
            >
              <Text style={[typography.labelLg, styles.tabCount, active && styles.tabCountActive]}>
                {t.count}
              </Text>
              <Text style={[typography.labelLg, styles.tabLabel, active && styles.tabLabelActive]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {defects.map((defect) => (
        <View key={defect.id} style={styles.itemWrap}>
          <Pressable
            onPress={() => router.push('/(pm)/verify-a')}
            accessibilityRole="button"
            style={({ pressed }) => pressed && styles.itemPressed}
          >
            <Card style={styles.itemCard}>
              <View style={styles.itemTopRow}>
                <Chip variant={defect.chip} label={defect.chipLabel} />
                <Text style={[typography.labelSm, styles.itemId]}>{defect.id}</Text>
              </View>
              <Text style={[typography.titleMd, styles.itemTitle]}>{defect.title}</Text>
              <View style={styles.itemMetaRow}>
                <Ionicons name="location-outline" size={14} color={colors.secondary} />
                <Text style={[typography.caption, styles.itemMeta]}>{defect.route}</Text>
              </View>
              <Text style={[typography.bodyMd, styles.itemDetail]}>
                {defect.detail} • Độ tin cậy AI 94.2%
              </Text>
            </Card>
          </Pressable>
          {defect.chip === 'severity-high' ? (
            <Pressable
              onPress={() => router.push('/(pm)/verify-b')}
              accessibilityRole="button"
              style={styles.multiPeriodLink}
            >
              <Text style={[typography.labelSm, styles.multiPeriodText]}>
                So sánh đa kỳ (Baseline) &gt;
              </Text>
            </Pressable>
          ) : null}
        </View>
      ))}
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  heading: {
    color: colors.neutral,
  },
  headingMeta: {
    color: colors.secondary,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  tabRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabPressed: {
    opacity: 0.7,
  },
  tabCount: {
    color: colors.primary,
  },
  tabCountActive: {
    color: colors.onPrimary,
  },
  tabLabel: {
    color: colors.secondary,
    marginTop: spacing.xs,
  },
  tabLabelActive: {
    color: colors.onPrimary,
  },
  itemWrap: {
    marginBottom: spacing.md,
  },
  itemPressed: {
    opacity: 0.7,
  },
  itemCard: {
    marginBottom: 0,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  itemId: {
    color: colors.secondary,
  },
  itemTitle: {
    color: colors.neutral,
    marginBottom: spacing.xs,
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  itemMeta: {
    color: colors.secondary,
  },
  itemDetail: {
    color: colors.onSurface,
  },
  multiPeriodLink: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    marginLeft: spacing.sm,
  },
  multiPeriodText: {
    color: colors.primaryDark,
  },
});
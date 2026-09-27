import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Chip } from '../../src/components/Chip';
import { Toast } from '../../src/components/Toast';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

type PeriodKey = 'baseline' | 't04' | 'now';

interface PeriodDef {
  key: PeriodKey;
  label: string;
  date: string;
  depth: string;
  area: string;
  chip: 'severity-low' | 'severity-medium' | 'severity-high';
  chipLabel: string;
}

const PERIODS: PeriodDef[] = [
  {
    key: 'baseline',
    label: 'Baseline bàn giao',
    date: '12/2022',
    depth: 'Sâu 3.2cm',
    area: '9.6 m²',
    chip: 'severity-low',
    chipLabel: 'RỦI RO THẤP',
  },
  {
    key: 't04',
    label: '6 tháng trước',
    date: 'T04/2023',
    depth: 'Sâu 5.0cm',
    area: '11.5 m²',
    chip: 'severity-medium',
    chipLabel: 'RỦI RO TRUNG BÌNH',
  },
  {
    key: 'now',
    label: 'Hiện tại',
    date: 'T10/2023',
    depth: 'Sâu 6.8cm',
    area: '14.5 m²',
    chip: 'severity-high',
    chipLabel: 'RỦI RO CAO',
  },
];

type ToastMessage = {
  type: 'success' | 'warning';
  message: string;
};

export default function PmVerifyBScreen() {
  const [period, setPeriod] = useState<PeriodKey>('now');
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const active = PERIODS.find((p) => p.key === period) ?? PERIODS[2];

  const handleFalsePositive = () => {
    Alert.alert('Báo AI sai (False Positive)', 'Xác nhận đây là phát hiện AI sai? Lỗi sẽ được đưa ra khỏi danh sách chờ duyệt.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xác nhận báo sai',
        style: 'destructive',
        onPress: () => {
          setToast({ type: 'warning', message: '⚠️ Đã ghi nhận lỗi AI sai. Chuyển về luồng huấn luyện lại mô hình.' });
          setTimeout(() => router.push('/(pm)/ai-inbox'), 1200);
        },
      },
    ]);
  };

  const handleConfirm = () => {
    setToast({ type: 'success', message: '✅ Đã xác minh lỗi #DF-0231. Có thể nhập đợt sửa chữa.' });
    setTimeout(() => router.push('/(pm)/ai-inbox'), 1200);
  };

  return (
    <View style={styles.screen}>
      <SafeAreaScreen
        scroll
        header={<AppHeader subtitle="Hộp Thư AI" showBack fallbackRoute="/(pm)/ai-inbox" />}
      >
        <View style={styles.titleRow}>
          <View style={styles.titleBlock}>
            <Text style={[typography.titleLg, styles.defectId]}>#DF-0231</Text>
            <Text style={[typography.caption, styles.defectMeta]}>Tuyến ĐH.05 Km02+150 • Ổ gà sâu vỡ tấm bê tông xi măng</Text>
          </View>
          <Chip variant="severity-high" label="RỦI RO CAO" />
        </View>

        <Card style={styles.sliderCard}>
          <Text style={[typography.titleMd, styles.cardTitle]}>So sánh tiến triển đa thời điểm</Text>
          <Text style={[typography.caption, styles.cardHint]}>
            Đối chiếu với hồ sơ gốc Baseline để đánh giá tốc độ hư hỏng.
          </Text>
          <View style={styles.periodRow}>
            {PERIODS.map((p) => {
              const activePeriod = period === p.key;
              return (
                <Pressable
                  key={p.key}
                  onPress={() => setPeriod(p.key)}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.periodChip,
                    activePeriod && styles.periodChipActive,
                    pressed && styles.periodChipPressed,
                  ]}
                >
                  <Text style={[typography.labelSm, styles.periodLabel, activePeriod && styles.periodLabelActive]}>
                    {p.label}
                  </Text>
                  <Text style={[typography.caption, styles.periodDate, activePeriod && styles.periodDateActive]}>
                    {p.date}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.imageBox}>
            <Ionicons name="camera" size={28} color={colors.secondary} />
            <Text style={[typography.caption, styles.imageHint]}>
              Ảnh flycam kỳ {active.label} ({active.date})
            </Text>
          </View>

          <View style={styles.metricRow}>
            <View style={styles.metricBox}>
              <Text style={[typography.labelSm, styles.metricLabel]}>Độ sâu</Text>
              <Text style={[typography.bodyMd, styles.metricValue]}>{active.depth}</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={[typography.labelSm, styles.metricLabel]}>Diện tích</Text>
              <Text style={[typography.bodyMd, styles.metricValue]}>{active.area}</Text>
            </View>
            <View style={styles.metricBox}>
              <Chip variant={active.chip} label={active.chipLabel} />
            </View>
          </View>
        </Card>

        <Card style={styles.growthCard}>
          <Text style={[typography.titleMd, styles.cardTitle]}>Tốc độ lan rộng hư hỏng</Text>
          <View style={styles.growthRow}>
            <View style={styles.growthIcon}>
              <Ionicons name="trending-up" size={18} color={colors.error} />
            </View>
            <Text style={[typography.bodyLg, styles.growthText]}>+2.4 mm/tháng</Text>
          </View>
          <View style={styles.growthRow}>
            <View style={styles.growthIcon}>
              <Ionicons name="resize-outline" size={18} color={colors.error} />
            </View>
            <Text style={[typography.bodyLg, styles.growthText]}>+35% diện tích so với Baseline</Text>
          </View>
          <Text style={[typography.caption, styles.growthHint]}>
            Ước tính vết nứt mở rộng và diện tích sụt lún tăng nhanh theo mùa mưa.
          </Text>
        </Card>

        <View style={styles.warningBanner}>
          <Ionicons name="warning" size={18} color={colors.error} />
          <Text style={[typography.bodyMd, styles.warningText]}>
            Rủi ro cao: cần đục bỏ mảng bê tông vỡ, xử lý nền móng tấm trước khi đổ lại BTXM.
          </Text>
        </View>

        <View style={styles.buttonGroup}>
          <View style={styles.buttonWrap}>
            <Button variant="secondary" title="Báo AI sai (False Positive)" onPress={handleFalsePositive} />
          </View>
          <Button variant="primary" title="Xác nhận lỗi AI" onPress={handleConfirm} />
        </View>
      </SafeAreaScreen>

      {toast ? <Toast type={toast.type} message={toast.message} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  titleBlock: {
    flex: 1,
    marginRight: spacing.sm,
  },
  defectId: {
    color: colors.neutral,
  },
  defectMeta: {
    color: colors.secondary,
    marginTop: spacing.xs,
  },
  sliderCard: {
    marginBottom: spacing.md,
  },
  cardTitle: {
    color: colors.neutral,
    marginBottom: spacing.xs,
  },
  cardHint: {
    color: colors.secondary,
    marginBottom: spacing.md,
  },
  periodRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  periodChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  periodChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  periodChipPressed: {
    opacity: 0.7,
  },
  periodLabel: {
    color: colors.onSurface,
  },
  periodLabelActive: {
    color: colors.onPrimary,
  },
  periodDate: {
    color: colors.secondary,
    marginTop: 2,
  },
  periodDateActive: {
    color: colors.onPrimary,
  },
  imageBox: {
    height: 140,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  imageHint: {
    color: colors.secondary,
  },
  metricRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  metricBox: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  metricLabel: {
    color: colors.secondary,
    marginBottom: spacing.xs,
  },
  metricValue: {
    color: colors.neutral,
  },
  growthCard: {
    marginBottom: spacing.md,
  },
  growthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  growthIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDECEC',
  },
  growthText: {
    color: colors.error,
  },
  growthHint: {
    color: colors.secondary,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FDECEC',
    borderWidth: 1,
    borderColor: '#F5B5B7',
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  warningText: {
    color: colors.error,
    flex: 1,
  },
  buttonGroup: {
    marginBottom: spacing.md,
  },
  buttonWrap: {
    marginBottom: spacing.sm,
  },
});
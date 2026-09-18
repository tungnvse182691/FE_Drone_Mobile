import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Toast } from '../../src/components/Toast';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

const DEFECT_TYPES = [
  'Ổ gà',
  'Nứt lưới',
  'Lún vệt',
  'Xói lở taluy',
];

const SEVERITY_OPTIONS = [
  { label: 'Khẩn cấp', color: colors.error, bg: '#FDECEC', border: colors.error },
  { label: 'Trung bình', color: colors.secondary, bg: colors.surface, border: colors.border },
  { label: 'Theo dõi', color: colors.secondary, bg: colors.surface, border: colors.border },
];

export default function CrewReportDefectScreen() {
  const [defectType, setDefectType] = useState<string>(DEFECT_TYPES[0]);
  const [severity, setSeverity] = useState<string>('Khẩn cấp');
  const [notes, setNotes] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const handleSubmit = () => {
    setToast('Đã gửi báo cáo lỗi phát sinh cho Quản lý dự án Tuấn');
    setTimeout(() => router.back(), 1500);
  };

  return (
    <SafeAreaScreen
      scroll
      header={
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Pressable onPress={() => router.back()} accessibilityRole="button" style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
              <Ionicons name="arrow-back" size={20} color={colors.neutral} />
            </Pressable>
            <Text style={[typography.titleMd, styles.topBarTitle]}>Báo lỗi phát sinh mới</Text>
          </View>
          <View style={styles.badgeNew}>
            <Text style={[typography.labelSm, styles.badgeNewText]}>Phát sinh</Text>
          </View>
        </View>
      }
    >
      <Card style={styles.banner}>
        <View style={styles.bannerRow}>
          <Ionicons name="warning-outline" size={16} color={colors.warning} />
          <Text style={[typography.bodyMd, styles.bannerText]}>
            Lỗi này sẽ được gửi về PM xác minh, không gộp vào #WO-118
          </Text>
        </View>
      </Card>

      <View style={styles.fieldGroup}>
        <Text style={[typography.labelLg, styles.fieldLabel]}>Tọa độ GPS phát hiện tự động</Text>
        <View style={styles.gpsField}>
          <Ionicons name="location-outline" size={16} color={colors.secondary} />
          <Text style={[typography.bodyMd, styles.gpsText]}>Km1842+320 QL1A</Text>
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[typography.labelLg, styles.fieldLabel]}>Phân loại lỗi</Text>
        <View style={styles.chipRow}>
          {DEFECT_TYPES.map((type) => {
            const active = type === defectType;
            return (
              <Pressable
                key={type}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setDefectType(type)}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
              >
                <Text style={[typography.labelSm, active ? styles.chipTextActive : styles.chipText]}>{type}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[typography.labelLg, styles.fieldLabel]}>Mức độ khẩn cấp</Text>
        <View style={styles.severityRow}>
          {SEVERITY_OPTIONS.map((opt) => {
            const active = opt.label === severity;
            return (
              <Pressable
                key={opt.label}
                style={[
                  styles.severityChip,
                  { backgroundColor: active ? opt.bg : colors.surface, borderColor: active ? opt.border : colors.border },
                ]}
                onPress={() => setSeverity(opt.label)}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
              >
                <Text style={[typography.labelSm, { color: active ? opt.color : colors.secondary }]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[typography.labelLg, styles.fieldLabel]}>Ảnh chụp hiện trường hư hỏng</Text>
        <View style={styles.photoPlaceholder}>
          <Ionicons name="camera-outline" size={32} color={colors.primary} />
          <Text style={[typography.labelSm, styles.photoText]}>Chạm để chụp ảnh có Watermark</Text>
          <Text style={[typography.caption, styles.photoHint]}>Gắn nhãn vị trí hiện tại</Text>
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[typography.labelLg, styles.fieldLabel]}>Ghi chú mô tả hiện trường</Text>
        <TextInput
          style={styles.textarea}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          placeholderTextColor={colors.secondary}
        />
      </View>

      <View style={styles.ctaWrap}>
        <Button variant="primary" title="Gửi báo cáo lỗi phát sinh cho PM" onPress={handleSubmit} />
      </View>

      {toast ? <Toast type="success" message={toast} /> : null}
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: colors.surfaceAlt,
  },
  topBarTitle: {
    color: colors.neutral,
  },
  badgeNew: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: '#FDECEC',
  },
  badgeNewText: {
    color: colors.error,
  },
  banner: {
    marginBottom: spacing.md,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: '#FEF3E2',
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  bannerText: {
    flex: 1,
    color: colors.neutral,
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    color: colors.secondary,
    marginBottom: spacing.sm,
  },
  gpsField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },
  gpsText: {
    color: colors.neutral,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: '#FEF3E2',
  },
  chipText: {
    color: colors.secondary,
  },
  chipTextActive: {
    color: colors.primaryDark,
  },
  severityRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  severityChip: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 2,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  photoPlaceholder: {
    height: 120,
    borderRadius: radius.xl,
    backgroundColor: colors.neutral,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  photoText: {
    color: colors.onPrimary,
  },
  photoHint: {
    color: colors.secondary,
  },
  textarea: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    ...typography.bodyMd,
    color: colors.onSurface,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  ctaWrap: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
});

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Chip } from '../../src/components/Chip';
import { InputField } from '../../src/components/InputField';
import { Toast } from '../../src/components/Toast';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

type ToastMessage = {
  type: 'success' | 'warning';
  message: string;
};

export default function PmFieldTaskScreen() {
  const [depth, setDepth] = useState('7.0');
  const [area, setArea] = useState('14.5');
  const [notes, setNotes] = useState(
    'Mép nhựa vỡ rộng hơn so với ảnh flycam. Mặt nhựa lún do xe tải nặng, chưa chạm nền móng.',
  );
  const [photoAttached, setPhotoAttached] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const diffDepth = Number(depth.trim());
  const diffText =
    Number.isFinite(diffDepth) && diffDepth > 0 ? `+${(diffDepth - 6.8).toFixed(1)}cm` : '--';

  const handleAttachPhoto = () => {
    setPhotoAttached((prev) => !prev);
  };

  const handleConfirm = () => {
    const parsedDepth = Number(depth.trim());
    const parsedArea = Number(area.trim());
    if (!Number.isFinite(parsedDepth) || parsedDepth <= 0 || !Number.isFinite(parsedArea) || parsedArea <= 0) {
      setToast({ type: 'warning', message: '⚠️ Vui lòng nhập Độ sâu thực địa (cm) và Diện tích (m²) hợp lệ!' });
      return;
    }
    if (!photoAttached) {
      setToast({ type: 'warning', message: '⚠️ Vui lòng đính kèm ảnh thước đo tại hiện trường!' });
      return;
    }
    setToast({
      type: 'success',
      message: `✅ Đã xác nhận qua thực địa: sâu ${depth}cm - diện tích ${area} m². Lỗi #DF-0231 sẵn sàng nhập đợt sửa chữa.`,
    });
    setTimeout(() => router.push('/(pm)/ai-inbox'), 1200);
  };

  return (
    <View style={styles.screen}>
      <SafeAreaScreen scroll header={<AppHeader subtitle="Kiểm Tra Thực Địa" />}>
        <View style={styles.titleRow}>
          <View style={styles.titleBlock}>
            <Text style={[typography.titleLg, styles.defectId]}>#DF-0231</Text>
            <Text style={[typography.caption, styles.defectMeta]}>QL.1A Km1842+150 • Ổ gà sâu mặt đường nhựa</Text>
          </View>
          <Chip variant="severity-high" label="RỦI RO CAO" />
        </View>

        <Card style={styles.crewCard}>
          <View style={styles.crewRow}>
            <View style={styles.crewAvatar}>
              <Ionicons name="person" size={18} color={colors.primaryDark} />
            </View>
            <View style={styles.crewInfo}>
              <Text style={[typography.titleMd, styles.crewName]}>Nguyễn Văn Hùng</Text>
              <Text style={[typography.caption, styles.crewMeta]}>Đội trưởng thi công • Đo thước cơ học</Text>
            </View>
            <View style={styles.crewBadge}>
              <View style={styles.crewDot} />
              <Text style={[typography.labelSm, styles.crewBadgeText]}>Đã đo</Text>
            </View>
          </View>
        </Card>

        <Card style={styles.formCard}>
          <Text style={[typography.titleMd, styles.cardTitle]}>Số đo thực địa</Text>
          <View style={styles.aiRefRow}>
            <Ionicons name="analytics-outline" size={16} color={colors.secondary} />
            <Text style={[typography.caption, styles.aiRefText]}>
              AI phát hiện: sâu 6.8cm - diện tích 14.5 m² (độ tin cậy 94.2%)
            </Text>
          </View>

          <InputField
            label="Độ sâu thước cơ học (cm)"
            value={depth}
            onChangeText={setDepth}
            placeholder="Ví dụ: 7.0"
          />
          <View style={styles.diffRow}>
            <Chip variant="status-pending" label={`CHÊNH LỆCH ${diffText} SO VỚI AI`} />
          </View>
          <InputField
            label="Diện tích thực tế (m²)"
            value={area}
            onChangeText={setArea}
            placeholder="Ví dụ: 14.5"
          />

          <Pressable
            onPress={handleAttachPhoto}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.attachBox,
              photoAttached && styles.attachBoxDone,
              pressed && styles.attachPressed,
            ]}
          >
            {photoAttached ? (
              <Ionicons name="checkmark-circle" size={22} color={colors.success} />
            ) : (
              <Ionicons name="camera" size={22} color={colors.secondary} />
            )}
            <View style={styles.attachInfo}>
              <Text style={[typography.bodyMd, styles.attachTitle]}>
                {photoAttached ? 'Đã đính kèm ảnh thước đo' : 'Đính kèm ảnh thước đo tại hiện trường'}
              </Text>
              <Text style={[typography.caption, styles.attachHint]}>
                {photoAttached ? 'Ảnh_DF0231_calip_hiệntrường.jpg' : 'Chụp thước đo đặt trong lòng ổ gà, ghi rõ số đo'}
              </Text>
            </View>
          </Pressable>

          <Text style={[typography.labelLg, styles.notesLabel]}>Ghi chú hiện trường</Text>
          <TextInput
            multiline
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Mô tả hiện trạng thực tế, nguyên nhân nghi hoặc..."
            placeholderTextColor={colors.secondary}
            textAlignVertical="top"
          />
        </Card>

        <View style={styles.buttonGroup}>
          <Button variant="primary" title="Xác nhận qua thực địa" onPress={handleConfirm} />
        </View>
        <Text style={[typography.caption, styles.footerHint]}>
          Sau khi xác nhận, lỗi sẽ chuyển sang trạng thái Đã duyệt và sẵn sàng gộp đợt sửa chữa.
        </Text>
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
  crewCard: {
    marginBottom: spacing.md,
  },
  crewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  crewAvatar: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  crewInfo: {
    flex: 1,
  },
  crewName: {
    color: colors.neutral,
  },
  crewMeta: {
    color: colors.secondary,
    marginTop: 2,
  },
  crewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    backgroundColor: '#E9F7EC',
  },
  crewDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.success,
  },
  crewBadgeText: {
    color: colors.success,
  },
  formCard: {
    marginBottom: spacing.lg,
  },
  cardTitle: {
    color: colors.neutral,
    marginBottom: spacing.sm,
  },
  aiRefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  aiRefText: {
    color: colors.secondary,
    flex: 1,
  },
  diffRow: {
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  attachBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  attachBoxDone: {
    borderColor: colors.success,
    backgroundColor: '#E9F7EC',
  },
  attachPressed: {
    opacity: 0.7,
  },
  attachInfo: {
    flex: 1,
  },
  attachTitle: {
    color: colors.neutral,
  },
  attachHint: {
    color: colors.secondary,
    marginTop: 2,
  },
  notesLabel: {
    color: colors.secondary,
    marginBottom: spacing.sm,
  },
  notesInput: {
    minHeight: 96,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    ...typography.bodyLg,
    color: colors.onSurface,
  },
  buttonGroup: {
    marginBottom: spacing.sm,
  },
  footerHint: {
    color: colors.secondary,
    marginBottom: spacing.md,
  },
});
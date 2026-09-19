import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { AlertButton } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { InputField } from '../../src/components/InputField';
import { Toast } from '../../src/components/Toast';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

const BATCH_COST = 74900000;
const ITEM_COST = 42500000;

type ToastMessage = {
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
};

const formatCost = (value: number) => value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export default function PmSubmitApprovalScreen() {
  const [priority, setPriority] = useState('Ưu tiên trung bình (Trong 7 ngày)');
  const [note, setNote] = useState('');
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const PRIORITIES = [
    'Ưu tiên trung bình (Trong 7 ngày)',
    'Ưu tiên cao (Khắc phục trong 48h)',
    'Khẩn cấp (Trong 24h)',
  ];

  const pickPriority = () => {
    const options: AlertButton[] = PRIORITIES.map((p) => ({ text: p, onPress: () => setPriority(p) }));
    options.push({ text: 'Bỏ qua', style: 'cancel' as const });
    Alert.alert('Mức độ ưu tiên', undefined, options);
  };

  const handleSend = () => {
    setToast({ type: 'success', message: '✅ Đã gửi hồ sơ #REQ-045 cho Supervisor phê duyệt!' });
    setTimeout(() => router.push('/(pm)/submitted-tab'), 1200);
  };

  return (
    <SafeAreaScreen scroll>
      <View style={styles.headerBar}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          style={({ pressed }) => [styles.backBtn, pressed && styles.backPressed]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.neutral} />
        </Pressable>
        <Text style={[typography.titleMd, styles.headerTitle]}>Gửi supervisor phê duyệt</Text>
      </View>

      <View style={styles.stepRow}>
        <View style={styles.stepBadge}>
          <View style={styles.stepDot} />
          <Text style={[typography.labelSm, styles.stepText]}>BƯỚC 2 / 2: TRÌNH PHÊ DUYỆT</Text>
        </View>
        <View style={styles.firstBadge}>
          <Text style={[typography.labelSm, styles.firstBadgeText]}>Lần đầu</Text>
        </View>
      </View>

      <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLabel}>
              <Ionicons name="document-text-outline" size={16} color={colors.primary} />
              <Text style={[typography.labelLg, styles.cardHeaderText]}>
                TÓM TẮT LỖI CẦN DUYỆT #DF-0231
              </Text>
            </View>
            <View style={styles.severityBadge}>
              <Text style={[typography.labelSm, styles.severityBadgeText]}>MỨC ĐỘ: VỪA</Text>
            </View>
          </View>

          <Text style={[typography.titleLg, styles.defectTitle]}>Ổ gà sâu mặt đường (Pothole)</Text>
          <View style={styles.sourceRow}>
            <Ionicons name="videocam-outline" size={14} color={colors.secondary} />
            <Text style={[typography.caption, styles.sourceText]}>
              Trích từ video drone 4K — Frame 00:42
            </Text>
          </View>

          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Text style={[typography.caption, styles.infoLabel]}>Vị trí:</Text>
              <Text style={[typography.caption, styles.infoValue]}>Km14+250, ĐT.741, Cầu Sông Bé</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[typography.caption, styles.infoLabel]}>Tọa độ GPS:</Text>
              <Text style={[typography.caption, styles.infoValue]}>11.2354° N, 106.8921° E</Text>
            </View>
          </View>
        </Card>

        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLabel}>
              <Ionicons name="images-outline" size={16} color={colors.primary} />
              <Text style={[typography.labelLg, styles.cardHeaderText]}>
                Bằng chứng khảo sát đính kèm
              </Text>
            </View>
            <View style={styles.autoRow}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={[typography.labelSm, styles.autoText]}>Tự động đính kèm</Text>
            </View>
          </View>

          <View style={styles.attachBox}>
            <View style={styles.thumb}>
              <Ionicons name="image-outline" size={24} color="#94A3B8" />
              <View style={styles.thumbBadge}>
                <Text style={styles.thumbBadgeText}>00:42</Text>
              </View>
            </View>
            <View style={styles.attachInfo}>
              <Text style={[typography.labelLg, styles.attachName]} numberOfLines={1}>
                IMG_DRONE_0231.JPG
              </Text>
              <Text style={[typography.caption, styles.attachMeta]}>
                Dung lượng: ~1.8 MB • Độ phân giải 4K
              </Text>
              <View style={styles.droneBadge}>
                <Text style={[typography.labelSm, styles.droneBadgeText]}>ẢNH DRONE 00:42</Text>
              </View>
            </View>
            <Pressable
              onPress={() => setToast({ type: 'info', message: '🔍 Xem ảnh gốc 4K' })}
              accessibilityRole="button"
              style={({ pressed }) => [styles.zoomBtn, pressed && styles.backPressed]}
            >
              <Ionicons name="search" size={18} color={colors.secondary} />
            </Pressable>
          </View>
        </Card>

        <Card style={styles.card}>
          <View style={styles.cardHeaderFull}>
            <Ionicons name="create-outline" size={16} color={colors.primary} />
            <Text style={[typography.labelLg, styles.cardHeaderText]}>
              THÔNG TIN ĐỀ XUẤT XỬ LÝ
            </Text>
          </View>

          <View style={styles.costGroup}>
            <Text style={[typography.labelLg, styles.fieldLabel]}>
              Chi phí sửa chữa ước tính (VNĐ) <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.costBox}>
              <Text style={[typography.titleMd, styles.costValue]}>{formatCost(BATCH_COST)}</Text>
              <Text style={[typography.labelLg, styles.costUnit]}>VNĐ</Text>
            </View>
            <Text style={[typography.caption, styles.costNote]}>
              Tổng dự toán đợt #REQ-045 tự tính từ các hư hỏng đã chọn (chi tiết #DF-0231:{' '}
              {formatCost(ITEM_COST)} VNĐ).
            </Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[typography.labelLg, styles.fieldLabel]}>
              Mức độ ưu tiên <Text style={styles.required}>*</Text>
            </Text>
            <Pressable onPress={pickPriority} style={styles.selectBox} accessibilityRole="button">
              <Text style={[typography.bodyMd, styles.selectValue]} numberOfLines={1}>
                {priority}
              </Text>
              <Ionicons name="chevron-down" size={18} color={colors.secondary} />
            </Pressable>
          </View>

          <InputField
            label="Ghi chú gửi Supervisor (tùy chọn)"
            value={note}
            onChangeText={(value) => setNote(value.slice(0, 300))}
            placeholder="Nhập đề xuất xử lý hoặc thời hạn mong muốn..."
          />
          <Text style={[typography.caption, styles.noteCounter]}>{note.length}/300</Text>

          <View style={styles.supervisorBox}>
            <View style={styles.supervisorInner}>
              <View style={styles.supervisorAvatar}>
                <Text style={[typography.labelSm, styles.supervisorAvatarText]}>SV</Text>
              </View>
              <View>
                <Text style={[typography.labelSm, styles.supervisorLabel]}>
                  NGƯỜI TIẾP NHẬN PHÊ DUYỆT
                </Text>
                <Text style={[typography.bodyMd, styles.supervisorName]}>
                  Lê Hoàng Nam (Supervisor ĐT.741)
                </Text>
              </View>
            </View>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          </View>
        </Card>

        <View style={styles.ctaWrap}>
          <Button variant="primary" title="Gửi phê duyệt" onPress={handleSend} />
          <Text style={[typography.caption, styles.ctaNote]}>
            Yêu cầu sẽ được chuyển đến Supervisor phụ trách tuyến ĐT.741 để xem xét &amp; cấp ngân
            sách thi công.
          </Text>
        </View>

      {toast ? <Toast type={toast.type} message={toast.message} /> : null}
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPressed: {
    opacity: 0.7,
  },
  headerTitle: {
    color: colors.neutral,
    flex: 1,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  stepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.warning,
  },
  stepText: {
    color: colors.secondary,
    letterSpacing: 0.5,
  },
  firstBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.brandGold,
  },
  firstBadgeText: {
    color: colors.brandGold,
  },
  card: {
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.md,
  },
  cardHeaderFull: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.md,
  },
  cardHeaderLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  cardHeaderText: {
    color: colors.secondary,
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  severityBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  severityBadgeText: {
    color: colors.warning,
  },
  defectTitle: {
    color: colors.neutral,
    marginBottom: spacing.xs,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  sourceText: {
    color: colors.secondary,
  },
  infoBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  infoLabel: {
    color: colors.secondary,
  },
  infoValue: {
    color: colors.neutral,
  },
  autoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  autoText: {
    color: colors.success,
  },
  attachBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 2,
  },
  thumbBadgeText: {
    color: colors.surface,
    fontSize: 8,
    textAlign: 'center',
  },
  attachInfo: {
    flex: 1,
    minWidth: 0,
  },
  attachName: {
    color: colors.neutral,
  },
  attachMeta: {
    color: colors.secondary,
    marginTop: 1,
  },
  droneBadge: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(226, 232, 240, 0.9)',
  },
  droneBadgeText: {
    color: colors.secondary,
    fontSize: 9,
    letterSpacing: 0.4,
  },
  zoomBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  costGroup: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    color: colors.neutral,
    marginBottom: spacing.sm,
  },
  required: {
    color: colors.error,
  },
  costBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },
  costValue: {
    color: colors.neutral,
    fontFamily: 'monospace',
  },
  costUnit: {
    color: colors.secondary,
  },
  costNote: {
    color: colors.secondary,
    marginTop: spacing.xs,
    lineHeight: 15,
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },
  selectValue: {
    color: colors.onSurface,
    flex: 1,
  },
  noteCounter: {
    color: colors.secondary,
    textAlign: 'right',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  supervisorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  supervisorInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  supervisorAvatar: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: '#EBF2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  supervisorAvatarText: {
    color: colors.info,
  },
  supervisorLabel: {
    color: colors.secondary,
    letterSpacing: 0.4,
  },
  supervisorName: {
    color: colors.neutral,
    marginTop: 2,
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
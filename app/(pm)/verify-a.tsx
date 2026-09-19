import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Toast } from '../../src/components/Toast';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

type ToastMessage = {
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
};

export default function PmVerifyAScreen() {
  const [note, setNote] = useState(
    'Vết nứt chân chim bề mặt ~1.2m, chưa ảnh hưởng sâu tới kết cấu móng. Phương án trám keo chống thấm.',
  );
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const handleConfirm = () => {
    setToast({
      type: 'success',
      message: '✅ Đã xác nhận lỗi #DF-0231! Chuyển sang giỏ đợt sửa.',
    });
    setTimeout(() => router.push('/(pm)/batching'), 800);
  };

  const handleReject = () => {
    setToast({
      type: 'info',
      message: 'Đã ghi nhận từ chối — đánh dấu lỗi giả / nhiễu AI.',
    });
    setTimeout(() => router.push('/(pm)/ai-inbox'), 800);
  };

  const handleResurvey = () => {
    setToast({
      type: 'warning',
      message: 'Đã tạo lệnh yêu cầu phi công bay bổ sung vùng chưa đạt.',
    });
    setTimeout(() => router.push('/(pm)/surveys'), 800);
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(pm)/ai-inbox');
    }
  };

  return (
    <View style={styles.screen}>
      <SafeAreaScreen scroll>
        {/* Top App Bar matching Wireframe */}
        <View style={styles.topAppBar}>
          <Pressable
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          >
            <Ionicons name="arrow-back" size={20} color={colors.neutral} />
          </Pressable>
          <Text style={[typography.titleMd, styles.appBarTitle]}>Xác minh lỗi #DF-0231</Text>
          <View style={styles.variantBadge}>
            <Text style={styles.variantBadgeText}>BIẾN THỂ A</Text>
          </View>
        </View>

        {/* Video Snapshot Card with Bounding Box */}
        <View style={styles.videoCard}>
          <View style={styles.videoCanvas}>
            {/* Dark asphalt simulation background */}
            <View style={styles.asphaltBg}>
              <View style={styles.crackLine1} />
              <View style={styles.crackLine2} />
              <View style={styles.crackLine3} />
            </View>

            {/* Red AI Bounding Box overlay */}
            <View style={styles.bbox}>
              <View style={styles.bboxHeader}>
                <View style={styles.bboxTag}>
                  <Text style={styles.bboxTagText}>AI #01 • 89%</Text>
                </View>
              </View>
              <View style={styles.bboxFooter}>
                <View style={styles.defectTag}>
                  <Text style={styles.defectTagText}>Rạn nứt ~1.2m</Text>
                </View>
              </View>
            </View>

            {/* Video timestamp badge */}
            <View style={styles.timestampBadge}>
              <Ionicons name="play" size={11} color="#FFFFFF" />
              <Text style={styles.timestampText}>00:42</Text>
            </View>
          </View>

          {/* Sub-link row */}
          <View style={styles.subLinkRow}>
            <View style={styles.sourceGroup}>
              <View style={styles.greenDot} />
              <Text style={styles.sourceText}>Trích từ video khảo sát — 00:42</Text>
            </View>
            <Pressable
              onPress={() => router.push('/(pm)/verify-b')}
              style={({ pressed }) => [styles.linkWrap, pressed && styles.pressed]}
            >
              <Text style={styles.linkText}>Xem trong video gốc</Text>
              <Ionicons name="arrow-forward" size={13} color={colors.primaryDark} />
            </Pressable>
          </View>
        </View>

        {/* Defect Info Table Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeaderRow}>
            <View>
              <Text style={styles.sectionMetaLabel}>LOẠI SỰ CỐ PHÁT HIỆN</Text>
              <Text style={[typography.titleMd, styles.defectTitle]}>
                Rạn nứt mai rùa diện hẹp
              </Text>
            </View>
            <View style={styles.severityWrap}>
              <Text style={styles.sectionMetaLabel}>MỨC ĐỘ AI</Text>
              <View style={styles.severityBadge}>
                <Text style={styles.severityBadgeText}>VỪA (MEDIUM)</Text>
              </View>
            </View>
          </View>

          {/* 2x2 Grid Info */}
          <View style={styles.gridRow}>
            <View style={styles.gridCol}>
              <Text style={styles.fieldMetaLabel}>Độ tin cậy AI</Text>
              <View style={styles.confidenceRow}>
                <View style={styles.greenDotSm} />
                <Text style={styles.confidenceText}>89.4% (Độ tin cậy cao)</Text>
              </View>
            </View>
            <View style={styles.gridCol}>
              <Text style={styles.fieldMetaLabel}>Tuyến đường</Text>
              <Text style={styles.routeValue}>ĐT.741 • Km14+200</Text>
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={styles.gridCol}>
              <Text style={styles.fieldMetaLabel}>Tọa độ GPS thực địa</Text>
              <Text style={styles.monoValue}>10.983214, 106.812903</Text>
            </View>
            <View style={styles.gridCol}>
              <Text style={styles.fieldMetaLabel}>Độ chính xác</Text>
              <Text style={styles.accuracyValue}>Sai số ±1.1m</Text>
            </View>
          </View>
        </View>

        {/* Verification Notes Card */}
        <View style={styles.noteCard}>
          <Text style={[typography.labelLg, styles.noteLabel]}>
            Ghi chú xác minh (Tùy chọn)
          </Text>
          <TextInput
            multiline
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="Nhập ghi chú thẩm định hiện trường..."
            placeholderTextColor={colors.secondary}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionGroup}>
          <Pressable
            style={({ pressed }) => [styles.primaryCta, pressed && styles.pressed]}
            onPress={handleConfirm}
            accessibilityRole="button"
          >
            <Ionicons name="checkmark" size={18} color="#FFFFFF" />
            <Text style={styles.primaryCtaText}>Xác nhận lỗi thật</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.secondaryCta, pressed && styles.pressed]}
            onPress={handleReject}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryCtaText}>Từ chối — lỗi giả</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.ghostCta, pressed && styles.pressed]}
            onPress={handleResurvey}
            accessibilityRole="button"
          >
            <Text style={styles.ghostCtaText}>Yêu cầu khảo sát lại</Text>
          </Pressable>

          <Text style={styles.footnoteText}>
            Bấm Xác nhận lỗi thật để chuyển tiếp sang màn hình Gửi Supervisor phê duyệt phương án.
          </Text>
        </View>
      </SafeAreaScreen>

      {toast ? <Toast type={toast.type} message={toast.message} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  topAppBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  appBarTitle: {
    color: colors.neutral,
    fontWeight: '700',
  },
  variantBadge: {
    backgroundColor: '#FEF3E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  variantBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 0.5,
  },
  videoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  videoCanvas: {
    height: 220,
    backgroundColor: '#0F172A',
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  asphaltBg: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#1E293B',
    opacity: 0.9,
  },
  crackLine1: {
    position: 'absolute',
    left: '30%',
    top: '40%',
    width: 90,
    height: 3,
    backgroundColor: '#334155',
    transform: [{ rotate: '-25deg' }],
  },
  crackLine2: {
    position: 'absolute',
    left: '42%',
    top: '46%',
    width: 70,
    height: 2,
    backgroundColor: '#475569',
    transform: [{ rotate: '40deg' }],
  },
  crackLine3: {
    position: 'absolute',
    left: '38%',
    top: '52%',
    width: 80,
    height: 2,
    backgroundColor: '#334155',
    transform: [{ rotate: '-10deg' }],
  },
  bbox: {
    position: 'absolute',
    width: 176,
    height: 112,
    borderWidth: 2,
    borderColor: '#E5484D',
    backgroundColor: 'rgba(229, 72, 77, 0.15)',
    borderRadius: radius.md,
    justifyContent: 'space-between',
    padding: 6,
  },
  bboxHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  bboxTag: {
    backgroundColor: '#E5484D',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bboxTagText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  bboxFooter: {
    alignItems: 'flex-end',
  },
  defectTag: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defectTagText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: 'monospace',
  },
  timestampBadge: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  timestampText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  subLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: '#ECEEF2',
  },
  sourceGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: radius.full,
    backgroundColor: '#10B981',
  },
  sourceText: {
    fontSize: 11,
    color: colors.secondary,
  },
  linkWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  linkText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  sectionMetaLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.secondary,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  defectTitle: {
    color: colors.neutral,
    fontWeight: '700',
  },
  severityWrap: {
    alignItems: 'flex-end',
  },
  severityBadge: {
    backgroundColor: '#FEF3E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    marginTop: 2,
  },
  severityBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
  },
  gridRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#ECEEF2',
    paddingTop: 8,
    marginTop: 8,
  },
  gridCol: {
    flex: 1,
  },
  fieldMetaLabel: {
    fontSize: 10,
    color: colors.secondary,
    marginBottom: 2,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  greenDotSm: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: '#10B981',
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  routeValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral,
  },
  monoValue: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: colors.neutral,
  },
  accuracyValue: {
    fontSize: 12,
    color: colors.secondary,
  },
  noteCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  noteLabel: {
    color: colors.neutral,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  noteInput: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#ECEEF2',
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: 12,
    lineHeight: 18,
    color: colors.neutral,
    minHeight: 64,
    textAlignVertical: 'top',
  },
  actionGroup: {
    gap: spacing.sm,
    paddingBottom: 24,
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryCtaText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  secondaryCta: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#2D3748',
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  secondaryCtaText: {
    color: colors.neutral,
    fontWeight: '700',
    fontSize: 12,
  },
  ghostCta: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  ghostCtaText: {
    color: colors.secondary,
    fontWeight: '600',
    fontSize: 12,
  },
  footnoteText: {
    textAlign: 'center',
    fontSize: 10,
    color: colors.secondary,
    lineHeight: 14,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.75,
  },
});
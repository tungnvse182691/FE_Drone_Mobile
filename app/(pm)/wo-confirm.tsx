import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Toast } from '../../src/components/Toast';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

type ToastMessage = {
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
};

export default function PmWoConfirmScreen() {
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const handleConfirm = () => {
    setToast({ type: 'success', message: 'PM đã nghiệm thu hoàn thành #WO-118! Chuyển hồ sơ sang Giám sát' });
    setTimeout(() => router.push('/(pm)/submitted-tab'), 800);
  };

  const handleRedo = () => {
    setToast({ type: 'warning', message: 'Đã trả hồ sơ về Đội sửa chữa yêu cầu khắc phục lại' });
    setTimeout(() => router.push('/(pm)/home'), 800);
  };

  return (
    <SafeAreaScreen scroll>
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          >
            <Ionicons name="arrow-back" size={20} color={colors.neutral} />
          </Pressable>
          <Text style={[typography.titleMd, styles.headerTitle]}>Xác nhận hoàn thành #WO-118</Text>
        </View>
        <Pressable
          onPress={() => setToast({ type: 'info', message: 'Thao tác mở rộng' })}
          accessibilityRole="button"
          style={({ pressed }) => [styles.moreBtn, pressed && styles.pressed]}
        >
          <Ionicons name="ellipsis-vertical" size={20} color={colors.secondary} />
        </Pressable>
      </View>

      <View style={styles.incidentCard}>
        <View style={styles.incidentHeader}>
          <View style={styles.incidentTitleRow}>
            <View style={styles.priorityCircle}>
              <Ionicons name="alert" size={16} color="#D97706" />
            </View>
            <Text style={[typography.bodyLg, styles.incidentTitle]}>Ổ gà sâu trên mặt đường nhựa</Text>
          </View>
          <View style={styles.pendingBadge}>
            <Text style={[typography.labelSm, styles.pendingBadgeText]}>Chờ nghiệm thu</Text>
          </View>
        </View>

        <View style={styles.metaList}>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={15} color={colors.secondary} />
            <Text style={[typography.caption, styles.metaText]}>Km 14+320, ĐT.741, Bình Dương</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="people-outline" size={15} color={colors.secondary} />
            <Text style={[typography.caption, styles.metaText]}>Đội sửa chữa số 2 (Trần Văn Nam)</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={15} color={colors.secondary} />
            <Text style={[typography.caption, styles.metaText]}>
              Hoàn thành: <Text style={styles.metaBold}>Hôm nay, 14:30</Text>
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[typography.labelSm, styles.sectionTitle]}>HÌNH ẢNH NGHIỆM THU ĐỐI CHIẾU</Text>
        <Text style={[typography.caption, styles.sectionCount]}>2 hình ảnh</Text>
      </View>

      <View style={styles.photoRow}>
        <View style={styles.photoCard}>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.photoThumb, pressed && styles.pressed]}
            onPress={() => setToast({ type: 'info', message: 'Xem ảnh hiện trạng ban đầu' })}
          >
            <Ionicons name="image-outline" size={36} color="#64748B" />
            <View style={[styles.photoTag, styles.photoTagBefore]}>
              <Text style={styles.photoTagText}>Trước</Text>
            </View>
          </Pressable>
          <View style={styles.photoFooter}>
            <Text style={[typography.caption, styles.photoTitle]}>Hiện trạng ban đầu</Text>
            <Ionicons name="search" size={16} color={colors.secondary} />
          </View>
        </View>

        <View style={styles.photoCard}>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.photoThumb, styles.photoThumbAfter, pressed && styles.pressed]}
            onPress={() => setToast({ type: 'info', message: 'Xem ảnh sau khi thảm nhựa C12.5' })}
          >
            <Ionicons name="checkmark-circle" size={36} color={colors.success} />
            <View style={[styles.photoTag, styles.photoTagAfter]}>
              <Text style={styles.photoTagText}>Sau</Text>
            </View>
          </Pressable>
          <View style={styles.photoFooter}>
            <Text style={[typography.caption, styles.photoTitle]}>Đã thảm nhựa C12.5</Text>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          </View>
        </View>
      </View>

      <Text style={[typography.labelSm, styles.sectionTitle, styles.videoSectionTitle]}>
        VIDEO XÁC NHẬN THI CÔNG
      </Text>

      <View style={styles.videoCard}>
        <View style={styles.videoTopBar}>
          <View style={styles.videoLiveRow}>
            <View style={styles.liveDot} />
            <Text style={styles.videoLiveText}>Flycam kiểm tra sau sửa chữa</Text>
          </View>
          <Text style={styles.videoTime}>00:35 • 1080p</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.playBtn, pressed && styles.playBtnPressed]}
          onPress={() => setToast({ type: 'info', message: 'Phát video flycam kiểm tra hiện trường' })}
        >
          <Ionicons name="play" size={32} color={colors.primary} />
        </Pressable>

        <View style={styles.videoBottomBar}>
          <Text style={styles.videoQuality}>Độ nét cao (60 fps)</Text>
          <Pressable accessibilityRole="button" onPress={() => setToast({ type: 'info', message: 'Phát video' })}>
            <Text style={styles.videoCta}>Chạm để phát</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.noteCard}>
        <View style={styles.noteHeader}>
          <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.primary} />
          <Text style={[typography.labelSm, styles.sectionTitle]}>GHI CHÚ TỪ ĐỘI SỬA CHỮA:</Text>
        </View>
        <Text style={[typography.caption, styles.noteText]}>
          Đã cào bóc lớp nhựa cũ hư hại, lu lèn nền đá base cấp phối và trải thảm bê tông nhựa nóng
          C12.5 dày 7cm. Đã kiểm tra độ bằng phẳng và dọn dẹp vệ sinh hiện trường.
        </Text>
      </View>

      <View style={styles.ctaWrap}>
        <Pressable
          accessibilityRole="button"
          onPress={handleConfirm}
          style={({ pressed }) => [styles.confirmBtn, pressed && styles.confirmBtnPressed]}
        >
          <Ionicons name="checkmark-circle" size={20} color={colors.onPrimary} />
          <Text style={[typography.labelLg, styles.confirmText]}>Xác nhận hoàn thành</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={handleRedo}
          style={({ pressed }) => [styles.redoBtn, pressed && styles.redoBtnPressed]}
        >
          <Ionicons name="refresh" size={16} color={colors.error} />
          <Text style={[typography.labelSm, styles.redoText]}>Yêu cầu làm lại</Text>
        </Pressable>
      </View>

      {toast ? <Toast type={toast.type} message={toast.message} /> : null}
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  headerTitle: {
    color: colors.neutral,
    flex: 1,
  },
  incidentCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  incidentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  incidentTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    flex: 1,
  },
  priorityCircle: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  incidentTitle: {
    color: colors.neutral,
    fontWeight: '700',
    flex: 1,
  },
  pendingBadge: {
    paddingVertical: 2,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    backgroundColor: '#FEF3E2',
  },
  pendingBadgeText: {
    color: colors.brandGold,
    fontWeight: '700',
  },
  metaList: {
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  metaText: {
    color: colors.secondary,
  },
  metaBold: {
    color: colors.neutral,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.secondary,
    letterSpacing: 0.3,
  },
  sectionCount: {
    color: colors.secondary,
  },
  photoRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  photoCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  photoThumb: {
    height: 128,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoThumbAfter: {
    backgroundColor: '#1E293B',
  },
  photoTag: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
  },
  photoTagBefore: {
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  photoTagAfter: {
    backgroundColor: '#059669',
  },
  photoTagText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: '700',
  },
  photoFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
  },
  photoTitle: {
    color: colors.neutral,
  },
  videoSectionTitle: {
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  videoCard: {
    backgroundColor: '#020617',
    borderRadius: radius.xl,
    height: 176,
    padding: spacing.sm,
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  videoTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  videoLiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: '#F43F5E',
  },
  videoLiveText: {
    color: '#FB7185',
    fontSize: 11,
    fontWeight: '600',
  },
  videoTime: {
    color: '#CBD5E1',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  playBtn: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnPressed: {
    transform: [{ scale: 0.95 }],
  },
  videoBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  videoQuality: {
    color: '#CBD5E1',
    fontSize: 11,
  },
  videoCta: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '500',
  },
  noteCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  noteText: {
    color: colors.neutral,
    lineHeight: 18,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  ctaWrap: {
    marginBottom: spacing.sm,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 14,
    marginBottom: spacing.sm,
  },
  confirmBtnPressed: {
    backgroundColor: colors.primaryDark,
  },
  confirmText: {
    color: colors.onPrimary,
  },
  redoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#FB7185',
    borderRadius: radius.lg,
    paddingVertical: 12,
  },
  redoBtnPressed: {
    backgroundColor: '#FFF1F2',
  },
  redoText: {
    color: colors.error,
  },
});
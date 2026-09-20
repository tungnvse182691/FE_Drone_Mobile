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

interface CrewOption {
  id: string;
  initials: string;
  name: string;
  detail: string;
  meta: string;
  metaTone: 'success' | 'warning' | 'default';
}

const CREWS: CrewOption[] = [
  {
    id: 'vv',
    initials: 'TV',
    name: 'Trần Văn Vượng',
    detail: 'Gần vị trí nhất (1.8 km)',
    meta: 'Đội Cơ giới 01 • Đang làm: 1 việc',
    metaTone: 'success',
  },
  {
    id: 'lm',
    initials: 'LM',
    name: 'Lê Minh Tuấn',
    detail: 'Cách 4.2 km',
    meta: 'Đội Sửa chữa Bê tông số 01 • Đang làm: 2 việc',
    metaTone: 'default',
  },
  {
    id: 'nd',
    initials: 'ND',
    name: 'Nguyễn Đức Cường',
    detail: 'Cách 6.5 km',
    meta: 'Đội Sửa chữa Cát Tường 2 • Đang làm: 3 việc',
    metaTone: 'default',
  },
  {
    id: 'ph',
    initials: 'PH',
    name: 'Phạm Hoàng Sơn',
    detail: 'Khối lượng cao',
    meta: 'Đội Vá dặm mặt đường • Đang làm: 4 việc',
    metaTone: 'warning',
  },
];

export default function PmAssignCrewScreen() {
  const [selectedId, setSelectedId] = useState('vv');
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const selected = CREWS.find((c) => c.id === selectedId) ?? CREWS[0];

  const handleAssign = () => {
    setToast({
      type: 'success',
      message: `Đã tạo Work Order #WO-118 và phát lệnh cho ${selected.name}!`,
    });
    setTimeout(() => router.push('/(pm)/submitted-tab'), 800);
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(pm)/submitted-tab');
    }
  };

  return (
    <SafeAreaScreen scroll>
      <View style={styles.headerBar}>
        <Pressable
          onPress={handleBack}
          accessibilityRole="button"
          style={({ pressed }) => [styles.backBtn, pressed && styles.backPressed]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.neutral} />
        </Pressable>
        <Text style={[typography.titleMd, styles.headerTitle]}>Giao việc cho Repair Crew</Text>
      </View>

      <View style={styles.defectCard}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={[typography.labelSm, styles.cardHeaderLabel]}>MÃ SỰ CỐ ĐÃ DUYỆT</Text>
            <Text style={[typography.titleMd, styles.defectCode]}>#DF-0231</Text>
          </View>
          <View style={styles.severityBadge}>
            <Text style={[typography.labelSm, styles.severityBadgeText]}>MỨC ĐỘ CAO</Text>
          </View>
        </View>

        <View style={styles.locationRow}>
          <Ionicons name="location" size={16} color="#D97706" />
          <Text style={[typography.bodyMd, styles.locationText]}>
            Km02+150 — Tuyến ĐH.05 (Xã Bình Chánh, TP.HCM)
          </Text>
        </View>
        <Text style={[typography.caption, styles.defectDesc]}>
          Ổ gà vỡ tấm sâu 6.5cm, bể nứt mép tấm BTXM lân cận
        </Text>

        <View style={styles.approvedRow}>
          <Text style={[typography.caption, styles.approvedText]}>
            Đã phê duyệt bởi: <Text style={styles.approvedName}>Supervisor Nguyễn Tuấn</Text>
          </Text>
          <Text style={[typography.labelSm, styles.priorityText]}>Ưu tiên khẩn cấp</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[typography.labelSm, styles.sectionTitle]}>CHỌN NGƯỜI THỰC HIỆN</Text>
        <Text style={[typography.caption, styles.sectionCount]}>4 đội khả dụng</Text>
      </View>

      <View style={styles.crewCard}>
        {CREWS.map((crew) => {
          const isSelected = crew.id === selectedId;
          return (
            <Pressable
              key={crew.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              onPress={() => setSelectedId(crew.id)}
              style={({ pressed }) => [
                styles.crewRow,
                isSelected && styles.crewRowSelected,
                pressed && styles.crewRowPressed,
              ]}
            >
              <View style={[styles.radio, isSelected && styles.radioSelected]}>
                {isSelected ? <View style={styles.radioDot} /> : null}
              </View>

              <View
                style={[
                  styles.avatar,
                  isSelected ? styles.avatarSelected : styles.avatarNeutral,
                ]}
              >
                <Text
                  style={[
                    typography.labelSm,
                    isSelected ? styles.avatarTextSelected : styles.avatarTextNeutral,
                  ]}
                >
                  {crew.initials}
                </Text>
              </View>

              <View style={styles.crewInfo}>
                <View style={styles.crewNameRow}>
                  <Text style={[typography.bodyMd, styles.crewName]}>{crew.name}</Text>
                  <View
                    style={[
                      styles.metaTag,
                      crew.metaTone === 'success' && styles.metaTagSuccess,
                      crew.metaTone === 'warning' && styles.metaTagWarning,
                    ]}
                  >
                    <Text
                      style={[
                        typography.labelSm,
                        crew.metaTone === 'success' && styles.metaTextSuccess,
                        crew.metaTone === 'warning' && styles.metaTextWarning,
                      ]}
                    >
                      {crew.detail}
                    </Text>
                  </View>
                </View>
                <Text style={[typography.caption, styles.crewMeta]}>{crew.meta}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.noticeCard}>
        <Ionicons name="information-circle-outline" size={20} color={colors.brandGold} />
        <Text style={[typography.caption, styles.noticeText]}>
          Sau khi bấm <Text style={styles.noticeBold}>Giao việc</Text>, hệ thống sẽ tự động tạo
          phiếu Work Order và đồng bộ vào danh sách công việc của đội được giao. Trạng thái task sẽ
          cập nhật thành{' '}
          <Text style={styles.noticeGreen}>"Đã giao — {selected.name}"</Text>.
        </Text>
      </View>

      <View style={styles.ctaWrap}>
        <Pressable
          accessibilityRole="button"
          onPress={handleAssign}
          style={({ pressed }) => [styles.ctaBtn, pressed && styles.ctaBtnPressed]}
        >
          <Text style={[typography.labelLg, styles.ctaText]}>Giao việc</Text>
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
  defectCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.sm,
  },
  cardHeaderLabel: {
    color: colors.secondary,
    letterSpacing: 0.3,
  },
  defectCode: {
    color: colors.neutral,
    marginTop: 2,
  },
  severityBadge: {
    paddingVertical: 2,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    backgroundColor: '#FFF1F2',
  },
  severityBadgeText: {
    color: colors.error,
    letterSpacing: 0.3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  locationText: {
    color: colors.neutral,
    fontWeight: '700',
    flex: 1,
  },
  defectDesc: {
    color: colors.secondary,
    paddingLeft: spacing.lg,
    marginTop: 2,
  },
  approvedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
  },
  approvedText: {
    color: colors.secondary,
  },
  approvedName: {
    color: colors.neutral,
  },
  priorityText: {
    color: colors.brandGold,
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
  crewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  crewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  crewRowSelected: {
    backgroundColor: '#FEF3E2',
  },
  crewRowPressed: {
    opacity: 0.8,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSelected: {
    backgroundColor: '#EBF2F7',
  },
  avatarNeutral: {
    backgroundColor: colors.surfaceAlt,
  },
  avatarTextSelected: {
    color: '#1E40AF',
  },
  avatarTextNeutral: {
    color: colors.secondary,
  },
  crewInfo: {
    flex: 1,
    minWidth: 0,
  },
  crewNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  crewName: {
    color: colors.neutral,
    fontWeight: '700',
  },
  metaTag: {
    paddingVertical: 1,
    paddingHorizontal: 8,
    borderRadius: radius.full,
  },
  metaTagSuccess: {
    backgroundColor: '#EBFBEE',
  },
  metaTagWarning: {
    backgroundColor: '#FFFBEB',
  },
  metaTextSuccess: {
    color: colors.success,
    fontSize: 9,
  },
  metaTextWarning: {
    color: '#B45309',
    fontSize: 9,
  },
  crewMeta: {
    color: colors.secondary,
    marginTop: 2,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  noticeText: {
    color: colors.secondary,
    flex: 1,
    lineHeight: 18,
  },
  noticeBold: {
    fontWeight: '700',
    color: colors.neutral,
  },
  noticeGreen: {
    color: colors.success,
    fontWeight: '700',
  },
  ctaWrap: {
    marginBottom: spacing.sm,
  },
  ctaBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBtnPressed: {
    backgroundColor: colors.primaryDark,
  },
  ctaText: {
    color: colors.onPrimary,
  },
});
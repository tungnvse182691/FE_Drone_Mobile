import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

interface SignoffWorkOrder {
  woCode: string;
  roadTitle: string;
  crewLeader: string;
  pmName: string;
  area: string;
  method: string;
  deadline: string;
}

const SIGNOFF_DATA: Record<string, SignoffWorkOrder> = {
  '#WO-118': {
    woCode: '#WO-118',
    roadTitle: 'Đợt sửa chữa Tuyến ĐH.05 — Cầu Bà Lát (Km01+850)',
    crewLeader: 'Trần Văn Vượng',
    pmName: 'Nguyễn Thùy Lan',
    area: '14.5 m²',
    method: 'Đục tẩy tạo nhám, quét dính bám Aside, đổ bù bê tông xi măng mác 300',
    deadline: 'Trong 5 ngày',
  },
  '#WO-115': {
    woCode: '#WO-115',
    roadTitle: 'Sửa khe co giãn Tuyến ĐH.05 — Vĩnh Lộc B (Km02+180)',
    crewLeader: 'Phan Văn Nam',
    pmName: 'Trần Văn Nam',
    area: '8.5 m',
    method: 'Vệ sinh khe, đục tẩy mép vỡ, đổ bù bê tông xi măng mác 300',
    deadline: 'Trong 3 ngày',
  },
  '#WO-112': {
    woCode: '#WO-112',
    roadTitle: 'Gia cố vai đường Tuyến ĐH.05 — Tân Kiên (Km03+100)',
    crewLeader: 'Lê Minh Tuấn',
    pmName: 'Lê Minh Tuấn',
    area: '10.2 m²',
    method: 'Gia cố mái taluy bằng đá hộc, quét dính bám Aside',
    deadline: 'Trong 7 ngày',
  },
  '#WO-109': {
    woCode: '#WO-109',
    roadTitle: 'Nâng cổ hố ga Tuyến ĐH.05 — Vĩnh Lộc B (Km01+450)',
    crewLeader: 'Vũ Quốc Khánh',
    pmName: 'Nguyễn Thùy Lan',
    area: '6.5 m²',
    method: 'Đào bỏ phần nền lún, đổ bù bê tông xi măng mác 300',
    deadline: 'Trong 7 ngày',
  },
  '#WO-104': {
    woCode: '#WO-104',
    roadTitle: 'Thay tấm bê tông nứt Tuyến ĐH.05 — Vĩnh Lộc B (Km01+200)',
    crewLeader: 'Hoàng Văn Thái',
    pmName: 'Lê Minh Tuấn',
    area: '18.0 m²',
    method: 'Cắt viền tấm, đục tẩy, quét dính bám SikaLatex, đổ bù bê tông mác 300',
    deadline: 'Trong 5 ngày',
  },
};

export default function SupervisorSignoffScreen() {
  const params = useLocalSearchParams<{ code?: string; woCode?: string }>();
  
  // Resolve initial work order code from params (could be '#DF-0229' or '#WO-115')
  const resolveInitialWo = () => {
    if (params.woCode && SIGNOFF_DATA[params.woCode]) return params.woCode;
    if (params.code && SIGNOFF_DATA[params.code]) return params.code;
    if (params.code === '#DF-0229') return '#WO-115';
    if (params.code === '#DF-0219') return '#WO-112';
    if (params.code === '#DF-0215') return '#WO-109';
    if (params.code === '#DF-0210') return '#WO-104';
    return '#WO-118';
  };

  const [selectedWo, setSelectedWo] = useState<string>(resolveInitialWo());
  const [confirmed, setConfirmed] = useState(true);
  const [signed, setSigned] = useState(true);
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    setSelectedWo(resolveInitialWo());
  }, [params.code, params.woCode]);

  const currentWo = SIGNOFF_DATA[selectedWo] ?? SIGNOFF_DATA['#WO-118'];

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2000);
  };

  const handleSignoff = () => {
    if (!confirmed) {
      showToast('Vui lòng tích xác nhận điều khoản đóng đợt sửa chữa!');
      return;
    }
    setLoading(true);
    showToast(`Đã ký số và hoàn tất thủ tục đóng đợt sửa chữa ${currentWo.woCode}!`);
    setTimeout(() => {
      setLoading(false);
      router.push('/(sup)/home');
    }, 1000);
  };

  const handleRequestReview = () => {
    showToast(`Đã gửi thông báo yêu cầu kiểm tra lại hồ sơ cho PM ${currentWo.pmName}`);
    setTimeout(() => {
      router.push('/(sup)/home');
    }, 1000);
  };

  return (
    <SafeAreaScreen scroll>
      {/* Top App Bar */}
      <View style={styles.topBar}>
        <Pressable
          style={styles.circleIconButton}
          onPress={() => router.push('/(sup)/home')}
          accessibilityRole="button"
        >
          <MaterialIcons name="arrow-back" size={20} color={colors.secondary} />
        </Pressable>

        <View style={styles.topBarCenter}>
          <Text style={[typography.titleMd, styles.topBarTitle]}>
            Nghiệm thu hoàn tất {currentWo.woCode}
          </Text>
          <Text style={[typography.caption, styles.topBarSub]}>Ký duyệt đóng đợt sửa chữa</Text>
        </View>

        <View style={styles.eligibleBadge}>
          <Text style={styles.eligibleBadgeText}>ĐỦ ĐIỀU KIỆN</Text>
        </View>
      </View>

      {/* Toast Alert */}
      {toastMsg && (
        <View style={styles.toast}>
          <MaterialIcons name="info" size={18} color={colors.surface} />
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      )}

      {/* Work Order Selector Bar */}
      <View style={styles.selectorBar}>
        <Text style={[typography.labelSm, styles.selectorTitle]}>CHỌN ĐỢT SỬA CHỮA NGHIỆM THU:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorScroll}>
          {Object.values(SIGNOFF_DATA).map((wo) => {
            const isSelected = wo.woCode === selectedWo;
            return (
              <Pressable
                key={wo.woCode}
                style={[styles.woChip, isSelected && styles.woChipActive]}
                onPress={() => setSelectedWo(wo.woCode)}
              >
                <Text style={[styles.woChipCode, isSelected && styles.woChipCodeActive]}>
                  {wo.woCode}
                </Text>
                <Text style={[styles.woChipRoad, isSelected && styles.woChipRoadActive]} numberOfLines={1}>
                  {wo.roadTitle.split('—')[0].trim()}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Dossier Overview Card */}
      <Card style={styles.dossierCard}>
        <View style={styles.dossierTop}>
          <View>
            <Text style={[typography.caption, styles.dossierLabel]}>HỒ SƠ NGHIỆM THU HOÀN CÔNG</Text>
            <Text style={[typography.titleMd, styles.dossierTitle]}>
              {currentWo.roadTitle}
            </Text>
          </View>
          <View style={styles.woBadge}>
            <Text style={styles.woBadgeText}>{currentWo.woCode}</Text>
          </View>
        </View>

        <View style={styles.dossierMeta}>
          <Text style={[typography.caption, styles.dossierLabel]}>
            Phương án kỹ thuật đã thực hiện: {currentWo.method}
          </Text>
          <Text style={[typography.caption, styles.dossierLabel]}>
            Khối lượng sửa chữa: {currentWo.area} • Thời hạn: {currentWo.deadline}
          </Text>
        </View>

        <View style={styles.checklist}>
          <View style={styles.checkItem}>
            <MaterialIcons name="check-circle" size={18} color={colors.success} />
            <Text style={[typography.bodyMd, styles.checkText]}>
              Đội trưởng <Text style={styles.boldText}>{currentWo.crewLeader}</Text> đã nộp báo cáo hoàn thành & ký số (14:35)
            </Text>
          </View>

          <View style={styles.checkItem}>
            <MaterialIcons name="check-circle" size={18} color={colors.success} />
            <Text style={[typography.bodyMd, styles.checkText]}>
              PM <Text style={styles.boldText}>{currentWo.pmName}</Text> đã kiểm tra thực tế đạt tiêu chuẩn êm thuận (15:10)
            </Text>
          </View>

          <View style={styles.checkItem}>
            <MaterialIcons name="check-circle" size={18} color={colors.success} />
            <Text style={[typography.bodyMd, styles.checkText]}>
              Đầy đủ 4 cặp ảnh Trước/Sau Watermark GPS & video flycam nghiệm thu
            </Text>
          </View>
        </View>
      </Card>

      {/* Supervisor Formal Sign-off Box */}
      <Card style={styles.signoffCard}>
        <View style={styles.signoffHeader}>
          <Text style={[typography.labelSm, styles.signoffHeaderTitle]}>
            XÁC NHẬN CỦA GIÁM SÁT TRƯỞNG:
          </Text>
          <View style={styles.authBadge}>
            <Text style={styles.authBadgeText}>Ủy quyền chính thức</Text>
          </View>
        </View>

        <View style={styles.engineerBox}>
          <View>
            <Text style={[typography.titleMd, styles.engineerName]}>Kỹ sư Trần Thế Hùng</Text>
            <Text style={[typography.caption, styles.engineerRole]}>
              Giám sát trưởng Ban QLDA Miền Đông • Mã NV: <Text style={styles.boldText}>NV-8842</Text>
            </Text>
          </View>
          <View style={styles.lockBadge}>
            <MaterialIcons name="verified-user" size={14} color={colors.success} />
            <Text style={styles.lockText}>Bảo mật</Text>
          </View>
        </View>

        {/* Commitment Checkbox */}
        <Pressable
          style={[styles.confirmBox, confirmed && styles.confirmBoxActive]}
          onPress={() => setConfirmed(!confirmed)}
        >
          <View style={[styles.checkbox, confirmed && styles.checkboxActive]}>
            {confirmed && <MaterialIcons name="check" size={14} color={colors.surface} />}
          </View>
          <Text style={[typography.bodyMd, styles.confirmText]}>
            Tôi xác nhận đợt sửa <Text style={styles.boldText}>{currentWo.woCode}</Text> đã hoàn thành đạt chuẩn kỹ thuật và đồng ý đóng đợt để chuyển trạng thái tuyến đường về <Text style={styles.boldText}>An toàn / Bình thường</Text>.
          </Text>
        </Pressable>

        {/* Digital Signature Area */}
        <View style={styles.sigArea}>
          <View style={styles.sigHeader}>
            <Text style={[typography.caption, styles.sigLabel]}>Chữ ký điện tử:</Text>
            <Pressable onPress={() => setSigned(true)}>
              <Text style={styles.reSignText}>Ký lại</Text>
            </Pressable>
          </View>

          <View style={styles.sigCanvas}>
            {signed ? (
              <View style={styles.sigPreview}>
                <Text style={styles.sigDrawText}>Tran The Hung</Text>
                <Text style={styles.sigHash}>Mã xác thực: SHA256-SIGN-8842-{currentWo.woCode.replace('#', '')}-2026</Text>
              </View>
            ) : (
              <Text style={styles.sigPlaceholder}>Vẽ chữ ký tay tại đây...</Text>
            )}
          </View>
        </View>
      </Card>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <Button
          variant="primary"
          title={`Xác nhận hoàn thành & Đóng đợt ${currentWo.woCode}`}
          loading={loading}
          onPress={handleSignoff}
        />

        <Pressable
          style={styles.requestReviewBtn}
          onPress={handleRequestReview}
          accessibilityRole="button"
        >
          <MaterialIcons name="refresh" size={18} color={colors.secondary} />
          <Text style={[typography.labelLg, styles.requestReviewText]}>
            Yêu cầu kiểm tra lại / Làm lại
          </Text>
        </Pressable>
      </View>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  circleIconButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarCenter: {
    alignItems: 'center',
  },
  topBarTitle: {
    color: colors.neutral,
    fontWeight: 'bold',
  },
  topBarSub: {
    color: colors.secondary,
  },
  eligibleBadge: {
    backgroundColor: '#E9F7EC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  eligibleBadgeText: {
    color: colors.success,
    fontSize: 9,
    fontWeight: 'bold',
  },
  toast: {
    backgroundColor: colors.neutral,
    padding: spacing.sm,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  toastText: {
    color: colors.surface,
    fontSize: 12,
    flex: 1,
  },
  selectorBar: {
    marginBottom: spacing.sm,
  },
  selectorTitle: {
    color: colors.secondary,
    marginBottom: 6,
  },
  selectorScroll: {
    gap: spacing.xs,
    paddingVertical: 2,
  },
  woChip: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 110,
    gap: 2,
  },
  woChipActive: {
    borderColor: colors.primary,
    backgroundColor: '#FFFDF7',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  woChipCode: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.neutral,
  },
  woChipCodeActive: {
    color: colors.primaryDark,
  },
  woChipRoad: {
    fontSize: 10,
    color: colors.secondary,
  },
  woChipRoadActive: {
    color: colors.neutral,
    fontWeight: '500',
  },
  dossierCard: {
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  dossierTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.xs,
  },
  dossierLabel: {
    color: colors.secondary,
  },
  dossierTitle: {
    color: colors.neutral,
    fontWeight: 'bold',
    marginTop: 2,
  },
  woBadge: {
    backgroundColor: '#FEF3E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  woBadgeText: {
    color: colors.brandGold,
    fontWeight: 'bold',
    fontSize: 12,
  },
  dossierMeta: {
    gap: 4,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  checklist: {
    gap: 8,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  checkText: {
    color: colors.secondary,
    flex: 1,
    lineHeight: 18,
    fontSize: 13,
  },
  boldText: {
    fontWeight: 'bold',
    color: colors.neutral,
  },
  signoffCard: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  signoffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  signoffHeaderTitle: {
    color: colors.secondary,
  },
  authBadge: {
    backgroundColor: '#E9F7EC',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  authBadgeText: {
    color: colors.success,
    fontSize: 10,
    fontWeight: 'bold',
  },
  engineerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  engineerName: {
    color: colors.neutral,
    fontWeight: 'bold',
  },
  engineerRole: {
    color: colors.secondary,
    marginTop: 2,
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E9F7EC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  lockText: {
    color: colors.success,
    fontSize: 10,
    fontWeight: 'bold',
  },
  confirmBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: '#FEF3E2',
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  confirmBoxActive: {
    borderColor: colors.primary,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  confirmText: {
    color: colors.neutral,
    flex: 1,
    lineHeight: 19,
    fontSize: 13,
  },
  sigArea: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
    gap: 4,
  },
  sigHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sigLabel: {
    color: colors.secondary,
  },
  reSignText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  sigCanvas: {
    height: 70,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sigPreview: {
    alignItems: 'center',
  },
  sigDrawText: {
    fontFamily: 'Roboto',
    fontSize: 22,
    fontStyle: 'italic',
    color: colors.primaryDark,
    fontWeight: 'bold',
  },
  sigHash: {
    fontSize: 9,
    color: colors.secondary,
    marginTop: 2,
    fontFamily: 'Roboto',
  },
  sigPlaceholder: {
    color: colors.secondary,
    fontSize: 12,
  },
  actionContainer: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  requestReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 12,
    minHeight: 48,
  },
  requestReviewText: {
    color: colors.secondary,
  },
});

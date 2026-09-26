import React, { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Card } from '../../src/components/Card';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { useAuthStore } from '../../src/store/auth';

type ProfileTab = 'personal' | 'governance';

export default function SupervisorProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [activeTab, setActiveTab] = useState<ProfileTab>('personal');
  const [urgentAlerts, setUrgentAlerts] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [legalHoldActive, setLegalHoldActive] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2200);
  };

  const handleLogout = () => {
    logout();
    router.replace('/(auth)');
  };

  return (
    <SafeAreaScreen scroll>
      {/* Toast Alert */}
      {toastMsg && (
        <View style={styles.toast}>
          <MaterialIcons name="info" size={18} color={colors.surface} />
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      )}

      {/* Profile Header Card */}
      <View style={styles.headerBox}>
        <View style={styles.avatarWrap}>
          <MaterialIcons name="person" size={44} color={colors.primaryDark} />
          <View style={styles.badgeVerified}>
            <MaterialIcons name="check" size={12} color={colors.surface} />
          </View>
        </View>

        <Text style={[typography.titleLg, styles.engineerName]}>
          {user?.full_name ?? 'Kỹ sư Trần Thế Hùng'}
        </Text>

        <View style={styles.roleTag}>
          <MaterialIcons name="security" size={12} color={colors.brandGold} />
          <Text style={styles.roleTagText}>SUPERVISOR • GIÁM SÁT TRƯỞNG</Text>
        </View>

        <Text style={[typography.caption, styles.metaRole]}>
          Ban QLDA Miền Đông • Mã NV: {user?.employee_code ?? 'NV-8842'}
        </Text>
        <Text style={[typography.caption, styles.metaEmail]}>
          hung.tran@hoanghai.vn • 15 năm kinh nghiệm
        </Text>
      </View>

      {/* 3 Stats Overview */}
      <Card style={styles.statsCard}>
        <View style={styles.statCol}>
          <Text style={[typography.headlineLg, styles.statNumber]}>4</Text>
          <Text style={[typography.caption, styles.statLabel]}>Gói thầu</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statCol}>
          <Text style={[typography.headlineLg, styles.statNumber]}>3</Text>
          <Text style={[typography.caption, styles.statLabel]}>Đội sửa chữa</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statCol}>
          <Text style={[typography.headlineLg, styles.statGold]}>99.2%</Text>
          <Text style={[typography.caption, styles.statLabel]}>Tiến độ</Text>
        </View>
      </Card>

      {/* Merged Tabs: Tab 1 (Hồ sơ) vs Tab 2 (M-SUP-07 Quản trị TCVN & Legal Hold) */}
      <View style={styles.tabSwitcher}>
        <Pressable
          style={[styles.switchBtn, activeTab === 'personal' && styles.switchBtnActive]}
          onPress={() => setActiveTab('personal')}
        >
          <MaterialIcons
            name="person-outline"
            size={16}
            color={activeTab === 'personal' ? colors.primaryDark : colors.secondary}
          />
          <Text
            style={[styles.switchBtnText, activeTab === 'personal' && styles.switchBtnTextActive]}
          >
            Hồ sơ cá nhân
          </Text>
        </Pressable>

        <Pressable
          style={[styles.switchBtn, activeTab === 'governance' && styles.switchBtnActive]}
          onPress={() => setActiveTab('governance')}
        >
          <MaterialIcons
            name="settings"
            size={16}
            color={activeTab === 'governance' ? colors.primaryDark : colors.secondary}
          />
          <Text
            style={[styles.switchBtnText, activeTab === 'governance' && styles.switchBtnTextActive]}
          >
            Quản trị TCVN & Pháp lý
          </Text>
        </Pressable>
      </View>

      {/* TAB 1: Hồ sơ cá nhân & Cài đặt */}
      {activeTab === 'personal' && (
        <View style={styles.tabContent}>
          {/* Section 1: Phạm vi quản lý */}
          <Text style={[typography.labelSm, styles.groupTitle]}>
            THÔNG TIN CÔNG VIỆC & PHẠM VI QUẢN LÝ
          </Text>
          <Card style={styles.menuCard}>
            <Pressable
              style={styles.menuRow}
              onPress={() => showToast('Mở danh sách 4 gói thầu hạ tầng bảo hành')}
            >
              <View style={styles.menuLeft}>
                <MaterialIcons name="folder-open" size={18} color={colors.secondary} />
                <View>
                  <Text style={[typography.bodyMd, styles.menuMainText]}>Dự án phụ trách</Text>
                  <Text style={[typography.caption, styles.menuSubNote]}>
                    4 gói thầu hạ tầng đang bảo hành
                  </Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={16} color={colors.secondary} />
            </Pressable>

            <View style={styles.rowDivider} />

            <Pressable
              style={styles.menuRow}
              onPress={() => showToast('Mở danh sách 3 đội Repair Crew')}
            >
              <View style={styles.menuLeft}>
                <MaterialIcons name="people-outline" size={18} color={colors.secondary} />
                <View>
                  <Text style={[typography.bodyMd, styles.menuMainText]}>Đội thi công & sửa chữa</Text>
                  <Text style={[typography.caption, styles.menuSubNote]}>
                    3 đội Repair Crew thường trực
                  </Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={16} color={colors.secondary} />
            </Pressable>

            <View style={styles.rowDivider} />

            <Pressable
              style={styles.menuRow}
              onPress={() => router.push('/(sup)/risk')}
            >
              <View style={styles.menuLeft}>
                <MaterialIcons name="location-on" size={18} color={colors.secondary} />
                <View>
                  <Text style={[typography.bodyMd, styles.menuMainText]}>Khu vực giám sát</Text>
                  <Text style={[typography.caption, styles.menuSubNote]}>
                    Vĩnh Lộc B, Cầu Bà Lát, Tân Kiên
                  </Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={16} color={colors.secondary} />
            </Pressable>
          </Card>

          {/* Section 2: Cài đặt & Bảo mật */}
          <Text style={[typography.labelSm, styles.groupTitle]}>CÀI ĐẶT ỨNG DỤNG & BẢO MẬT</Text>
          <Card style={styles.menuCard}>
            <View style={styles.menuRow}>
              <View style={styles.menuLeft}>
                <MaterialIcons name="notifications-none" size={18} color={colors.secondary} />
                <View>
                  <Text style={[typography.bodyMd, styles.menuMainText]}>
                    Thông báo phê duyệt khẩn cấp
                  </Text>
                  <Text style={[typography.caption, styles.menuSubNote]}>
                    Âm lượng chuông cao cho sự cố cấp bách
                  </Text>
                </View>
              </View>
              <Switch
                value={urgentAlerts}
                onValueChange={setUrgentAlerts}
                thumbColor={urgentAlerts ? colors.primary : colors.surface}
                trackColor={{ false: colors.border, true: '#FEF3E2' }}
              />
            </View>

            <View style={styles.rowDivider} />

            <Pressable
              style={styles.menuRow}
              onPress={() => router.push('/(auth)/force-change-password')}
            >
              <View style={styles.menuLeft}>
                <MaterialIcons name="lock-outline" size={18} color={colors.secondary} />
                <View>
                  <Text style={[typography.bodyMd, styles.menuMainText]}>Đổi mật khẩu</Text>
                  <Text style={[typography.caption, styles.menuSubNote]}>
                    Bảo mật tài khoản & sinh trắc học
                  </Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={16} color={colors.secondary} />
            </Pressable>

            <View style={styles.rowDivider} />

            <View style={styles.menuRow}>
              <View style={styles.menuLeft}>
                <MaterialIcons name="dark-mode" size={18} color={colors.secondary} />
                <Text style={[typography.bodyMd, styles.menuMainText]}>Chế độ tối (Dark Mode)</Text>
              </View>
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                thumbColor={darkMode ? colors.primary : colors.surface}
                trackColor={{ false: colors.border, true: '#FEF3E2' }}
              />
            </View>
          </Card>
        </View>
      )}

      {/* TAB 2: Quản trị TCVN & Legal Hold (M-SUP-07 GỘP) */}
      {activeTab === 'governance' && (
        <View style={styles.tabContent}>
          {/* Module 1: TCVN Standards */}
          <Text style={[typography.labelSm, styles.groupTitle]}>
            TIÊU CHUẨN KỸ THUẬT QUỐC GIA (TCVN)
          </Text>
          <Card style={styles.govCard}>
            <View style={styles.govHeader}>
              <MaterialIcons name="military-tech" size={18} color={colors.primary} />
              <Text style={[typography.labelSm, styles.govTitle]}>
                DANH MỤC QUY CHUẨN ÁP DỤNG
              </Text>
            </View>

            <View style={styles.standardItem}>
              <View style={styles.stdCodeBadge}>
                <Text style={styles.stdCodeText}>TCVN 8819:2011</Text>
              </View>
              <Text style={[typography.caption, styles.stdDesc]}>
                Bê tông xi măng mác 300 cho bê tông nông thôn — Yêu cầu độ bám dính và độ đồng đều.
              </Text>
            </View>

            <View style={styles.standardItem}>
              <View style={styles.stdCodeBadge}>
                <Text style={styles.stdCodeText}>TCVN 8864:2011</Text>
              </View>
              <Text style={[typography.caption, styles.stdDesc]}>
                Mặt đường ô tô — Xác định độ bằng phẳng bằng thước dài 3m và chỉ số IRI.
              </Text>
            </View>
          </Card>

          {/* Module 2: AI Tolerance Config */}
          <Text style={[typography.labelSm, styles.groupTitle]}>CẤU HÌNH DUNG SAI KÍCH THƯỚC AI</Text>
          <Card style={styles.govCard}>
            <View style={styles.toleranceRow}>
              <View style={styles.toleranceInfo}>
                <Text style={[typography.bodyMd, styles.toleranceTitle]}>Sai số hình học tối đa</Text>
                <Text style={[typography.caption, styles.toleranceSub]}>
                  Ngưỡng sai lệch kích thước chấp nhận được giữa AI và thước ngắm
                </Text>
              </View>
              <View style={styles.toleranceValBox}>
                <Text style={styles.toleranceValText}>±15%</Text>
              </View>
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.toleranceRow}>
              <View style={styles.toleranceInfo}>
                <Text style={[typography.bodyMd, styles.toleranceTitle]}>Ngưỡng phân loại báo động</Text>
                <Text style={[typography.caption, styles.toleranceSub]}>
                  Độ sâu lún vệt bánh xe {'>'} 5.0cm tự động kích hoạt còi báo động đỏ
                </Text>
              </View>
              <View style={styles.toleranceValBox}>
                <Text style={styles.toleranceValText}>{'>'} 5.0cm</Text>
              </View>
            </View>
          </Card>

          {/* Module 3: Legal Hold Configuration */}
          <Text style={[typography.labelSm, styles.groupTitle]}>
            KHÓA HỒ SƠ TRANH CHẤP PHÁP LÝ (LEGAL HOLD)
          </Text>
          <Card style={styles.legalHoldCard}>
            <View style={styles.legalHoldHeader}>
              <MaterialIcons name="lock" size={20} color={colors.brandGold} />
              <View style={styles.legalHoldInfo}>
                <Text style={[typography.titleMd, styles.legalHoldTitle]}>Chế độ bảo lưu bất biến</Text>
                <Text style={[typography.caption, styles.legalHoldSub]}>
                  Ngăn chặn xóa tự động đối với hồ sơ kiểm định đang có khiếu nại bảo hành
                </Text>
              </View>
              <Switch
                value={legalHoldActive}
                onValueChange={(val) => {
                  setLegalHoldActive(val);
                  showToast(
                    val
                      ? 'Đã kích hoạt Legal Hold khóa hồ sơ tranh chấp'
                      : 'Đã gỡ bỏ chế độ khóa Legal Hold'
                  );
                }}
                thumbColor={legalHoldActive ? colors.primary : colors.surface}
                trackColor={{ false: colors.border, true: '#FEF3E2' }}
              />
            </View>

            <View style={styles.lockedItem}>
              <MaterialIcons name="lock" size={16} color={colors.brandGold} />
              <Text style={styles.lockedItemText}>
                01 gói thầu đang áp dụng Legal Hold: Tuyến ĐH.05 Gói thầu XL-01 (Đến 2028)
              </Text>
            </View>
          </Card>
        </View>
      )}

      {/* Logout Action */}
      <View style={styles.logoutSection}>
        <Pressable style={styles.logoutButton} onPress={handleLogout} accessibilityRole="button">
          <MaterialIcons name="logout" size={18} color={colors.error} />
          <Text style={[typography.labelLg, styles.logoutButtonText]}>Đăng xuất tài khoản</Text>
        </Pressable>

        <Text style={[typography.caption, styles.footerVersion]}>
          Hoàng Hải Field v2.4.1 (Build 2026.09) • Hệ thống Giám sát bảo hành Hoàng Hải
        </Text>
      </View>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
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
  headerBox: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  avatarWrap: {
    width: 84,
    height: 84,
    borderRadius: radius.full,
    backgroundColor: '#FEF3E2',
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: spacing.xs,
  },
  badgeVerified: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: radius.full,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  engineerName: {
    color: colors.neutral,
    marginTop: 2,
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3E2',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
    marginTop: 4,
  },
  roleTagText: {
    color: colors.brandGold,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  metaRole: {
    color: colors.neutral,
    fontWeight: '500',
    marginTop: 4,
  },
  metaEmail: {
    color: colors.secondary,
    marginTop: 1,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: '#F4F6F9',
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    color: colors.neutral,
  },
  statGold: {
    color: colors.brandGold,
  },
  statLabel: {
    color: colors.secondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 3,
    marginBottom: spacing.md,
  },
  switchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.sm,
  },
  switchBtnActive: {
    backgroundColor: colors.surfaceAlt,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  switchBtnText: {
    ...typography.labelSm,
    color: colors.secondary,
  },
  switchBtnTextActive: {
    ...typography.labelSm,
    color: colors.primaryDark,
    fontWeight: 'bold',
  },
  tabContent: {
    gap: spacing.sm,
  },
  groupTitle: {
    color: colors.secondary,
    marginTop: spacing.xs,
  },
  menuCard: {
    padding: 0,
    marginBottom: spacing.xs,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    marginRight: spacing.xs,
  },
  menuMainText: {
    color: colors.neutral,
  },
  menuSubNote: {
    color: colors.secondary,
    marginTop: 1,
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  govCard: {
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  govHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  govTitle: {
    color: colors.secondary,
  },
  standardItem: {
    gap: 4,
    backgroundColor: colors.surfaceAlt,
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  stdCodeBadge: {
    backgroundColor: '#FEF3E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  stdCodeText: {
    color: colors.primaryDark,
    fontWeight: 'bold',
    fontSize: 11,
  },
  stdDesc: {
    color: colors.secondary,
    lineHeight: 16,
  },
  toleranceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toleranceInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  toleranceTitle: {
    color: colors.neutral,
  },
  toleranceSub: {
    color: colors.secondary,
    marginTop: 1,
  },
  toleranceValBox: {
    backgroundColor: '#FEF3E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  toleranceValText: {
    color: colors.primaryDark,
    fontWeight: 'bold',
    fontSize: 12,
  },
  legalHoldCard: {
    backgroundColor: '#FFFDF5',
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  legalHoldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  legalHoldInfo: {
    flex: 1,
  },
  legalHoldTitle: {
    color: colors.neutral,
    fontWeight: 'bold',
  },
  legalHoldSub: {
    color: colors.secondary,
    marginTop: 2,
  },
  lockedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3E2',
    padding: spacing.xs,
    borderRadius: radius.sm,
  },
  lockedItemText: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  logoutSection: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FDECEC',
    borderWidth: 1,
    borderColor: '#F8D7DA',
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  logoutButtonText: {
    color: colors.error,
    fontWeight: 'bold',
  },
  footerVersion: {
    textAlign: 'center',
    color: colors.secondary,
    marginTop: 2,
  },
});

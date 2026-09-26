import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Chip } from '../../src/components/Chip';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { useAuthStore } from '../../src/store/auth';

type ProfileTab = 'personal' | 'governance';

interface ProjectWarranty {
  id: string;
  code: string;
  name: string;
  contractor: string;
  warrantyPeriod: string;
  status: 'RỦI RO CAO' | 'ỔN ĐỊNH' | 'ĐANG SỬA CHỮA' | 'LEGAL HOLD';
  variant: 'severity-high' | 'severity-low' | 'severity-medium' | 'status-pending';
}

const PROJECTS_DATA: ProjectWarranty[] = [
  {
    id: '1',
    code: 'GÓI THẦU XL-01',
    name: 'Tuyến ĐH.05 — Cầu Bà Lát (Km01+850)',
    contractor: 'Công ty Cổ phần Xây dựng Hoàng Hải',
    warrantyPeriod: '12/2024 — 12/2027 (36 tháng)',
    status: 'RỦI RO CAO',
    variant: 'severity-high',
  },
  {
    id: '2',
    code: 'GÓI THẦU XL-02',
    name: 'Tuyến ĐH.05 — Vĩnh Lộc B (Km02+180)',
    contractor: 'Tổng công ty Xây dựng CIENCO 4',
    warrantyPeriod: '06/2024 — 06/2027 (36 tháng)',
    status: 'ỔN ĐỊNH',
    variant: 'severity-low',
  },
  {
    id: '3',
    code: 'GÓI THẦU XL-03',
    name: 'Tuyến ĐH.05 — Tân Kiên (Km03+100)',
    contractor: 'Công ty CP Đầu tư & Xây dựng Thăng Long',
    warrantyPeriod: '09/2023 — 09/2026 (36 tháng)',
    status: 'ĐANG SỬA CHỮA',
    variant: 'severity-medium',
  },
  {
    id: '4',
    code: 'GÓI THẦU XL-04',
    name: 'Tuyến ĐH.05 — Vĩnh Lộc B (Km01+450)',
    contractor: 'Công ty Cổ phần Xây dựng Hoàng Hải',
    warrantyPeriod: '03/2025 — 03/2028 (36 tháng)',
    status: 'LEGAL HOLD',
    variant: 'status-pending',
  },
];

interface RepairCrew {
  id: string;
  name: string;
  leader: string;
  workersCount: number;
  phone: string;
  area: string;
  status: 'Đang thi công' | 'Sẵn sàng điều động';
}

const CREWS_DATA: RepairCrew[] = [
  {
    id: '1',
    name: 'Đội sửa chữa số 1 (Vĩnh Lộc)',
    leader: 'Trần Văn Vượng',
    workersCount: 8,
    phone: '0912.345.678',
    area: 'Tuyến Km01+000 đến Km02+500',
    status: 'Đang thi công',
  },
  {
    id: '2',
    name: 'Đội sửa chữa số 2 (Cầu Bà Lát)',
    leader: 'Phạm Quốc Toàn',
    workersCount: 6,
    phone: '0988.765.432',
    area: 'Khu vực cầu dây văng & mố cầu bờ Nam',
    status: 'Sẵn sàng điều động',
  },
  {
    id: '3',
    name: 'Đội phản ứng nhanh số 3 (Tân Kiên)',
    leader: 'Vũ Đình Hưng',
    workersCount: 5,
    phone: '0903.112.233',
    area: 'Xử lý ổ gà cấp bách & gia cố sạt lở vai',
    status: 'Sẵn sàng điều động',
  },
];

interface TcvnStandard {
  code: string;
  title: string;
  scope: string;
  details: string;
}

const TCVN_DATA: TcvnStandard[] = [
  {
    code: 'TCVN 8819:2011',
    title: 'Mặt đường bê tông nhựa nóng — Yêu cầu thi công & nghiệm thu',
    scope: 'Bê tông xi măng mác 300 / Bê tông nhựa nóng cho đường nông thôn cấp IV',
    details:
      'Quy định độ dính bám SikaLatex/Aside, tỷ lệ cấp phối cốt liệu mác 300, cường độ nén sau 28 ngày đạt >= 30 MPa, độ êm thuận mặt đường sau khi bù hoàn thiện.',
  },
  {
    code: 'TCVN 8864:2011',
    title: 'Mặt đường ô tô — Xác định độ bằng phẳng bằng thước dài 3m',
    scope: 'Kiểm tra độ bằng phẳng và độ võng cục bộ khe co giãn tấm bê tông',
    details:
      'Khe hở dưới thước 3m không được vượt quá 5.0mm tại mọi điểm đo dọc và ngang tim đường. Chỉ số độ gồ ghề quốc tế IRI <= 3.2 m/km.',
  },
];

export default function SupervisorProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [activeTab, setActiveTab] = useState<ProfileTab>('personal');
  const [urgentAlerts, setUrgentAlerts] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [legalHoldActive, setLegalHoldActive] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Interactive Modals
  const [modalProjectsVisible, setModalProjectsVisible] = useState(false);
  const [modalCrewsVisible, setModalCrewsVisible] = useState(false);
  const [selectedTcvn, setSelectedTcvn] = useState<TcvnStandard | null>(null);
  const [modalToleranceVisible, setModalToleranceVisible] = useState(false);
  const [aiTolerance, setAiTolerance] = useState(15);
  const [alertDepth, setAlertDepth] = useState(5.0);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Sếp có chắc chắn muốn đăng xuất khỏi hệ thống Giám sát?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/(auth)');
        },
      },
    ]);
  };

  const handleCallCrew = (crew: RepairCrew) => {
    Alert.alert(
      `Liên hệ ${crew.name}`,
      `Đội trưởng: ${crew.leader}\nHotline: ${crew.phone}\nĐịa bàn: ${crew.area}`,
      [
        { text: 'Đóng', style: 'cancel' },
        {
          text: 'Gọi ngay',
          onPress: () => showToast(`📞 Đang gọi cho Đội trưởng ${crew.leader} (${crew.phone})...`),
        },
      ],
    );
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
          {user?.full_name ?? 'Trần Thế Hùng'}
        </Text>

        <View style={styles.roleTag}>
          <MaterialIcons name="security" size={12} color={colors.brandGold} />
          <Text style={styles.roleTagText}>SUPERVISOR • GIÁM SÁT TRƯỞNG</Text>
        </View>

        <Text style={[typography.caption, styles.metaRole]}>
          Ban QLDA Miền Đông • Mã NV: {user?.employee_code ?? 'HH-8842'}
        </Text>
        <Text style={[typography.caption, styles.metaEmail]}>
          hung.tran@hoanghai.vn • 15 năm kinh nghiệm
        </Text>
      </View>

      {/* 3 Stats Overview (All Clickable) */}
      <Card style={styles.statsCard}>
        <Pressable
          style={styles.statCol}
          onPress={() => setModalProjectsVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Xem 4 gói thầu"
        >
          <Text style={[typography.headlineLg, styles.statNumber]}>4</Text>
          <Text style={[typography.caption, styles.statLabel]}>Gói thầu</Text>
          <Text style={styles.statActionNote}>Chạm để xem</Text>
        </Pressable>

        <View style={styles.statDivider} />

        <Pressable
          style={styles.statCol}
          onPress={() => setModalCrewsVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Xem 3 đội sửa chữa"
        >
          <Text style={[typography.headlineLg, styles.statNumber]}>3</Text>
          <Text style={[typography.caption, styles.statLabel]}>Đội sửa chữa</Text>
          <Text style={styles.statActionNote}>Chạm để xem</Text>
        </Pressable>

        <View style={styles.statDivider} />

        <Pressable
          style={styles.statCol}
          onPress={() =>
            showToast('📊 Tiến độ bảo hành đạt 99.2% (18/18 việc nghiệm thu đạt chuẩn).')
          }
          accessibilityRole="button"
          accessibilityLabel="Xem tiến độ"
        >
          <Text style={[typography.headlineLg, styles.statGold]}>99.2%</Text>
          <Text style={[typography.caption, styles.statLabel]}>Tiến độ</Text>
          <Text style={styles.statActionNote}>Chi tiết</Text>
        </Pressable>
      </Card>

      {/* Merged Tabs: Tab 1 (Hồ sơ) vs Tab 2 (Quản trị TCVN & Legal Hold) */}
      <View style={styles.tabSwitcher}>
        <Pressable
          style={[styles.switchBtn, activeTab === 'personal' && styles.switchBtnActive]}
          onPress={() => setActiveTab('personal')}
          accessibilityRole="button"
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
          accessibilityRole="button"
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
              onPress={() => setModalProjectsVisible(true)}
              accessibilityRole="button"
            >
              <View style={styles.menuLeft}>
                <MaterialIcons name="folder-open" size={18} color={colors.primary} />
                <View>
                  <Text style={[typography.bodyMd, styles.menuMainText]}>Dự án phụ trách</Text>
                  <Text style={[typography.caption, styles.menuSubNote]}>
                    4 gói thầu hạ tầng đang bảo hành (Xem danh sách)
                  </Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={16} color={colors.secondary} />
            </Pressable>

            <View style={styles.rowDivider} />

            <Pressable
              style={styles.menuRow}
              onPress={() => setModalCrewsVisible(true)}
              accessibilityRole="button"
            >
              <View style={styles.menuLeft}>
                <MaterialIcons name="people-outline" size={18} color={colors.info} />
                <View>
                  <Text style={[typography.bodyMd, styles.menuMainText]}>Đội thi công & sửa chữa</Text>
                  <Text style={[typography.caption, styles.menuSubNote]}>
                    3 đội Repair Crew thường trực (Xem nhân sự & liên hệ)
                  </Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={16} color={colors.secondary} />
            </Pressable>

            <View style={styles.rowDivider} />

            <Pressable
              style={styles.menuRow}
              onPress={() => router.push('/(sup)/risk')}
              accessibilityRole="button"
            >
              <View style={styles.menuLeft}>
                <MaterialIcons name="location-on" size={18} color={colors.warning} />
                <View>
                  <Text style={[typography.bodyMd, styles.menuMainText]}>Khu vực giám sát</Text>
                  <Text style={[typography.caption, styles.menuSubNote]}>
                    Vĩnh Lộc B, Cầu Bà Lát, Tân Kiên (Mở bản đồ rủi ro)
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
                onValueChange={(val) => {
                  setUrgentAlerts(val);
                  showToast(
                    val
                      ? '🔔 Đã bật âm lượng cao cho sự cố cấp bách.'
                      : '🔕 Đã tắt âm lượng cao cho sự cố cấp bách.',
                  );
                }}
                thumbColor={urgentAlerts ? colors.primary : colors.surface}
                trackColor={{ false: colors.border, true: '#FEF3E2' }}
              />
            </View>

            <View style={styles.rowDivider} />

            <Pressable
              style={styles.menuRow}
              onPress={() => router.push('/(auth)/force-change-password')}
              accessibilityRole="button"
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
                <View>
                  <Text style={[typography.bodyMd, styles.menuMainText]}>Chế độ tối (Dark Mode)</Text>
                  <Text style={[typography.caption, styles.menuSubNote]}>
                    Tùy chỉnh độ tương phản ban đêm
                  </Text>
                </View>
              </View>
              <Switch
                value={darkMode}
                onValueChange={(val) => {
                  setDarkMode(val);
                  showToast(
                    val
                      ? '🌙 Chế độ tối đã được lưu vào tùy chọn giao diện.'
                      : '☀️ Đã chuyển về chế độ sáng tiêu chuẩn.',
                  );
                }}
                thumbColor={darkMode ? colors.primary : colors.surface}
                trackColor={{ false: colors.border, true: '#FEF3E2' }}
              />
            </View>
          </Card>
        </View>
      )}

      {/* TAB 2: Quản trị TCVN & Legal Hold */}
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
                DANH MỤC QUY CHUẨN ÁP DỤNG (CHẠM ĐỂ XEM CHI TIẾT)
              </Text>
            </View>

            {TCVN_DATA.map((tcvn) => (
              <Pressable
                key={tcvn.code}
                style={styles.standardItem}
                onPress={() => setSelectedTcvn(tcvn)}
                accessibilityRole="button"
              >
                <View style={styles.stdCodeRow}>
                  <View style={styles.stdCodeBadge}>
                    <Text style={styles.stdCodeText}>{tcvn.code}</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={16} color={colors.secondary} />
                </View>
                <Text style={[typography.bodyMd, styles.stdTitleText]}>{tcvn.title}</Text>
                <Text style={[typography.caption, styles.stdDesc]}>{tcvn.scope}</Text>
              </Pressable>
            ))}
          </Card>

          {/* Module 2: AI Tolerance Config */}
          <Text style={[typography.labelSm, styles.groupTitle]}>CẤU HÌNH DUNG SAI KÍCH THƯỚC AI</Text>
          <Card style={styles.govCard}>
            <Pressable
              style={styles.toleranceRow}
              onPress={() => setModalToleranceVisible(true)}
              accessibilityRole="button"
            >
              <View style={styles.toleranceInfo}>
                <Text style={[typography.bodyMd, styles.toleranceTitle]}>Sai số hình học tối đa</Text>
                <Text style={[typography.caption, styles.toleranceSub]}>
                  Ngưỡng sai lệch kích thước chấp nhận được giữa AI và thước ngắm (Chạm để chỉnh)
                </Text>
              </View>
              <View style={styles.toleranceValBox}>
                <Text style={styles.toleranceValText}>±{aiTolerance}%</Text>
              </View>
            </Pressable>

            <View style={styles.rowDivider} />

            <Pressable
              style={styles.toleranceRow}
              onPress={() => setModalToleranceVisible(true)}
              accessibilityRole="button"
            >
              <View style={styles.toleranceInfo}>
                <Text style={[typography.bodyMd, styles.toleranceTitle]}>Ngưỡng phân loại báo động</Text>
                <Text style={[typography.caption, styles.toleranceSub]}>
                  Độ sâu lún vệt bánh xe {'>'} {alertDepth.toFixed(1)}cm kích hoạt báo động đỏ
                </Text>
              </View>
              <View style={styles.toleranceValBox}>
                <Text style={styles.toleranceValText}>{'>'} {alertDepth.toFixed(1)}cm</Text>
              </View>
            </Pressable>
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
                      ? '🔒 Đã kích hoạt Legal Hold khóa hồ sơ tranh chấp'
                      : '🔓 Đã gỡ bỏ chế độ khóa Legal Hold',
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

      {/* ==================== MODAL 1: DANH SÁCH 4 GÓI THẦU ==================== */}
      <Modal
        visible={modalProjectsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalProjectsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[typography.titleMd, styles.modalTitle]}>Dự án & Gói thầu phụ trách</Text>
                <Text style={[typography.caption, styles.modalSub]}>
                  4 gói thầu hạ tầng đang trong thời hạn bảo hành
                </Text>
              </View>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setModalProjectsVisible(false)}
                accessibilityRole="button"
              >
                <MaterialIcons name="close" size={22} color={colors.neutral} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {PROJECTS_DATA.map((proj) => (
                <Card key={proj.id} style={styles.modalItemCard}>
                  <View style={styles.modalItemHeader}>
                    <Text style={styles.projCode}>{proj.code}</Text>
                    <Chip variant={proj.variant} label={proj.status} />
                  </View>

                  <Text style={[typography.titleMd, styles.projName]}>{proj.name}</Text>

                  <View style={styles.projMetaRow}>
                    <MaterialIcons name="business" size={14} color={colors.secondary} />
                    <Text style={[typography.caption, styles.projMetaText]}>
                      Nhà thầu: <Text style={styles.boldText}>{proj.contractor}</Text>
                    </Text>
                  </View>

                  <View style={styles.projMetaRow}>
                    <MaterialIcons name="event" size={14} color={colors.secondary} />
                    <Text style={[typography.caption, styles.projMetaText]}>
                      Thời hạn bảo hành: <Text style={styles.boldText}>{proj.warrantyPeriod}</Text>
                    </Text>
                  </View>
                </Card>
              ))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                variant="primary"
                title="Đóng danh sách"
                onPress={() => setModalProjectsVisible(false)}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================== MODAL 2: DANH SÁCH 3 ĐỘI SỬA CHỮA ==================== */}
      <Modal
        visible={modalCrewsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalCrewsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[typography.titleMd, styles.modalTitle]}>Đội thi công & sửa chữa</Text>
                <Text style={[typography.caption, styles.modalSub]}>
                  3 đội Repair Crew thường trực hiện trường
                </Text>
              </View>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setModalCrewsVisible(false)}
                accessibilityRole="button"
              >
                <MaterialIcons name="close" size={22} color={colors.neutral} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {CREWS_DATA.map((crew) => (
                <Card key={crew.id} style={styles.modalItemCard}>
                  <View style={styles.modalItemHeader}>
                    <Text style={[typography.titleMd, styles.crewName]}>{crew.name}</Text>
                    <Chip
                      variant={crew.status === 'Đang thi công' ? 'severity-medium' : 'severity-low'}
                      label={crew.status}
                    />
                  </View>

                  <View style={styles.crewInfoGrid}>
                    <View style={styles.crewInfoRow}>
                      <MaterialIcons name="person" size={14} color={colors.primary} />
                      <Text style={[typography.caption, styles.crewInfoText]}>
                        Đội trưởng: <Text style={styles.boldText}>{crew.leader}</Text>
                      </Text>
                    </View>

                    <View style={styles.crewInfoRow}>
                      <MaterialIcons name="groups" size={14} color={colors.secondary} />
                      <Text style={[typography.caption, styles.crewInfoText]}>
                        Quân số: <Text style={styles.boldText}>{crew.workersCount} thợ kỹ thuật</Text>
                      </Text>
                    </View>

                    <View style={styles.crewInfoRow}>
                      <MaterialIcons name="map" size={14} color={colors.secondary} />
                      <Text style={[typography.caption, styles.crewInfoText]}>
                        Địa bàn: <Text style={styles.boldText}>{crew.area}</Text>
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    style={styles.callCrewBtn}
                    onPress={() => handleCallCrew(crew)}
                    accessibilityRole="button"
                  >
                    <MaterialIcons name="phone" size={16} color={colors.primaryDark} />
                    <Text style={styles.callCrewText}>Hotline: {crew.phone} (Bấm gọi)</Text>
                  </Pressable>
                </Card>
              ))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                variant="primary"
                title="Đóng danh sách"
                onPress={() => setModalCrewsVisible(false)}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================== MODAL 3: CHI TIẾT TCVN ==================== */}
      <Modal
        visible={!!selectedTcvn}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedTcvn(null)}
      >
        <View style={styles.modalCenterOverlay}>
          <View style={styles.modalCenterBox}>
            <View style={styles.modalHeader}>
              <View style={styles.stdCodeBadge}>
                <Text style={styles.stdCodeText}>{selectedTcvn?.code}</Text>
              </View>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setSelectedTcvn(null)}
                accessibilityRole="button"
              >
                <MaterialIcons name="close" size={20} color={colors.neutral} />
              </Pressable>
            </View>

            <Text style={[typography.titleMd, styles.tcvnModalTitle]}>
              {selectedTcvn?.title}
            </Text>

            <View style={styles.tcvnSection}>
              <Text style={[typography.labelSm, styles.tcvnSectionLabel]}>PHẠM VI ÁP DỤNG:</Text>
              <Text style={[typography.caption, styles.tcvnSectionContent]}>
                {selectedTcvn?.scope}
              </Text>
            </View>

            <View style={styles.tcvnSection}>
              <Text style={[typography.labelSm, styles.tcvnSectionLabel]}>
                YÊU CẦU KỸ THUẬT NGHIỆM THU:
              </Text>
              <Text style={[typography.bodyMd, styles.tcvnSectionContent]}>
                {selectedTcvn?.details}
              </Text>
            </View>

            <Button
              variant="primary"
              title="Đã hiểu quy chuẩn"
              onPress={() => setSelectedTcvn(null)}
            />
          </View>
        </View>
      </Modal>

      {/* ==================== MODAL 4: CẤU HÌNH DUNG SAI AI ==================== */}
      <Modal
        visible={modalToleranceVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalToleranceVisible(false)}
      >
        <View style={styles.modalCenterOverlay}>
          <View style={styles.modalCenterBox}>
            <View style={styles.modalHeader}>
              <Text style={[typography.titleMd, styles.modalTitle]}>Cấu hình dung sai AI</Text>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setModalToleranceVisible(false)}
                accessibilityRole="button"
              >
                <MaterialIcons name="close" size={20} color={colors.neutral} />
              </Pressable>
            </View>

            <Text style={[typography.caption, styles.toleranceModalDesc]}>
              Thiết lập ngưỡng chấp nhận giữa ảnh flycam AI phát hiện và đo đạc thực tế của Kỹ sư.
            </Text>

            {/* Config 1: Tolerance % */}
            <View style={styles.configBlock}>
              <Text style={[typography.bodyMd, styles.configLabel]}>
                1. Sai số hình học tối đa: <Text style={styles.boldText}>±{aiTolerance}%</Text>
              </Text>
              <View style={styles.stepBtnRow}>
                {[10, 15, 20].map((val) => (
                  <Pressable
                    key={val}
                    style={[styles.stepBtn, aiTolerance === val && styles.stepBtnActive]}
                    onPress={() => setAiTolerance(val)}
                  >
                    <Text
                      style={[styles.stepBtnText, aiTolerance === val && styles.stepBtnTextActive]}
                    >
                      ±{val}%
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Config 2: Alarm Depth */}
            <View style={styles.configBlock}>
              <Text style={[typography.bodyMd, styles.configLabel]}>
                2. Ngưỡng báo động khẩn cấp: <Text style={styles.boldText}>{'>'} {alertDepth.toFixed(1)}cm</Text>
              </Text>
              <View style={styles.stepBtnRow}>
                {[4.0, 5.0, 6.0].map((val) => (
                  <Pressable
                    key={val}
                    style={[styles.stepBtn, alertDepth === val && styles.stepBtnActive]}
                    onPress={() => setAlertDepth(val)}
                  >
                    <Text
                      style={[styles.stepBtnText, alertDepth === val && styles.stepBtnTextActive]}
                    >
                      {'>'} {val.toFixed(1)}cm
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Button
              variant="primary"
              title="Lưu cấu hình quy chuẩn"
              onPress={() => {
                setModalToleranceVisible(false);
                showToast(`✅ Đã lưu cấu hình AI: Sai số ±${aiTolerance}%, Ngưỡng báo động >${alertDepth.toFixed(1)}cm`);
              }}
            />
          </View>
        </View>
      </Modal>
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
    paddingVertical: spacing.sm,
    backgroundColor: '#F4F6F9',
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 4,
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
  statActionNote: {
    fontSize: 9,
    color: colors.primaryDark,
    marginTop: 2,
    fontWeight: 'bold',
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
  stdCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  stdTitleText: {
    color: colors.neutral,
    fontWeight: '500',
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
  boldText: {
    fontWeight: 'bold',
    color: colors.neutral,
  },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.md,
    maxHeight: '82%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    color: colors.neutral,
    fontWeight: 'bold',
  },
  modalSub: {
    color: colors.secondary,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalScroll: {
    marginVertical: spacing.xs,
  },
  modalItemCard: {
    marginBottom: spacing.sm,
    gap: 6,
  },
  modalItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  projCode: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primaryDark,
  },
  projName: {
    color: colors.neutral,
  },
  projMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  projMetaText: {
    color: colors.secondary,
  },
  crewName: {
    color: colors.neutral,
  },
  crewInfoGrid: {
    gap: 4,
    marginVertical: 4,
  },
  crewInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  crewInfoText: {
    color: colors.secondary,
  },
  callCrewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF3E2',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: 8,
    marginTop: 4,
  },
  callCrewText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalFooter: {
    marginTop: spacing.sm,
  },

  /* Center Dialog Modal */
  modalCenterOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCenterBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    width: '100%',
    maxWidth: 380,
    gap: spacing.sm,
  },
  tcvnModalTitle: {
    color: colors.neutral,
    fontWeight: 'bold',
    marginTop: 4,
  },
  tcvnSection: {
    backgroundColor: colors.surfaceAlt,
    padding: spacing.sm,
    borderRadius: radius.sm,
    gap: 4,
  },
  tcvnSectionLabel: {
    color: colors.primaryDark,
    fontWeight: 'bold',
    fontSize: 11,
  },
  tcvnSectionContent: {
    color: colors.neutral,
    lineHeight: 20,
  },
  toleranceModalDesc: {
    color: colors.secondary,
    marginBottom: 4,
  },
  configBlock: {
    backgroundColor: colors.surfaceAlt,
    padding: spacing.sm,
    borderRadius: radius.sm,
    gap: 8,
  },
  configLabel: {
    color: colors.neutral,
  },
  stepBtnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stepBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  stepBtnActive: {
    backgroundColor: '#FEF3E2',
    borderColor: colors.primary,
  },
  stepBtnText: {
    fontSize: 12,
    color: colors.secondary,
    fontWeight: '600',
  },
  stepBtnTextActive: {
    color: colors.primaryDark,
    fontWeight: 'bold',
  },
});

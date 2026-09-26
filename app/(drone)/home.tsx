import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { Chip } from '../../src/components/Chip';
import { Button } from '../../src/components/Button';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { useAuthStore } from '../../src/store/auth';

interface DroneTask {
  code: string;
  displayCode: string;
  title: string;
  subtitle: string;
  priority: 'urgent' | 'pending';
  chipVariant: 'severity-high' | 'severity-medium' | 'severity-low';
  chipLabel: string;
  iconName: keyof typeof MaterialIcons.glyphMap;
  iconBg: string;
  iconColor: string;
}

export const INITIAL_DRONE_TASKS: DroneTask[] = [
  {
    code: '#REQ-KS-089',
    displayCode: 'Mã: KS-741',
    title: 'Tuyến ĐH.05 - Tân Kiên (Km03+100)',
    subtitle: 'Xói lở vai đường mép taluy âm • Cần ảnh 4K RGB & DSM (ODM)',
    priority: 'urgent',
    chipVariant: 'severity-high',
    chipLabel: 'KHẨN CẤP',
    iconName: 'warning',
    iconBg: '#FDECEC',
    iconColor: colors.error,
  },
  {
    code: '#REQ-KS-090',
    displayCode: 'Mã: KS-104',
    title: 'Tuyến ĐH.05 - Vĩnh Lộc B (Km01+200 - Km02+500)',
    subtitle: 'Kiểm tra ổ gà sâu & nứt tấm bê tông • 2.4 km',
    priority: 'pending',
    chipVariant: 'severity-medium',
    chipLabel: 'CHỜ KHẢO SÁT',
    iconName: 'explore',
    iconBg: '#FEF3E2',
    iconColor: colors.warning,
  },
  {
    code: '#REQ-KS-088',
    displayCode: 'Mã: KS-VD3',
    title: 'Tuyến ĐH.05 - Cầu Bà Lát (Km01+850)',
    subtitle: 'Ảnh trực quan 3D tiến độ thi công hạ tầng',
    priority: 'pending',
    chipVariant: 'severity-low',
    chipLabel: 'CHỜ KHẢO SÁT',
    iconName: 'alt-route',
    iconBg: '#FEF3E2',
    iconColor: colors.warning,
  },
];

export default function DroneHomeScreen() {
  const user = useAuthStore((state) => state.user);
  const [tasks, setTasks] = useState<DroneTask[]>(INITIAL_DRONE_TASKS);
  const [modalVisible, setModalVisible] = useState(false);
  const [newRoadName, setNewRoadName] = useState('');
  const [newReason, setNewReason] = useState('Sạt lở mép taluy âm sau bão');
  const [selectedDrone, setSelectedDrone] = useState('DJI Matrice 350 RTK');
  const [selectedAltitude, setSelectedAltitude] = useState('45m (AGL)');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleCreateAdhocTask = () => {
    if (!newRoadName.trim()) {
      showToast('⚠️ Vui lòng nhập tên đoạn tuyến khảo sát!');
      return;
    }

    const newTaskCode = `#REQ-KS-${Math.floor(100 + Math.random() * 900)}`;
    const newTask: DroneTask = {
      code: newTaskCode,
      displayCode: `Mã: KS-${Math.floor(700 + Math.random() * 100)}`,
      title: newRoadName.trim(),
      subtitle: `${newReason} • ${selectedAltitude}`,
      priority: 'urgent',
      chipVariant: 'severity-high',
      chipLabel: 'KHẨN CẤP',
      iconName: 'warning',
      iconBg: '#FDECEC',
      iconColor: colors.error,
    };

    setTasks([newTask, ...tasks]);
    setNewRoadName('');
    setModalVisible(false);
    showToast(`Đã tạo nhiệm vụ bay ngoài kế hoạch ${newTask.displayCode} thành công!`);
  };

  return (
    <SafeAreaScreen scroll header={<AppHeader subtitle="Trang chủ" />}>
      {/* Toast Alert */}
      {toastMsg && (
        <View style={styles.toast}>
          <MaterialIcons name="check-circle" size={18} color={colors.surface} />
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      )}

      {/* Greeting Header */}
      <View style={styles.greetingHeader}>
        <View style={styles.greetingTextGroup}>
          <Text style={[typography.headlineLg, styles.greetingName]}>
            Chào, {user?.full_name ? user.full_name.split(' ').pop() : 'Minh'}
          </Text>
          <Text style={[typography.caption, styles.greetingMeta]}>
            Kỹ thuật viên Drone • Đội Khảo sát Số 2
          </Text>
        </View>
        <View style={styles.readyBadge}>
          <View style={styles.readyDot} />
          <Text style={[typography.labelSm, styles.readyText]}>Sẵn sàng bay</Text>
        </View>
      </View>

      {/* Minimal Unified KPI & Telemetry Strip */}
      <Card style={styles.metricStripCard}>
        <View style={styles.metricMainRow}>
          <View style={styles.metricIconWrap}>
            <MaterialIcons name="flight-takeoff" size={24} color={colors.primary} />
          </View>
          <View style={styles.metricContent}>
            <Text style={[typography.headlineLg, styles.metricNumber]}>{tasks.length}</Text>
            <Text style={[typography.caption, styles.metricDesc]}>yêu cầu khảo sát hôm nay</Text>
          </View>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.telemetryStripRow}>
          <View style={styles.telemetryTag}>
            <MaterialIcons name="cloud-queue" size={15} color={colors.secondary} />
            <Text style={[typography.caption, styles.telemetryTagText]}>Gió 8.4 km/h • An toàn</Text>
          </View>
          <View style={styles.telemetryTag}>
            <MaterialIcons name="battery-charging-full" size={15} color={colors.success} />
            <Text style={[typography.caption, styles.telemetryTagText]}>Pin M350: 98% (4 cụm)</Text>
          </View>
        </View>
      </Card>

      {/* Quick Access Actions */}
      <View style={styles.quickAccessRow}>
        <Pressable
          style={styles.quickButton}
          onPress={() =>
            router.push({
              pathname: '/(drone)/upload',
              params: { code: '#REQ-KS-089' },
            })
          }
          accessibilityRole="button"
        >
          <MaterialIcons name="sd-card" size={18} color={colors.primaryDark} />
          <Text style={[typography.labelSm, styles.quickButtonText]}>Nạp thẻ SD</Text>
        </Pressable>

        <Pressable
          style={styles.quickButton}
          onPress={() =>
            router.push({
              pathname: '/(drone)/log',
              params: { code: '#REQ-KS-089' },
            })
          }
          accessibilityRole="button"
        >
          <MaterialIcons name="history" size={18} color={colors.primaryDark} />
          <Text style={[typography.labelSm, styles.quickButtonText]}>Nhật ký bay</Text>
        </Pressable>

        <Pressable
          style={styles.quickButton}
          onPress={() => router.push('/(drone)/sync')}
          accessibilityRole="button"
        >
          <MaterialIcons name="sync" size={18} color={colors.primaryDark} />
          <Text style={[typography.labelSm, styles.quickButtonText]}>Đồng bộ</Text>
        </Pressable>
      </View>

      {/* Section Tasks */}
      <View style={styles.sectionHeader}>
        <Text style={[typography.titleMd, styles.sectionTitle]}>Việc cần làm</Text>
        <Text style={[typography.caption, styles.seeAll]}>Ưu tiên theo tuyến</Text>
      </View>

      {/* Tasks List Matching Figma Image 1 */}
      <View style={styles.taskList}>
        {tasks.map((task) => (
          <Pressable
            key={task.code}
            onPress={() =>
              router.push({
                pathname: '/(drone)/request-detail',
                params: { code: task.code },
              })
            }
            accessibilityRole="button"
          >
            <Card style={styles.taskCardItem}>
              <View style={[styles.taskIconBox, { backgroundColor: task.iconBg }]}>
                <MaterialIcons name={task.iconName} size={20} color={task.iconColor} />
              </View>

              <View style={styles.taskContentBox}>
                <View style={styles.taskBadgeRow}>
                  <View
                    style={[
                      styles.figmaBadge,
                      {
                        backgroundColor:
                          task.chipVariant === 'severity-high' ? '#FDECEC' : '#FEF3E2',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.figmaBadgeText,
                        {
                          color:
                            task.chipVariant === 'severity-high'
                              ? colors.error
                              : colors.warning,
                        },
                      ]}
                    >
                      {task.chipLabel}
                    </Text>
                  </View>
                  <Text style={[typography.caption, styles.taskCodeText]}>
                    {task.displayCode}
                  </Text>
                </View>

                <Text style={[typography.titleMd, styles.taskTitleText]}>{task.title}</Text>
                <Text style={[typography.caption, styles.taskSubtitleText]} numberOfLines={1}>
                  {task.subtitle}
                </Text>
              </View>

              <MaterialIcons name="chevron-right" size={20} color={colors.secondary} />
            </Card>
          </Pressable>
        ))}
      </View>

      {/* Button: Tạo nhiệm vụ bay ngoài kế hoạch (Figma Image 1) */}
      <Pressable
        style={styles.createTaskBtn}
        onPress={() => setModalVisible(true)}
        accessibilityRole="button"
      >
        <MaterialIcons name="add-circle-outline" size={20} color={colors.surface} />
        <Text style={styles.createTaskBtnText}>Tạo nhiệm vụ bay ngoài kế hoạch</Text>
      </Pressable>

      {/* Modal: Tạo nhiệm vụ bay ngoài kế hoạch */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[typography.titleMd, styles.modalTitle]}>
                  Tạo nhiệm vụ bay ngoài kế hoạch
                </Text>
                <Text style={[typography.caption, styles.modalSub]}>
                  Khảo sát sự cố khẩn cấp hoặc phát sinh hiện trường
                </Text>
              </View>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setModalVisible(false)}
                accessibilityRole="button"
              >
                <MaterialIcons name="close" size={20} color={colors.secondary} />
              </Pressable>
            </View>

            {/* Input: Tên đoạn tuyến */}
            <View style={styles.modalFormGroup}>
              <Text style={[typography.labelSm, styles.modalLabel]}>
                TÊN ĐOẠN ĐƯỜNG / VỊ TRÍ SỰ CỐ:
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ví dụ: Tuyến ĐH.05 - Cầu Bà Lát (Km01+850)"
                placeholderTextColor={colors.secondary}
                value={newRoadName}
                onChangeText={setNewRoadName}
              />
            </View>

            {/* Lý do phát sinh */}
            <View style={styles.modalFormGroup}>
              <Text style={[typography.labelSm, styles.modalLabel]}>LÝ DO KHẢO SÁT KHẨN:</Text>
              <View style={styles.choiceWrap}>
                {[
                  'Sạt lở mép taluy âm sau bão',
                  'Ổ gà sâu & nứt tấm bê tông',
                  'Vỡ mép tấm do va quẹt phương tiện',
                ].map((reason) => (
                  <Pressable
                    key={reason}
                    style={[
                      styles.choiceChip,
                      newReason === reason && styles.choiceChipActive,
                    ]}
                    onPress={() => setNewReason(reason)}
                  >
                    <Text
                      style={[
                        styles.choiceText,
                        newReason === reason && styles.choiceTextActive,
                      ]}
                    >
                      {reason}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Thiết bị bay */}
            <View style={styles.modalFormGroup}>
              <Text style={[typography.labelSm, styles.modalLabel]}>THIẾT BỊ KHẢO SÁT:</Text>
              <View style={styles.choiceWrap}>
                {['DJI Matrice 350 RTK', 'DJI Mavic 3 Enterprise'].map((drone) => (
                  <Pressable
                    key={drone}
                    style={[
                      styles.choiceChip,
                      selectedDrone === drone && styles.choiceChipActive,
                    ]}
                    onPress={() => setSelectedDrone(drone)}
                  >
                    <Text
                      style={[
                        styles.choiceText,
                        selectedDrone === drone && styles.choiceTextActive,
                      ]}
                    >
                      {drone}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Độ cao bay */}
            <View style={styles.modalFormGroup}>
              <Text style={[typography.labelSm, styles.modalLabel]}>ĐỘ CAO AN TOÀN:</Text>
              <View style={styles.choiceWrap}>
                {['35m (AGL)', '45m (AGL)', '50m (AGL)'].map((alt) => (
                  <Pressable
                    key={alt}
                    style={[
                      styles.choiceChip,
                      selectedAltitude === alt && styles.choiceChipActive,
                    ]}
                    onPress={() => setSelectedAltitude(alt)}
                  >
                    <Text
                      style={[
                        styles.choiceText,
                        selectedAltitude === alt && styles.choiceTextActive,
                      ]}
                    >
                      {alt}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
                accessibilityRole="button"
              >
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </Pressable>

              <View style={styles.submitBtnWrap}>
                <Button
                  variant="primary"
                  title="Xác nhận tạo nhiệm vụ"
                  onPress={handleCreateAdhocTask}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  greetingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  greetingTextGroup: {
    flex: 1,
    marginRight: spacing.sm,
  },
  greetingName: {
    color: colors.neutral,
  },
  greetingMeta: {
    color: colors.secondary,
    marginTop: spacing.xs,
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECEEF2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  readyDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.success,
  },
  readyText: {
    color: colors.secondary,
  },
  metricStripCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.md,
  },
  metricMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  metricIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: '#FEF3E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricContent: {
    flex: 1,
  },
  metricNumber: {
    color: colors.primary,
    fontSize: 24,
    lineHeight: 28,
  },
  metricDesc: {
    color: colors.secondary,
    marginTop: 2,
  },
  metricDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  telemetryStripRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  telemetryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  telemetryTagText: {
    color: colors.neutral,
    fontSize: 12,
  },
  quickAccessRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  quickButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 10,
  },
  quickButtonText: {
    color: colors.primaryDark,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.neutral,
  },
  seeAll: {
    color: colors.secondary,
  },
  taskList: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  taskCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    gap: spacing.sm,
  },
  taskIconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskContentBox: {
    flex: 1,
    gap: 2,
  },
  taskBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  figmaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  figmaBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  taskCodeText: {
    color: colors.secondary,
    fontSize: 12,
  },
  taskTitleText: {
    color: colors.neutral,
    fontWeight: 'bold',
    fontSize: 15,
  },
  taskSubtitleText: {
    color: colors.secondary,
    fontSize: 12,
  },
  createTaskBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.md,
    marginBottom: spacing.xl,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  createTaskBtnText: {
    color: colors.surface,
    fontWeight: 'bold',
    fontSize: 15,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
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
  modalFormGroup: {
    marginBottom: spacing.md,
  },
  modalLabel: {
    color: colors.secondary,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    color: colors.neutral,
    fontSize: 14,
  },
  choiceWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  choiceChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  choiceChipActive: {
    backgroundColor: '#FEF9E7',
    borderColor: colors.primary,
  },
  choiceText: {
    fontSize: 12,
    color: colors.secondary,
  },
  choiceTextActive: {
    color: colors.primaryDark,
    fontWeight: 'bold',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  cancelBtnText: {
    color: colors.secondary,
    fontWeight: '600',
  },
  submitBtnWrap: {
    flex: 2,
  },
});

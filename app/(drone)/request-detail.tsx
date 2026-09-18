import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Chip } from '../../src/components/Chip';
import { Toast } from '../../src/components/Toast';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

const FLIGHT_SPECS = [
  { label: 'Chiều dài tuyến', value: '3.5 km' },
  { label: 'Độ cao bay', value: '45 m' },
  { label: 'Độ phủ chồng ảnh', value: '80% / 70%' },
  { label: 'Định dạng video', value: '4K 60fps' },
  { label: 'Tọa độ', value: 'GPS RTK' },
];

const REJECT_REASONS = [
  'Thời tiết mưa gió giật',
  'Flycam hỏng',
  'Vùng cấm bay đột xuất',
];

export default function RequestDetailScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const openReject = () => {
    setReason(null);
    setModalVisible(true);
  };

  const confirmReject = () => {
    setModalVisible(false);
    if (reason) {
      setToast('Đã gửi lý do từ chối yêu cầu. Cảm ơn phi công!');
    } else {
      setToast('Vui lòng chọn lý do trước khi xác nhận.');
    }
  };

  return (
    <SafeAreaScreen scroll>
      <Text style={[typography.titleLg, styles.pageTitle]}>Chi tiết yêu cầu</Text>

      <Card style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={[typography.titleMd, styles.requestId]}>#REQ-KS-089</Text>
          <Chip variant="severity-high" label="Khẩn cấp" />
        </View>
        <Text style={[typography.bodyLg, styles.routeName]}>
          Tuyến ĐT.741 - Cầu Sông Bé Km14+250
        </Text>
        <Text style={[typography.caption, styles.sectionLabel]}>THÔNG SỐ KỸ THUẬT</Text>
        {FLIGHT_SPECS.map((spec) => (
          <View key={spec.label} style={styles.specRow}>
            <Text style={[typography.bodyMd, styles.specLabel]}>{spec.label}</Text>
            <Text style={[typography.bodyMd, styles.specValue]}>{spec.value}</Text>
          </View>
        ))}
      </Card>

      <Card style={styles.card}>
        <Text style={[typography.caption, styles.sectionLabel]}>HÀNH LANG BAY (KML)</Text>
        <View style={styles.mapPlaceholder}>
          <Ionicons name="map-outline" size={48} color={colors.secondary} />
          <Text style={[typography.bodyMd, styles.mapText]}>
            Bản đồ ranh giới hành lang bay 3.5 km
          </Text>
          <Text style={[typography.caption, styles.mapHint]}>Biên dạng KML sẵn sàng khi kết nối mạng</Text>
        </View>
      </Card>

      <Button variant="primary" title="Bắt đầu chuyến bay" onPress={() => router.push('/(drone)/log')} />
      <View style={styles.rejectRow}>
        <Button variant="secondary" title="Từ chối yêu cầu" onPress={openReject} />
      </View>

      {toast ? <Toast type="info" message={toast} /> : null}

      <Modal visible={modalVisible} transparent animationType="slide">
        <Pressable style={styles.backdrop} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={[typography.titleMd, styles.sheetTitle]}>Từ chối yêu cầu</Text>
            <Text style={[typography.bodyMd, styles.sheetHint]}>
              Chọn lý do từ chối nhiệm vụ khảo sát này.
            </Text>
            {REJECT_REASONS.map((r) => {
              const selected = reason === r;
              return (
                <Pressable
                  key={r}
                  style={styles.reasonRow}
                  onPress={() => setReason(r)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <Ionicons
                    name={selected ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={selected ? colors.primary : colors.secondary}
                  />
                  <Text style={[typography.bodyMd, styles.reasonLabel]}>{r}</Text>
                </Pressable>
              );
            })}
            <Button variant="primary" title="Xác nhận" onPress={confirmReject} />
            <View style={styles.sheetCancel}>
              <Button variant="text" title="Hủy" onPress={() => setModalVisible(false)} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  pageTitle: {
    color: colors.neutral,
    marginBottom: spacing.lg,
  },
  card: {
    marginBottom: spacing.md,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  requestId: {
    color: colors.neutral,
  },
  routeName: {
    color: colors.neutral,
    marginTop: spacing.sm,
  },
  sectionLabel: {
    color: colors.secondary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  specLabel: {
    color: colors.secondary,
  },
  specValue: {
    color: colors.neutral,
  },
  mapPlaceholder: {
    height: 180,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  mapText: {
    color: colors.neutral,
  },
  mapHint: {
    color: colors.secondary,
  },
  rejectRow: {
    marginTop: spacing.sm,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sheetTitle: {
    color: colors.neutral,
  },
  sheetHint: {
    color: colors.secondary,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  reasonLabel: {
    color: colors.neutral,
  },
  sheetCancel: {
    marginTop: spacing.xs,
  },
});
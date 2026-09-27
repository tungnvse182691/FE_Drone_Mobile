import React, { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

interface ExportOption {
  id: string;
  title: string;
  desc: string;
  format: string;
  defaultChecked: boolean;
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    id: '1',
    title: '1. Báo cáo tổng hợp bảo hành',
    desc: 'Bản in kỹ thuật chính thức, đóng dấu số điện tử',
    format: 'PDF',
    defaultChecked: true,
  },
  {
    id: '2',
    title: '2. Ảnh bằng chứng Before / After',
    desc: 'Ảnh độ phân giải gốc kèm Watermark EXIF GPS & thời gian',
    format: 'JPG/PNG',
    defaultChecked: true,
  },
  {
    id: '3',
    title: '3. Lớp dữ liệu bản đồ không gian GIS',
    desc: 'Tập hợp hình học khuyết tật chuẩn GeoJSON EPSG:4326',
    format: 'GeoJSON',
    defaultChecked: true,
  },
  {
    id: '4',
    title: '4. Nhật ký chuyến bay & tọa độ RTK',
    desc: 'Dữ liệu hành lang bay, mô hình độ cao số DSM và tệp KML',
    format: 'KML/SRT',
    defaultChecked: true,
  },
];

export default function SupervisorExportModalScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const targetLabel = params.code ? `Hồ sơ ${params.code}` : 'Hồ sơ Q3/2026';
  const fileName = params.code ? `RoadGuard_HoSo_${params.code.replace('#', '')}.zip` : 'RoadGuard_HoSo_Q3_2026.zip';

  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({
    '1': true,
    '2': true,
    '3': true,
    '4': true,
  });
  const [downloading, setDownloading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const toggleItem = (id: string) => {
    setSelectedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDownload = () => {
    setDownloading(true);
    setToastMsg(`Đang tạo và tải xuống gói ${fileName} (128 MB)...`);
    setTimeout(() => {
      setDownloading(false);
      setTimeout(() => {
        router.push('/(sup)/reports');
      }, 1000);
    }, 1500);
  };

  return (
    <SafeAreaScreen scroll>
      {/* Top Bar with Back Button */}
      <View style={styles.topBar}>
        <Pressable
          style={styles.circleIconButton}
          onPress={() => router.push('/(sup)/reports')}
          accessibilityRole="button"
        >
          <MaterialIcons name="arrow-back" size={20} color={colors.secondary} />
        </Pressable>

        <View style={styles.topBarCenter}>
          <Text style={[typography.titleMd, styles.topBarTitle]}>
            {params.code ? `Trích xuất ${params.code}` : 'Trích xuất hồ sơ kiểm định'}
          </Text>
          <Text style={[typography.caption, styles.topBarSub]}>
            {targetLabel} • Định dạng: PDF / ZIP
          </Text>
        </View>

        <View style={styles.circleIconButton}>
          <MaterialIcons name="archive" size={18} color={colors.primary} />
        </View>
      </View>

      {/* Toast Alert */}
      {toastMsg && (
        <View style={styles.toast}>
          <MaterialIcons name="check-circle" size={18} color={colors.success} />
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      )}

      {/* Selection Card */}
      <Card style={styles.selectionCard}>
        <Text style={[typography.labelSm, styles.selectionHeaderTitle]}>
          CHỌN CÁC THÀNH PHẦN HỒ SƠ CẦN XUẤT:
        </Text>

        <View style={styles.optionsList}>
          {EXPORT_OPTIONS.map((opt) => {
            const isChecked = !!selectedItems[opt.id];
            return (
              <Pressable
                key={opt.id}
                style={[styles.optionRow, isChecked && styles.optionRowActive]}
                onPress={() => toggleItem(opt.id)}
              >
                <View style={styles.optionInfo}>
                  <View style={styles.optTitleRow}>
                    <Text style={[typography.titleMd, styles.optTitle]}>{opt.title}</Text>
                    <View style={styles.formatTag}>
                      <Text style={styles.formatTagText}>{opt.format}</Text>
                    </View>
                  </View>
                  <Text style={[typography.caption, styles.optDesc]}>{opt.desc}</Text>
                </View>

                <Switch
                  value={isChecked}
                  onValueChange={() => toggleItem(opt.id)}
                  thumbColor={isChecked ? colors.primary : colors.surface}
                  trackColor={{ false: colors.border, true: '#FEF3E2' }}
                />
              </Pressable>
            );
          })}
        </View>
      </Card>

      {/* Capacity Note */}
      <Card style={styles.capacityCard}>
        <View style={styles.capacityHeader}>
          <MaterialIcons name="info" size={18} color={colors.warning} />
          <Text style={styles.capacityTitle}>Ước tính gói dữ liệu hoàn công:</Text>
        </View>
        <Text style={[typography.bodyMd, styles.capacityDesc]}>
          Tổng dung lượng nén dự kiến: <Text style={styles.boldText}>128 MB</Text>. Hồ sơ đính kèm đầy đủ bảng kê băm SHA-256 xác thực tính bất biến, sẵn sàng nộp cơ quan Thanh tra Giao thông & Ban QLDA.
        </Text>
      </Card>

      {/* Action */}
      <View style={styles.actionWrap}>
        <Button
          variant="primary"
          title="Tải xuống gói hồ sơ (.ZIP)"
          loading={downloading}
          onPress={handleDownload}
        />
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
  selectionCard: {
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  selectionHeaderTitle: {
    color: colors.secondary,
  },
  optionsList: {
    gap: spacing.xs,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionRowActive: {
    borderColor: colors.primary,
  },
  optionInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  optTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  optTitle: {
    color: colors.neutral,
    fontSize: 13,
  },
  formatTag: {
    backgroundColor: '#FEF3E2',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.sm,
  },
  formatTagText: {
    color: colors.primaryDark,
    fontSize: 9,
    fontWeight: 'bold',
  },
  optDesc: {
    color: colors.secondary,
    marginTop: 2,
  },
  capacityCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: colors.warning,
    marginBottom: spacing.md,
    gap: 4,
  },
  capacityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  capacityTitle: {
    color: colors.neutral,
    fontWeight: 'bold',
    fontSize: 12,
  },
  capacityDesc: {
    color: colors.secondary,
    lineHeight: 18,
    fontSize: 12,
  },
  boldText: {
    fontWeight: 'bold',
    color: colors.neutral,
  },
  actionWrap: {
    marginBottom: spacing.xl,
  },
});

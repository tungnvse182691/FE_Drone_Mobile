import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Coords } from '../ViewFinder';
import { Button } from '../Button';
import { colors, radius, spacing, typography } from '../../design-tokens';
import { formatGpsAccuracy } from '../../utils/gpsAccuracy';

interface Props {
  label: string;
  coordinates?: Coords | null;
  capturedAt?: string | null;
  localMetadata: boolean;
}

/** Only the metadata belonging to this photo. Never substitute task/device coordinates. */
export function photoInfoRows({ coordinates, capturedAt, localMetadata }: Omit<Props, 'label'>) {
  const valid = coordinates && Number.isFinite(coordinates.latitude) && Math.abs(coordinates.latitude) <= 90 &&
    Number.isFinite(coordinates.longitude) && Math.abs(coordinates.longitude) <= 180;
  const accuracy = coordinates?.accuracyMeters;
  return [
    { label: 'Vĩ độ', value: valid ? coordinates.latitude.toFixed(6) : 'Chưa có GPS của ảnh' },
    { label: 'Kinh độ', value: valid ? coordinates.longitude.toFixed(6) : 'Chưa có GPS của ảnh' },
    { label: 'Độ chính xác thiết bị báo', value: formatGpsAccuracy(valid ? accuracy : null) },
    { label: 'Thời gian chụp', value: capturedAt && Number.isFinite(Date.parse(capturedAt)) ? new Date(capturedAt).toLocaleString('vi-VN') : 'Chưa có thông tin' },
    { label: 'Nguồn thông tin', value: localMetadata ? 'Thông tin lưu cùng ảnh trên điện thoại này.' : 'Máy chủ chưa trả tọa độ riêng của ảnh; điện thoại không có nháp tương ứng.' },
  ];
}

export function CrewPhotoInfo(props: Props) {
  const [open, setOpen] = useState(false);
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < 350 || fontScale >= 1.4;
  const rows = photoInfoRows(props);
  const coordinateRow = (row: typeof rows[number]) => <View key={row.label} style={[styles.coordinateRow, stacked && styles.stackedRow]}>
    <Text style={styles.rowLabel}>{row.label}</Text>
    <Text selectable style={[styles.coordinateValue, stacked && styles.stackedValue]}>{row.value}</Text>
  </View>;
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`Thông tin ảnh: ${props.label}`} onPress={() => setOpen(true)} style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}>
      <Text style={styles.triggerText}>Thông tin ảnh</Text>
    </Pressable>
    <Modal visible={open} presentationStyle="pageSheet" animationType="none" onRequestClose={() => setOpen(false)}>
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.heading}>
            <Text accessibilityRole="header" style={styles.title}>Thông tin ảnh</Text>
            <Text style={styles.subtitle}>{props.label}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Đóng thông tin ảnh" onPress={() => setOpen(false)} style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
            <MaterialIcons name="close" size={24} color={colors.secondary} />
          </Pressable>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <View style={styles.location}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>Vị trí của ảnh</Text>
            {rows.slice(0, 2).map(coordinateRow)}
            <View style={[styles.accuracyRow, stacked && styles.stackedRow]}>
              <Text style={styles.rowLabel}>Sai số thiết bị báo</Text>
              <Text selectable style={styles.accuracyValue}>{rows[2].value}</Text>
            </View>
          </View>
          <View style={styles.time}>
            <Text style={styles.rowLabel}>{rows[3].label}</Text>
            <Text selectable style={styles.value}>{rows[3].value}</Text>
          </View>
          <View style={styles.source}>
            <Text style={styles.sourceTitle}>Nguồn thông tin</Text>
            <Text selectable style={styles.note}>{rows[4].value}</Text>
            <Text style={styles.note}>GPS có thể có sai số. Thông tin không được in lên ảnh gốc.</Text>
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <Button variant="secondary" title="Đóng" onPress={() => setOpen(false)} />
        </View>
      </SafeAreaView>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  trigger: { minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  triggerText: { ...typography.bodyMd, color: colors.primaryDark, textAlign: 'center' },
  pressed: { backgroundColor: colors.border },
  screen: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderBottomWidth: 1, borderColor: colors.border },
  heading: { flex: 1, gap: spacing.xs },
  close: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, backgroundColor: colors.surfaceAlt },
  content: { padding: spacing.md, gap: spacing.lg },
  scroll: { flex: 1 },
  title: { ...typography.titleLg, color: colors.neutral },
  subtitle: { ...typography.bodyMd, color: colors.secondary },
  location: { backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.md },
  sectionTitle: { ...typography.titleMd, color: colors.secondary },
  coordinateRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm },
  coordinateValue: { ...typography.titleMd, color: colors.neutral, flexShrink: 1, textAlign: 'right', fontVariant: ['tabular-nums'] },
  stackedRow: { flexDirection: 'column', alignItems: 'flex-start', gap: spacing.xs },
  stackedValue: { textAlign: 'left' },
  accuracyRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm, paddingTop: spacing.md, borderTopWidth: 1, borderColor: colors.border },
  accuracyValue: { ...typography.bodyMd, color: colors.neutral, flexShrink: 1 },
  time: { gap: spacing.xs },
  source: { borderTopWidth: 1, borderColor: colors.border, paddingTop: spacing.md, gap: spacing.sm },
  sourceTitle: { ...typography.labelLg, color: colors.secondary },
  note: { ...typography.caption, color: colors.secondary },
  footer: { padding: spacing.md, borderTopWidth: 1, borderColor: colors.border },
  rowLabel: { ...typography.bodyMd, color: colors.secondary },
  value: { ...typography.bodyLg, color: colors.neutral },
});

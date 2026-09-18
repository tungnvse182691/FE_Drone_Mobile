import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { colors, spacing, typography } from '../../src/design-tokens';

const SD_FILES = [
  { name: 'DJI_0042.MP4', meta: '3.2 GB - 4K' },
  { name: 'DJI_0042.SRT', meta: 'Luồng GPS từng frame' },
];

const QA_CHECKS = ['Đủ GPS metadata', 'Không lỗi khung hình'];

export default function UploadScreen() {
  const [loading, setLoading] = useState(false);

  const startUpload = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push('/(drone)/log');
    }, 1200);
  };

  return (
    <SafeAreaScreen scroll>
      <Text style={[typography.titleLg, styles.pageTitle]}>Tải dữ liệu từ thẻ SD</Text>

      <Card style={styles.card}>
        <View style={styles.connectRow}>
          <Ionicons name="hardware-chip-outline" size={22} color={colors.success} />
          <Text style={[typography.bodyMd, styles.connectText]}>
            Thẻ nhớ đã kết nối qua cổng Type-C / OTG
          </Text>
        </View>
      </Card>

      <Text style={[typography.caption, styles.sectionLabel]}>DANH MỤC TỆP</Text>
      {SD_FILES.map((file) => (
        <Card key={file.name} style={styles.fileCard}>
          <Ionicons name="videocam-outline" size={22} color={colors.primary} />
          <View style={styles.fileInfo}>
            <Text style={[typography.bodyLg, styles.fileName]}>{file.name}</Text>
            <Text style={[typography.caption, styles.fileMeta]}>{file.meta}</Text>
          </View>
        </Card>
      ))}

      <Text style={[typography.caption, styles.sectionLabel]}>KIỂM TRA TOÀN VẸN (PRE-FLIGHT QA)</Text>
      <Card style={styles.card}>
        {QA_CHECKS.map((check) => (
          <View key={check} style={styles.qaRow}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={[typography.bodyMd, styles.qaText]}>{check}</Text>
          </View>
        ))}
      </Card>

      <Button
        variant="primary"
        title="Bắt đầu nạp dữ liệu"
        loading={loading}
        onPress={startUpload}
      />
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
  connectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  connectText: {
    color: colors.neutral,
    flex: 1,
  },
  sectionLabel: {
    color: colors.secondary,
    marginBottom: spacing.sm,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    color: colors.neutral,
  },
  fileMeta: {
    color: colors.secondary,
    marginTop: 2,
  },
  qaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  qaText: {
    color: colors.neutral,
  },
});
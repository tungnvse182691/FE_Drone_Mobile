import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraCapturedPicture } from 'expo-camera';
import { ViewFinder } from '../../src/components/ViewFinder';
import { Button } from '../../src/components/Button';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

type ViewfinderMode = 'before' | 'after' | 'video';

const MODES: { key: ViewfinderMode; label: string }[] = [
  { key: 'before', label: 'Trước' },
  { key: 'after', label: 'Sau' },
  { key: 'video', label: 'Video' },
];

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

function formatDateTime(date: Date): string {
  const dd = pad(date.getDate());
  const mm = pad(date.getMonth() + 1);
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${dd}/${mm}/${date.getFullYear()} ${hh}:${min}:${ss}`;
}

export default function CrewViewfinderScreen() {
  const [mode, setMode] = useState<ViewfinderMode>('after');
  const [flashOn, setFlashOn] = useState(false);
  const [afterTwoCaptured, setAfterTwoCaptured] = useState(false);

  const photoCount = 2 + (afterTwoCaptured ? 1 : 0);

  const handleCapture = (_photo: CameraCapturedPicture) => {
    setAfterTwoCaptured(true);
  };

  const modeLabel = mode === 'before' ? 'Trước' : mode === 'after' ? 'Sau' : 'Video';

  const watermark = (
    <View style={styles.watermarkCard} pointerEvents="none">
      <View style={styles.watermarkRow}>
        <View style={styles.watermarkGps}>
          <Ionicons name="location" size={14} color={colors.warning} />
          <Text style={[typography.labelSm, styles.watermarkGpsText]}>10.9634, 107.0125</Text>
        </View>
        <Text style={styles.rtkBadge}>RTK FIX</Text>
      </View>
      <View style={styles.watermarkMeta}>
        <Ionicons name="calendar-outline" size={13} color="#94A3B8" />
        <Text style={[typography.caption, styles.watermarkMetaText]}>
          {formatDateTime(new Date())} • #WO-118
        </Text>
      </View>
    </View>
  );

  const thumbs = (
    <View style={styles.thumbsRow}>
      <View style={styles.thumb}>
        <Ionicons name="image-outline" size={18} color="#64748B" />
        <View style={[styles.thumbCheck, styles.thumbCheckGreen]}>
          <Ionicons name="checkmark" size={10} color={colors.surface} />
        </View>
        <Text style={[typography.labelSm, styles.thumbLabelGreen]}>TRƯỚC</Text>
      </View>

      <View style={styles.thumb}>
        <Ionicons name="image-outline" size={18} color="#64748B" />
        <View style={[styles.thumbCheck, styles.thumbCheckGold]}>
          <Ionicons name="checkmark" size={10} color={colors.onSurface} />
        </View>
        <Text style={[typography.labelSm, styles.thumbLabelGold]}>SAU #1</Text>
      </View>

      <View style={[styles.thumb, styles.thumbPending, afterTwoCaptured && styles.thumbFilled]}>
        <Ionicons
          name={afterTwoCaptured ? 'checkmark' : 'add'}
          size={20}
          color={afterTwoCaptured ? colors.onSurface : colors.warning}
        />
        <Text style={[typography.labelSm, styles.thumbLabelPending, afterTwoCaptured && styles.thumbLabelGold]}>
          SAU #2
        </Text>
      </View>

      <View style={styles.readyBlock}>
        <Text style={[typography.labelLg, styles.readyCount]}>{photoCount}/4 ảnh</Text>
        <Text style={[typography.labelLg, styles.readyOk]}>Đủ điều kiện</Text>
      </View>
    </View>
  );

  const galleryButton = (
    <Pressable accessibilityRole="button" style={({ pressed }) => [styles.sideControl, pressed && styles.sideControlPressed]}>
      <Ionicons name="images-outline" size={20} color={colors.surface} />
    </Pressable>
  );

  const switchButton = (
    <Pressable accessibilityRole="button" style={({ pressed }) => [styles.sideControl, pressed && styles.sideControlPressed]}>
      <Ionicons name="camera-reverse-outline" size={20} color={colors.surface} />
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}>
          <Ionicons name="close" size={20} color={colors.surface} />
        </Pressable>

        <View style={styles.modePills}>
          {MODES.map((item) => {
            const active = item.key === mode;
            return (
              <Pressable
                key={item.key}
                onPress={() => setMode(item.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.modePill, active && styles.modePillActive]}
              >
                {active && <View style={styles.modeDot} />}
                <Text style={[typography.labelLg, active ? styles.modeTextActive : styles.modeText]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.rightActions}>
          <Pressable
            onPress={() => setFlashOn((value) => !value)}
            accessibilityRole="button"
            accessibilityState={{ selected: flashOn }}
            style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
          >
            <Ionicons name={flashOn ? 'flash' : 'flash-off'} size={19} color={colors.surface} />
          </Pressable>
          <Pressable accessibilityRole="button" style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}>
            <Ionicons name="settings-outline" size={19} color={colors.surface} />
          </Pressable>
        </View>
      </View>

      <View style={styles.viewport}>
        <ViewFinder
          onCapture={handleCapture}
          defectType={modeLabel}
          showGridGuide
          showReticle
          flashMode={flashOn ? 'on' : 'off'}
          watermarkContent={watermark}
          hudItems={thumbs}
          leftControl={galleryButton}
          rightControl={switchButton}
        />
      </View>

      <View style={styles.bottomSheet}>
        <View style={styles.sheetHeaderRow}>
          <View style={styles.sheetTitleRow}>
            <View style={styles.sheetDot} />
            <Text style={[typography.labelLg, styles.sheetTitle]}>Hồ sơ #WO-118</Text>
            <Text style={[typography.labelLg, styles.sheetDivider]}>|</Text>
            <Text style={[typography.labelLg, styles.sheetSub]}>Ổ gà Km 42+150</Text>
          </View>
          <Text style={[typography.caption, styles.sheetFiles]}>2 tệp đính kèm</Text>
        </View>

        <Button variant="primary" title="Xác nhận & Lưu" onPress={() => router.push('/(crew)/complete')} />

        <Text style={[typography.caption, styles.sheetHint]}>
          Nhấn để chuyển sang bước <Text style={styles.sheetHintStrong}>Gửi hoàn thành cho PM</Text> xác nhận nghiệm thu.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0F141C',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15, 20, 28, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 6,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  modePills: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2638',
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
    borderRadius: radius.full,
    padding: 2,
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.full,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm + 6,
  },
  modePillActive: {
    backgroundColor: colors.primary,
  },
  modeDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.onSurface,
  },
  modeText: {
    color: '#CBD5E1',
  },
  modeTextActive: {
    color: colors.onSurface,
    fontWeight: '700',
  },
  viewport: {
    flex: 1,
  },
  watermarkCard: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: radius.lg,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm + 2,
    gap: spacing.xs,
  },
  watermarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  watermarkGps: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  watermarkGpsText: {
    color: colors.warning,
    fontWeight: '700',
  },
  rtkBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.4)',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    marginLeft: spacing.sm,
    color: '#6EE7B7',
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    overflow: 'hidden',
    textTransform: 'uppercase',
  },
  watermarkMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  watermarkMetaText: {
    color: '#CBD5E1',
  },
  thumbsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: spacing.sm,
  },
  thumbPending: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#64748B',
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
  },
  thumbFilled: {
    borderStyle: 'solid',
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  thumbCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbCheckGreen: {
    backgroundColor: colors.success,
  },
  thumbCheckGold: {
    backgroundColor: colors.primary,
  },
  thumbLabelGreen: {
    position: 'absolute',
    bottom: 4,
    alignSelf: 'center',
    color: colors.surface,
    backgroundColor: 'rgba(4, 120, 87, 0.8)',
    borderRadius: radius.sm,
    paddingHorizontal: 2,
    overflow: 'hidden',
  },
  thumbLabelGold: {
    position: 'absolute',
    bottom: 4,
    alignSelf: 'center',
    color: colors.onSurface,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: 2,
    overflow: 'hidden',
  },
  thumbLabelPending: {
    position: 'absolute',
    bottom: 4,
    alignSelf: 'center',
    color: '#CBD5E1',
    marginTop: 2,
  },
  readyBlock: {
    alignItems: 'flex-end',
  },
  readyCount: {
    color: colors.surface,
  },
  readyOk: {
    color: colors.success,
  },
  sideControl: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideControlPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  bottomSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sheetDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.success,
    marginRight: 2,
  },
  sheetTitle: {
    color: colors.neutral,
  },
  sheetDivider: {
    color: '#CBD5E1',
  },
  sheetSub: {
    color: '#555F71',
    fontWeight: '400',
  },
  sheetFiles: {
    color: '#555F71',
  },
  sheetHint: {
    color: '#555F71',
    textAlign: 'center',
  },
  sheetHintStrong: {
    color: colors.neutral,
    fontFamily: 'Roboto-Medium',
  },
});
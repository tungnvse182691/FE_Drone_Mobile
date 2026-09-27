import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraCapturedPicture } from 'expo-camera';
import * as DocumentPicker from 'expo-document-picker';
import { ViewFinder, type Coords } from '../../src/components/ViewFinder';
import { Button } from '../../src/components/Button';
import { defectTypeLabel } from '../../src/constants/defect-types';
import {
  getCrewFieldSession,
  setAfterCapture,
  setBeforeCapture,
} from '../../src/api/mock/crew-inspection';
import { getCrewTaskById } from './tasks';
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
  const params = useLocalSearchParams<{ id?: string; mode?: string }>();
  const task = getCrewTaskById(params.id);
  const initialMode: ViewfinderMode = params.mode === 'AFTER' ? 'after' : 'before';

  const [mode, setMode] = useState<ViewfinderMode>(initialMode);
  const [flashOn, setFlashOn] = useState(false);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [afterUri, setAfterUri] = useState<string | null>(null);
  const [coords, setCoords] = useState<Coords | null>(null);

  const session = getCrewFieldSession();
  const beforeReady = Boolean(session?.before_local_uri || session?.before_evidence_id);
  const afterReady = Boolean(afterUri || session?.after_local_uri);
  const photoCount = (beforeReady ? 1 : 0) + (afterReady ? 1 : 0);
  const requiredPhotoCount = task.task_mode === 'MEASURE_ONLY' ? 1 : 2;

  const capturedAt = new Date();
  const gpsText = coords
    ? `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`
    : 'Đang lấy GPS…';

  const watermarkLine = useMemo(
    () =>
      `${task.wo_code} • ${defectTypeLabel(task.defect_type_code)} • ${gpsText} • ${formatDateTime(capturedAt)}`,
    [task.wo_code, task.defect_type_code, gpsText, capturedAt],
  );

  const handleCapture = (photo: CameraCapturedPicture) => {
    const captureCoords = {
      latitude: coords?.latitude ?? task.coordinates.latitude,
      longitude: coords?.longitude ?? task.coordinates.longitude,
    };
    if (mode === 'before') {
      setBeforeCapture(photo.uri, watermarkLine, capturedAt.toISOString(), captureCoords);
      setMode('after');
      return;
    }
    if (mode === 'after') {
      setAfterCapture(photo.uri, watermarkLine, captureCoords);
      setAfterUri(photo.uri);
    }
  };

  const modeLabel = mode === 'before' ? 'BEFORE' : mode === 'after' ? 'AFTER' : 'VIDEO';

  const watermark = (
    <View style={styles.watermarkCard} pointerEvents="none">
      <View style={styles.watermarkRow}>
        <View style={styles.watermarkGps}>
          <Ionicons name="location" size={14} color={colors.warning} />
          <Text style={[typography.labelSm, styles.watermarkGpsText]}>{gpsText}</Text>
        </View>
        <Text style={styles.rtkBadge}>{coords ? 'GPS OK' : 'GPS…'}</Text>
      </View>
      <View style={styles.watermarkMeta}>
        <Ionicons name="document-text-outline" size={13} color="#94A3B8" />
        <Text style={[typography.caption, styles.watermarkMetaText]}>{task.wo_code}</Text>
      </View>
      <View style={styles.watermarkMeta}>
        <Ionicons name="warning-outline" size={13} color="#94A3B8" />
        <Text style={[typography.caption, styles.watermarkMetaText]}>
          {defectTypeLabel(task.defect_type_code)}
        </Text>
      </View>
      <View style={styles.watermarkMeta}>
        <Ionicons name="calendar-outline" size={13} color="#94A3B8" />
        <Text style={[typography.caption, styles.watermarkMetaText]}>{formatDateTime(capturedAt)}</Text>
      </View>
    </View>
  );

  const thumbs = (
    <View style={styles.thumbsRow}>
      <View style={styles.thumb}>
        <Ionicons name="image-outline" size={18} color="#64748B" />
        <View style={[styles.thumbCheck, beforeReady ? styles.thumbCheckGreen : styles.thumbCheckPending]}>
          <Ionicons name={beforeReady ? 'checkmark' : 'add'} size={10} color={colors.surface} />
        </View>
        <Text style={[typography.labelSm, beforeReady ? styles.thumbLabelGreen : styles.thumbLabelPending]}>
          TRƯỚC
        </Text>
      </View>

      {task.task_mode !== 'MEASURE_ONLY' ? (
        <View style={styles.thumb}>
          <Ionicons name="image-outline" size={18} color="#64748B" />
          <View style={[styles.thumbCheck, afterReady ? styles.thumbCheckGold : styles.thumbCheckPending]}>
            <Ionicons name={afterReady ? 'checkmark' : 'add'} size={10} color={colors.surface} />
          </View>
          <Text style={[typography.labelSm, afterReady ? styles.thumbLabelGold : styles.thumbLabelPending]}>
            SAU
          </Text>
        </View>
      ) : null}

      <View style={styles.readyBlock}>
        <Text style={[typography.labelLg, styles.readyCount]}>
          {photoCount}/{requiredPhotoCount} ảnh
        </Text>
        <Text
          style={[
            typography.labelLg,
            photoCount >= requiredPhotoCount ? styles.readyOk : styles.readyWaiting,
          ]}
        >
          {photoCount >= requiredPhotoCount ? 'Đủ điều kiện' : 'Còn thiếu ảnh'}
        </Text>
      </View>
    </View>
  );

  const handlePickGallery = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        handleCapture({
          uri: res.assets[0].uri,
          width: 1920,
          height: 1080,
        } as CameraCapturedPicture);
      }
    } catch {
      // ignore
    }
  };

  const galleryButton = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Chọn ảnh từ thiết bị"
      onPress={handlePickGallery}
      style={({ pressed }) => [styles.sideControl, pressed && styles.sideControlPressed]}
    >
      <Ionicons name="images-outline" size={20} color={colors.surface} />
    </Pressable>
  );

  const switchButton = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Đổi camera trước/sau"
      onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
      style={({ pressed }) => [styles.sideControl, pressed && styles.sideControlPressed]}
    >
      <Ionicons name="camera-reverse-outline" size={20} color={colors.surface} />
    </Pressable>
  );

  const handleConfirm = () => {
    if (mode === 'after' && afterReady) {
      router.push({ pathname: '/(crew)/complete', params: { id: task.id } });
      return;
    }
    router.back();
  };

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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cài đặt camera"
            onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
            style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
          >
            <Ionicons name="camera-reverse" size={19} color={colors.surface} />
          </Pressable>
        </View>
      </View>

      <View style={styles.viewport}>
        <ViewFinder
          onCapture={handleCapture}
          onCoordsChange={setCoords}
          defectType={modeLabel}
          showGridGuide
          showReticle
          flashMode={flashOn ? 'on' : 'off'}
          facing={facing}
          watermarkContent={watermark}
          hudItems={thumbs}
          leftControl={galleryButton}
          rightControl={switchButton}
        />
      </View>

      <View style={styles.bottomSheet}>
        <View style={styles.sheetHeaderRow}>
          <View style={styles.sheetTitleRow}>
            <View style={[styles.sheetDot, mode === 'after' && styles.sheetDotGold]} />
            <Text style={[typography.labelLg, styles.sheetTitle]}>{task.wo_code}</Text>
            <Text style={[typography.labelLg, styles.sheetDivider]}>|</Text>
            <Text style={[typography.labelLg, styles.sheetSub]}>
              {defectTypeLabel(task.defect_type_code)} {task.chainage}
            </Text>
          </View>
          <Text style={[typography.caption, styles.sheetFiles]}>
            {session?.before_source ? `BEFORE: ${session.before_source}` : 'Chưa có BEFORE'}
          </Text>
        </View>

        <Button variant="primary" title="Xác nhận & Lưu" onPress={handleConfirm} />

        <Text style={[typography.caption, styles.sheetHint]}>
          Ảnh được đóng dấu vị trí WGS84, mã lệnh công tác, loại khuyết tật và thời gian thực tại hiện trường.
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
  thumbCheckPending: {
    backgroundColor: colors.secondary,
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
  readyWaiting: {
    color: colors.warning,
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
  sheetDotGold: {
    backgroundColor: colors.primary,
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
});

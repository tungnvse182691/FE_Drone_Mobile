import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { uploadedRatio, type UploadQueueItem } from '../../store/uploads';
import { colors, radius, typography } from '../../design-tokens';

/** Presentation only: confirmed parts measure transfer, never server verification. */
export function PhotoUploadStatus({ item, index }: { item?: UploadQueueItem; index: number }) {
  const [reduceMotion, setReduceMotion] = useState(true);
  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    let active = true;
    let changed = false;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => {
      changed = true;
      if (active) setReduceMotion(value);
    });
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (active && !changed) setReduceMotion(value);
    }).catch(() => {});
    return () => { active = false; subscription.remove(); };
  }, []);
  const blocked = !!item?.cancelState || !!item?.lastErrorCode;
  const verified = !blocked && item?.mediaState === 'VERIFIED';
  const checking = item?.mediaState === 'COMPLETE_REQUESTED' || item?.mediaState === 'VERIFYING';
  const transferring = item?.mediaState === 'SESSION_CREATED' || item?.mediaState === 'UPLOADING';
  const busy = !blocked && (checking || transferring);
  const failed = blocked || item?.mediaState === 'FAILED';
  const label = failed ? 'Cần kiểm tra' : verified ? 'Đã xác minh' : checking ? 'Đang kiểm tra' : transferring ? 'Đang tải' : 'Chờ tải';
  const ratio = !blocked && item?.mediaState === 'UPLOADING' && item.sizeBytes > 0 && item.partSizeBytes > 0
    ? Math.max(0, Math.min(1, uploadedRatio(item))) : undefined;
  const percent = ratio === undefined ? undefined : Math.floor(ratio * 100);
  useEffect(() => {
    fade.stopAnimation();
    if (reduceMotion) { fade.setValue(1); return; }
    fade.setValue(0.65);
    const animation = Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [label, reduceMotion, fade]);
  return <View pointerEvents="none" testID={`photo-state-${index}`} accessible
    accessibilityLabel={`Ảnh ${index + 1}: ${label}${percent === undefined ? '' : ` ${percent}%`}`}
    accessibilityState={{ busy }} accessibilityLiveRegion="polite"
    style={[styles.overlay, busy && styles.busy]}>
    <Animated.View style={[styles.content, { opacity: fade }]}>
      {busy ? <View style={styles.indicator}>
        {percent === undefined ? <ActivityIndicator size="small" color={colors.surface} animating={!reduceMotion} hidesWhenStopped={false} /> :
          <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: percent }} style={styles.ring}>
            <View style={[styles.half, styles.rightHalf]}><View style={[styles.arc, styles.rightArc, { transform: [{ rotate: `${Math.min(percent, 50) * 3.6 - 135}deg` }] }]} /></View>
            <View style={[styles.half, styles.leftHalf]}><View style={[styles.arc, styles.leftArc, { transform: [{ rotate: `${Math.max(0, percent - 50) * 3.6 + 45}deg` }] }]} /></View>
            <Text style={[typography.labelSm, styles.percent]}>{percent}%</Text>
          </View>}
      </View> : null}
      {verified || failed ? <View style={styles.badge}><MaterialIcons name={verified ? 'check-circle' : 'error-outline'} size={22} color={verified ? colors.success : colors.error} /></View> : null}
      {!verified ? <View style={[styles.caption, failed && styles.failureCaption]}><Text style={[typography.caption, styles.label, failed && styles.failureLabel]}>{label}</Text></View> : null}
    </Animated.View>
  </View>;
}
const styles = StyleSheet.create({
  overlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: 'transparent' },
  busy: { backgroundColor: 'rgba(0,0,0,0.18)' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  indicator: { width: 40, height: 40, borderRadius: radius.full, backgroundColor: 'rgba(26,29,32,0.72)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  ring: { width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  half: { position: 'absolute', top: -3, width: 18, height: 36, overflow: 'hidden' },
  rightHalf: { right: -3 },
  leftHalf: { left: -3 },
  arc: { position: 'absolute', width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: 'transparent', borderTopColor: colors.surface, borderRightColor: colors.surface },
  rightArc: { right: 0 },
  leftArc: { left: 0 },
  percent: { color: colors.surface, fontSize: 9, lineHeight: 12 },
  badge: { position: 'absolute', left: 4, top: 4, borderRadius: radius.full, backgroundColor: colors.surface, padding: 1 },
  caption: { position: 'absolute', bottom: 4, left: 3, right: 3, borderRadius: radius.sm, backgroundColor: 'rgba(26,29,32,0.82)', paddingVertical: 2 },
  failureCaption: { backgroundColor: colors.surface },
  failureLabel: { color: colors.secondary },
  label: { color: colors.surface, textAlign: 'center', fontSize: 10, lineHeight: 14 },
});

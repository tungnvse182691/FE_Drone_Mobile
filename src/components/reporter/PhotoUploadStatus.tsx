import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { uploadedRatio, type UploadQueueItem } from '../../store/uploads';
import { radius, typography } from '../../design-tokens';

/** Presentation only: confirmed parts measure transfer, never server verification. */
export function PhotoUploadStatus({ item, index }: { item?: UploadQueueItem; index: number }) {
  const blocked = !!item?.cancelState || !!item?.lastErrorCode;
  const verified = !blocked && item?.mediaState === 'VERIFIED';
  const checking = item?.mediaState === 'COMPLETE_REQUESTED' || item?.mediaState === 'VERIFYING';
  const transferring = item?.mediaState === 'SESSION_CREATED' || item?.mediaState === 'UPLOADING';
  const busy = !blocked && (checking || transferring);
  const failed = blocked || item?.mediaState === 'FAILED';
  const label = failed ? 'Cần kiểm tra' : verified ? 'Đã xác minh' : checking ? 'Kiểm tra' : transferring ? 'Đang tải' : 'Chờ tải';
  const ratio = !blocked && item?.mediaState === 'UPLOADING' && item.sizeBytes > 0 && item.partSizeBytes > 0
    ? Math.max(0, Math.min(1, uploadedRatio(item))) : undefined;
  const percent = ratio === undefined ? undefined : Math.floor(ratio * 100);
  return <View pointerEvents="none" testID={`photo-state-${index}`} accessible
    accessibilityLabel={`Ảnh ${index + 1}: ${label}${percent === undefined ? '' : ` ${percent}%`}`}
    accessibilityState={{ busy }} accessibilityLiveRegion="polite"
    style={[styles.overlay, busy && styles.busy]}>
    {busy && percent === undefined ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
    {verified ? <MaterialIcons name="check-circle" size={22} color="#FFFFFF" /> : null}
    {failed ? <MaterialIcons name="error-outline" size={22} color="#FFFFFF" /> : null}
    <Text style={[typography.caption, styles.label]}>{label}{percent === undefined ? '' : ` ${percent}%`}</Text>
    {percent !== undefined ? <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: percent }} style={styles.track}>
      <View style={[styles.fill, { width: `${percent}%` }]} />
    </View> : null}
  </View>;
}
const styles = StyleSheet.create({
  overlay: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 4, gap: 3,
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.72)', borderBottomLeftRadius: radius.md, borderBottomRightRadius: radius.md },
  busy: { top: 0, borderRadius: radius.md, paddingTop: 24 },
  label: { color: '#FFFFFF', textAlign: 'center', fontSize: 11, lineHeight: 14 },
  track: { width: '100%', height: 3, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: '#FFFFFF' },
});

import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraCapturedPicture, CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';
import { Button } from './Button';
import { colors, radius, spacing, typography } from '../design-tokens';

interface ViewFinderProps {
  active?: boolean;
  taskKey?: string;
  disabled?: boolean;
  disabledReason?: string;
  onCapture: (photo: CameraCapturedPicture, metadata?: CaptureMetadata) => void;
  /** Crew opt-in; other camera callers keep their existing behavior. */
  freshLocationOnCapture?: boolean;
  onShootingChange?: (shooting: boolean) => void;
  defectType: string;
  showGridGuide?: boolean;
  showReticle?: boolean;
  watermarkContent?: ReactNode;
  hudItems?: ReactNode;
  leftControl?: ReactNode;
  rightControl?: ReactNode;
  flashMode?: 'off' | 'on' | 'auto';
  onCoordsChange?: (coords: Coords | null) => void;
  onLocationStatusChange?: (status: 'locating' | 'ready' | 'unavailable') => void;
  facing?: 'back' | 'front';
}

export interface Coords {
  latitude: number;
  longitude: number;
  /** Bán kính sai số GPS (mét, 68%); `null` khi thiết bị không cung cấp. */
  accuracyMeters: number | null;
}

export interface CaptureMetadata {
  coordinates: Coords | null;
  capturedAt: string;
}

/** One bounded acquisition. Cleanup suppresses callbacks and further native requests. */
export function watchCaptureLocation(onCoords: (value: Coords | null) => void,
  location: Pick<typeof Location, 'getForegroundPermissionsAsync' | 'requestForegroundPermissionsAsync' | 'getCurrentPositionAsync'> & Partial<Pick<typeof Location, 'watchPositionAsync'>> = Location,
  timeoutMs = 12000, minimumTimestamp = -Infinity, isCurrent = () => true): () => void {
  let active = true;
  let subscription: Location.LocationSubscription | undefined;
  const finish = (value: Coords | null) => {
    if (!active) return;
    active = false; clearTimeout(timer); subscription?.remove();
    onCoords(value);
  };
  const timer = setTimeout(() => finish(null), timeoutMs);
  const receive = (result: Location.LocationObject) => {
    if (!active) return;
    if (!isCurrent()) { finish(null); return; }
    // Native may initially deliver a cached fix. Wait for a post-request reading.
    if (minimumTimestamp !== -Infinity && (!Number.isFinite(result.timestamp) || result.timestamp < minimumTimestamp)) return;
    const { latitude, longitude, accuracy } = result.coords;
    const valid = Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
    finish(valid ? { latitude, longitude, accuracyMeters: typeof accuracy === 'number' && Number.isFinite(accuracy) && accuracy >= 0 ? accuracy : null } : null);
  };
  void (async () => {
    try {
      let permission = await location.getForegroundPermissionsAsync();
      if (!active) return;
      if (!isCurrent()) { finish(null); return; }
      if (permission.status !== 'granted') permission = await location.requestForegroundPermissionsAsync();
      if (!active) return;
      if (!isCurrent()) { finish(null); return; }
      if (permission.status !== 'granted') { finish(null); return; }
      if (minimumTimestamp !== -Infinity && location.watchPositionAsync) {
        const created = await location.watchPositionAsync({ accuracy: Location.Accuracy.High, distanceInterval: 0, timeInterval: 0 }, receive, () => finish(null));
        if (!active) created.remove(); else subscription = created;
      } else {
        const result = await location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        // Single-read ports cannot supply a later fix; retain their bounded failure.
        if (minimumTimestamp !== -Infinity && (!Number.isFinite(result.timestamp) || result.timestamp < minimumTimestamp)) finish(null);
        else receive(result);
      }
    } catch { finish(null); }
  })();
  return () => { active = false; clearTimeout(timer); subscription?.remove(); };
}

/** No last-known-position fallback. A late native result cannot replace a timed-out fix. */
export function acquirePhotoLocation(location: Parameters<typeof watchCaptureLocation>[1] = Location, timeoutMs = 12000, isCurrent = () => true): Promise<Coords | null> {
  const requestedAt = Date.now();
  return new Promise(resolve => { watchCaptureLocation(resolve, location, timeoutMs, requestedAt, isCurrent); });
}

export function ViewFinder({
  active: screenActive = true,
  taskKey = '',
  disabled = false,
  disabledReason,
  onCapture,
  freshLocationOnCapture = false,
  onShootingChange,
  defectType,
  showGridGuide,
  showReticle,
  watermarkContent,
  hudItems,
  leftControl,
  rightControl,
  flashMode = 'off',
  onCoordsChange,
  onLocationStatusChange,
  facing = 'back',
}: ViewFinderProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [coords, setCoords] = useState<Coords | null>(null);
  const [foreground, setForeground] = useState(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  const [locationRetry, setLocationRetry] = useState(0);
  const active = screenActive && (!freshLocationOnCapture || foreground);
  const [readySession, setReadySession] = useState('');
  const [shooting, setShooting] = useState(false);
  const [captureError, setCaptureError] = useState('');
  const mounted = useRef(true), captureLock = useRef(false);
  const previewGeneration = useRef(0);
  const cameraRef = useRef<CameraView>(null);
  const cameraIdentity = `${taskKey}:${facing}`;
  const activeRef = useRef(active);
  const generation = useRef({ active, cameraIdentity, value: 0 });
  if (generation.current.active !== active || generation.current.cameraIdentity !== cameraIdentity) {
    generation.current = { active, cameraIdentity, value: generation.current.value + 1 };
  }
  const cameraSession = `${cameraIdentity}:${generation.current.value}`;
  const currentSession = useRef(cameraSession);
  currentSession.current = cameraSession;
  activeRef.current = active;
  const cameraReady = active && readySession === cameraSession;
  useEffect(() => { mounted.current=true; return () => { mounted.current=false; activeRef.current=false; }; }, []);

  useEffect(() => {
    if (!freshLocationOnCapture) return;
    const subscription = AppState.addEventListener('change', state => setForeground(state === 'active'));
    return () => subscription.remove();
  }, [freshLocationOnCapture]);

  useEffect(() => {
    if (!active || freshLocationOnCapture) return;
    return watchCaptureLocation(next => { setCoords(next); onCoordsChange?.(next); });
  }, [active, onCoordsChange, freshLocationOnCapture]);

  useEffect(() => {
    if (!active || !freshLocationOnCapture) return;
    const session = cameraSession;
    const preview = ++previewGeneration.current;
    const isCurrent = () => mounted.current && activeRef.current && currentSession.current === session && previewGeneration.current === preview && !captureLock.current;
    setCoords(null); onCoordsChange?.(null); onLocationStatusChange?.('locating');
    // Preview is display-only. Capture below always acquires its own new fix.
    return watchCaptureLocation(next => {
      if (!isCurrent()) return;
      setCoords(next); onCoordsChange?.(next);
      onLocationStatusChange?.(next ? 'ready' : 'unavailable');
    }, Location, 12000, -Infinity, isCurrent);
  }, [active, cameraSession, onCoordsChange, onLocationStatusChange, freshLocationOnCapture, locationRetry]);

  useEffect(() => {
    if (!active) { setReadySession(''); setCaptureError(''); setShooting(false); captureLock.current=false; }
  }, [active]);

  useEffect(() => () => {
    captureLock.current = false;
    if (mounted.current) setShooting(false);
    onShootingChange?.(false);
  }, [cameraSession, onShootingChange]);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <MaterialIcons name="photo-camera" size={48} color={colors.secondary} />
        <Text style={[typography.bodyMd, styles.permissionText]}>
          Cần quyền truy cập camera để chụp ảnh nghiệm thu
        </Text>
        <Button variant="primary" title="Cấp quyền camera" onPress={requestPermission} />
      </View>
    );
  }

  const handleCapture = async () => {
    if (disabled || !cameraReady || captureLock.current) {
      return;
    }
    const capturedSession = cameraSession;
    const capturedGeneration = generation.current.value;
    previewGeneration.current++;
    captureLock.current=true;setShooting(true);onShootingChange?.(true);setCaptureError('');
    try {
      let captureCoords: Coords | null = null;
      if (freshLocationOnCapture) {
        setCoords(null); onCoordsChange?.(null); onLocationStatusChange?.('locating');
        captureCoords = await acquirePhotoLocation(Location, 12000, () => mounted.current && activeRef.current && currentSession.current === capturedSession && generation.current.value === capturedGeneration);
        if (!mounted.current || !activeRef.current || currentSession.current !== capturedSession || generation.current.value !== capturedGeneration) return;
        setCoords(captureCoords); onCoordsChange?.(captureCoords); onLocationStatusChange?.(captureCoords ? 'ready' : 'unavailable');
      }
      const capturedAt = new Date().toISOString();
      const photo = await cameraRef.current?.takePictureAsync();
      if (photo && mounted.current && activeRef.current && currentSession.current === capturedSession && generation.current.value === capturedGeneration) {
        onCapture(photo, freshLocationOnCapture ? { coordinates: captureCoords, capturedAt } : undefined);
      }
    } catch {
      if (mounted.current && activeRef.current && currentSession.current === capturedSession && generation.current.value === capturedGeneration) setCaptureError('Camera không chụp được ảnh. Đóng rồi mở lại camera và thử lại.');
    } finally {
      if (generation.current.value === capturedGeneration) {
        captureLock.current=false;
        if (mounted.current) { setShooting(false); onShootingChange?.(false); }
      }
    }
  };

  return (
    <View style={styles.container}>
      {active ? <CameraView
        key={cameraSession}
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        flash={flashMode}
        onCameraReady={() => { if (activeRef.current && currentSession.current === cameraSession) { setReadySession(cameraSession); setCaptureError(''); } }}
        onMountError={() => { if (activeRef.current && currentSession.current === cameraSession) { setReadySession(''); setCaptureError('Camera không khởi động được. Đóng rồi mở lại camera và kiểm tra quyền truy cập.'); } }}
      /> : null}
      <View style={[StyleSheet.absoluteFill, styles.overlay]}>
        {showGridGuide && (
          <View style={styles.gridGuide} pointerEvents="none">
            <View style={[styles.gridLineH, styles.gridLineH1]} />
            <View style={[styles.gridLineH, styles.gridLineH2]} />
            <View style={[styles.gridLineV, styles.gridLineV1]} />
            <View style={[styles.gridLineV, styles.gridLineV2]} />
          </View>
        )}

        {showReticle && (
          <View style={styles.reticle} pointerEvents="none">
            <MaterialIcons name="image" size={48} color="rgba(129, 140, 248, 0.8)" />
          </View>
        )}

        <View style={styles.topBar}>
          {defectType ? <Text style={[typography.labelSm, styles.defectLabel]}>{defectType.toUpperCase()}</Text> : null}
        </View>

        {watermarkContent ?? (
          <View style={styles.gpsWatermark} pointerEvents="none">
            <MaterialIcons name="location-on" size={14} color={colors.onPrimary} />
            <Text style={[typography.caption, styles.watermarkText]}>
              {coords
                ? `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`
                : 'Đang lấy GPS...'}
            </Text>
          </View>
        )}

        {hudItems}
        {freshLocationOnCapture && active && !shooting ? <Pressable accessibilityRole="button" accessibilityLabel="Lấy lại GPS" style={styles.locationRetry} onPress={() => setLocationRetry(value => value + 1)}>
          <Text style={[typography.labelSm, styles.watermarkText]}>Lấy lại GPS</Text>
        </Pressable> : null}
        {captureError || disabledReason || !active || !cameraReady || (shooting && freshLocationOnCapture) ? <Text accessibilityLiveRegion="polite" style={styles.captureStatus}>{disabledReason || captureError || (!active ? 'Camera đang tạm dừng.' : !cameraReady ? 'Đang khởi động camera…' : 'Đang lấy vị trí và chụp ảnh…')}</Text> : null}

        <View style={styles.bottomBar}>
          <View style={styles.bottomSideLeft}>{leftControl ?? null}</View>
          <Pressable
            style={({ pressed }) => [styles.shutter, (disabled || shooting || !cameraReady) && styles.shutterDisabled, pressed && cameraReady && !disabled && styles.shutterPressed]}
            onPress={handleCapture}
            disabled={disabled || shooting || !cameraReady}
            accessibilityRole="button"
            accessibilityState={{ disabled: disabled || shooting || !cameraReady, busy: shooting }}
            accessibilityLabel={disabled || !cameraReady ? (disabledReason || captureError || 'Camera chưa sẵn sàng') : 'Chụp ảnh'}
            testID="capture-button"
          >
            <MaterialIcons name="photo-camera" size={24} color={colors.onPrimary} />
          </Pressable>
          <View style={styles.bottomSideRight}>{rightControl ?? null}</View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral,
    overflow: 'hidden',
    borderRadius: radius.lg,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surfaceAlt,
  },
  permissionText: {
    color: colors.secondary,
    textAlign: 'center',
  },
  captureStatus: {
    alignSelf: 'center',
    maxWidth: '92%',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    color: colors.onPrimary,
    backgroundColor: 'rgba(15, 20, 28, 0.82)',
    textAlign: 'center',
  },
  locationRetry: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.secondary,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  gridGuide: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.25,
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.onPrimary,
  },
  gridLineH1: {
    top: '33.33%',
  },
  gridLineH2: {
    top: '66.66%',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: colors.onPrimary,
  },
  gridLineV1: {
    left: '33.33%',
  },
  gridLineV2: {
    left: '66.66%',
  },
  reticle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 112,
    height: 112,
    marginLeft: -56,
    marginTop: -56,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.7)',
    backgroundColor: 'rgba(30, 27, 75, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    alignSelf: 'flex-start',
  },
  defectLabel: {
    color: colors.onPrimary,
    backgroundColor: 'rgba(26, 29, 32, 0.6)',
    borderRadius: radius.full,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  ruler: {
    alignItems: 'center',
  },
  rulerLine: {
    width: '100%',
    height: 2,
    backgroundColor: colors.onPrimary,
    opacity: 0.8,
  },
  rulerMarks: {
    position: 'absolute',
    top: 2,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rulerTick: {
    width: 2,
    backgroundColor: colors.onPrimary,
    opacity: 0.8,
  },
  rulerTickMajor: {
    height: 16,
  },
  rulerTickMinor: {
    height: 8,
  },
  gpsWatermark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(26, 29, 32, 0.6)',
    borderRadius: radius.sm,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  watermarkText: {
    color: colors.onPrimary,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomSideLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  bottomSideRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  shutter: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterPressed: {
    backgroundColor: colors.primaryDark,
  },
  shutterDisabled: {
    backgroundColor: '#64748B',
    opacity: 0.65,
  },
});

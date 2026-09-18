import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraCapturedPicture, CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { colors, radius, spacing, typography } from '../design-tokens';

interface ViewFinderProps {
  onCapture: (photo: CameraCapturedPicture) => void;
  defectType: string;
  showGridGuide?: boolean;
  showReticle?: boolean;
  watermarkContent?: ReactNode;
  hudItems?: ReactNode;
  leftControl?: ReactNode;
  rightControl?: ReactNode;
  flashMode?: 'off' | 'on' | 'auto';
}

interface Coords {
  latitude: number;
  longitude: number;
}

export function ViewFinder({
  onCapture,
  defectType,
  showGridGuide,
  showReticle,
  watermarkContent,
  hudItems,
  leftControl,
  rightControl,
  flashMode = 'off',
}: ViewFinderProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [coords, setCoords] = useState<Coords | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [shooting, setShooting] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const locationPermission = await Location.getForegroundPermissionsAsync();
      if (locationPermission.status !== 'granted') {
        await Location.requestForegroundPermissionsAsync();
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if (mounted) {
        setCoords({ latitude: location.coords.latitude, longitude: location.coords.longitude });
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={48} color={colors.secondary} />
        <Text style={[typography.bodyMd, styles.permissionText]}>
          Cần quyền truy cập camera để chụp ảnh nghiệm thu
        </Text>
        <Button variant="primary" title="Cấp quyền camera" onPress={requestPermission} />
      </View>
    );
  }

  const handleCapture = async () => {
    if (!cameraReady || shooting) {
      return;
    }
    setShooting(true);
    try {
      const photo = await cameraRef.current?.takePictureAsync();
      if (photo) {
        onCapture(photo);
      }
    } finally {
      setShooting(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        flash={flashMode}
        onCameraReady={() => setCameraReady(true)}
      />
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
            <Ionicons name="image-outline" size={48} color="rgba(129, 140, 248, 0.8)" />
          </View>
        )}

        <View style={styles.topBar}>
          <Text style={[typography.labelSm, styles.defectLabel]}>{defectType.toUpperCase()}</Text>
        </View>

        <View style={styles.ruler} pointerEvents="none">
          <View style={styles.rulerLine} />
          <View style={styles.rulerMarks}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((mark) => (
              <View
                key={mark}
                style={[
                  styles.rulerTick,
                  mark % 2 === 0 ? styles.rulerTickMajor : styles.rulerTickMinor,
                ]}
              />
            ))}
          </View>
        </View>

        {watermarkContent ?? (
          <View style={styles.gpsWatermark} pointerEvents="none">
            <Ionicons name="location" size={14} color={colors.onPrimary} />
            <Text style={[typography.caption, styles.watermarkText]}>
              {coords
                ? `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`
                : 'Đang lấy GPS...'}
            </Text>
          </View>
        )}

        {hudItems}

        <View style={styles.bottomBar}>
          <View style={styles.bottomSideLeft}>{leftControl ?? null}</View>
          <Pressable
            style={({ pressed }) => [styles.shutter, pressed && styles.shutterPressed]}
            onPress={handleCapture}
            accessibilityRole="button"
            testID="capture-button"
          >
            <Ionicons name="camera" size={24} color={colors.onPrimary} />
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
});
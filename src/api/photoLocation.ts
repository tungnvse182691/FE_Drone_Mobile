import * as Location from 'expo-location';
import { hasUsableCoordinate } from '../types/position';
import type { PhotoGps } from '../utils/photoGps';

/** Bounded, new native observation for this photo. Never a last-known fallback. */
export async function acquireReporterPhotoGps(isCurrent: () => boolean, timeoutMs = 12000): Promise<PhotoGps | null> {
  const requestedAt = Date.now();
  return new Promise(resolve => {
    let done = false;
    let subscription: { remove(): void } | undefined;
    const finish = (fix: PhotoGps | null) => {
      if (done) return;
      done = true; clearTimeout(timer); subscription?.remove(); resolve(fix);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    void (async () => {
      try {
        if (!isCurrent()) return finish(null);
        let permission = await Location.getForegroundPermissionsAsync();
        if (done || !isCurrent()) return finish(null);
        if (permission.status !== 'granted') permission = await Location.requestForegroundPermissionsAsync();
        if (done || !isCurrent() || permission.status !== 'granted') return finish(null);
        const created = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, timeInterval: 0, distanceInterval: 0 }, result => {
          if (!isCurrent()) return finish(null);
          if (!Number.isFinite(result.timestamp) || result.timestamp < requestedAt) return;
          const c = result.coords;
          if (!hasUsableCoordinate(c.latitude, c.longitude)) return;
          finish({ latitude: c.latitude, longitude: c.longitude,
            accuracyMeters: typeof c.accuracy === 'number' && Number.isFinite(c.accuracy) && c.accuracy >= 0 ? c.accuracy : null });
        }, () => finish(null));
        if (done) created.remove(); else subscription = created;
      } catch { finish(null); }
    })();
  });
}

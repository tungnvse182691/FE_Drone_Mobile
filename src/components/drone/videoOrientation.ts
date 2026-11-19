import { lockAsync, OrientationLock } from 'expo-screen-orientation';

// Serialize native requests: closing during a pending orientation change must finish in
// portrait. A rejected request must not block subsequent cleanup or reopening.
let pending: Promise<void> = Promise.resolve();
export function requestVideoOrientation(fullscreen: boolean): Promise<void> {
  // Fullscreen permits rotation; it must never force landscape on a phone held
  // upright. DEFAULT also respects Android's system auto-rotate preference.
  const next = pending.then(() => lockAsync(fullscreen ? OrientationLock.DEFAULT : OrientationLock.PORTRAIT_UP));
  pending = next.catch(() => undefined);
  return next;
}

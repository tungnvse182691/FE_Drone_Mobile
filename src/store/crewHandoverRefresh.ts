import { sameQueueIdentity, type QueueIdentity } from '../offline/upload-queue';

// Sync reloads on focus. This signal also handles a durable change that
// finishes after the operator has already returned to the Sync screen.
const listeners = new Set<(identity: QueueIdentity) => void>();

export function subscribeToCrewHandoverChange(listener: (identity: QueueIdentity) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function publishCrewHandoverChange(identity: QueueIdentity) {
  if (sameQueueIdentity(identity)) listeners.forEach(listener => listener(identity));
}

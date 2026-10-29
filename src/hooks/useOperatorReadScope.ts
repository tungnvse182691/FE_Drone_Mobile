import { useCallback, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/auth';
import { apiClient } from '../api/client';
import { passwordSessionIdentity } from '../api/authApi';

/** Continuity only. Every read remains subject to server authorization. */
export function operatorReadScope(resource = ''): string | null {
  const s = useAuthStore.getState(), identity = passwordSessionIdentity(s.token);
  if (!identity || !s.user || JSON.parse(identity)[0] !== s.user.id ||
      s.user.role_code !== 'DRONE_OPERATOR' || s.user.must_change_password ||
      !['AUTHENTICATED', 'REFRESHING'].includes(s.status)) return null;
  return JSON.stringify([apiClient.defaults.baseURL, identity, resource]);
}

export function useOperatorReadScope(resource = '') {
  useAuthStore(s => s.token); useAuthStore(s => s.user); useAuthStore(s => s.status);
  const key = operatorReadScope(resource);
  const mounted = useRef(true), generation = useRef(0);
  useEffect(() => {
    mounted.current = true;
    let previous = operatorReadScope(resource);
    const unsubscribe = useAuthStore.subscribe(() => {
      const next = operatorReadScope(resource);
      if (next !== previous) generation.current++;
      previous = next;
    });
    return () => { mounted.current = false; generation.current++; unsubscribe(); };
  }, [resource]);
  const capture = useCallback(() => {
    const epoch = generation.current;
    return () => !!key && mounted.current && epoch === generation.current && operatorReadScope(resource) === key;
  }, [key, resource]);
  return { key, capture };
}

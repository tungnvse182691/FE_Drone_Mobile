import { Platform } from 'react-native';
import { StateStorage, createJSONStorage } from 'zustand/middleware';
import { readLocalValue, writeLocalValue, removeLocalValue } from '../offline/kvStore';

const webMemoryStore = new Map<string, string>();

export const appStateStorage: StateStorage = {
  getItem: (key: string): string | null => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return Platform.OS === 'web' ? webMemoryStore.get(key) ?? null : readLocalValue(key);
  },
  setItem: (key: string, value: string): void => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
    if (Platform.OS === 'web') webMemoryStore.set(key, value);
    else writeLocalValue(key, value);
  },
  removeItem: (key: string): void => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
    if (Platform.OS === 'web') webMemoryStore.delete(key);
    else removeLocalValue(key);
  },
};

export const appStorage = createJSONStorage(() => appStateStorage);

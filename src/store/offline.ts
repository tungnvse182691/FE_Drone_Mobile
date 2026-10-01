import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { appStorage } from './storage';
import type { PendingItem } from '../types/domain';

export type { PendingItem };

interface OfflineState {
  queueCount: number;
  pendingItems: PendingItem[];
  addItem: (item: PendingItem) => void;
  removeItem: (id: string) => void;
  decrement: () => void;
  clear: () => void;
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set) => ({
      queueCount: 0,
      pendingItems: [],
      addItem: (item) =>
        set((state) => ({
          pendingItems: [...state.pendingItems, item],
          queueCount: state.queueCount + 1,
        })),
      removeItem: (id) =>
        set((state) => ({
          pendingItems: state.pendingItems.filter((i) => i.id !== id),
          queueCount: Math.max(0, state.queueCount - 1),
        })),
      decrement: () =>
        set((state) => ({
          queueCount: Math.max(0, state.queueCount - 1),
        })),
      clear: () => set({ queueCount: 0, pendingItems: [] }),
    }),
    {
      name: 'offline-storage',
      storage: appStorage,
    },
  ),
);
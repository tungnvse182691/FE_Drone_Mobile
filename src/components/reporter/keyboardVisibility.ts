import { create } from 'zustand';

/** Ephemeral Reporter UI only; never persisted with drafts or sessions. */
export const useReporterKeyboard = create<{ opening: boolean; setOpening: (opening: boolean) => void }>(set => ({
  opening: false,
  setOpening: opening => set({ opening }),
}));

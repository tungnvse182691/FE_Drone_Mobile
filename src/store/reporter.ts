import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { appStorage } from './storage';
import { ReportCreate } from '../api/mock/reporter';

interface ReporterSessionState {
  email: string | null;
  verifiedEmail: string | null;
  trackingCodes: string[];
  pendingReport: ReportCreate | null;
  setEmail: (email: string) => void;
  markVerified: (email: string) => void;
  addTrackingCode: (code: string) => void;
  setPendingReport: (report: ReportCreate | null) => void;
  clearPendingReport: () => void;
  clearSession: () => void;
}

export const useReporterStore = create<ReporterSessionState>()(
  persist(
    (set) => ({
      email: null,
      verifiedEmail: null,
      trackingCodes: [],
      pendingReport: null,
      setEmail: (email) => set({ email }),
      markVerified: (email) =>
        set((state) => ({
          email,
          verifiedEmail: email,
          trackingCodes: state.trackingCodes.filter((code) => code !== ''),
        })),
      addTrackingCode: (code) =>
        set((state) => ({
          trackingCodes: [code, ...state.trackingCodes.filter((c) => c !== code)].slice(0, 10),
        })),
      setPendingReport: (report) => set({ pendingReport: report }),
      clearPendingReport: () => set({ pendingReport: null }),
      clearSession: () =>
        set({ email: null, verifiedEmail: null, trackingCodes: [], pendingReport: null }),
    }),
    {
      name: 'reporter-session',
      storage: appStorage,
      partialize: (state) => ({
        email: state.email,
        verifiedEmail: state.verifiedEmail,
        trackingCodes: state.trackingCodes,
      }),
    },
  ),
);

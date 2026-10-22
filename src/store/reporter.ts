import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { appStorage } from './storage';
import type { CreateReporterReportRequestDto } from '../api/mock/reporter';

interface ReporterSessionState {
  email: string | null;
  verifiedEmail: string | null;
  pendingReport: CreateReporterReportRequestDto | null;
  setEmail: (email: string) => void;
  markVerified: (email: string) => void;
  setPendingReport: (report: CreateReporterReportRequestDto | null) => void;
  clearPendingReport: () => void;
  clearSession: () => void;
}

export const useReporterStore = create<ReporterSessionState>()(
  persist(
    (set) => ({
      email: null,
      verifiedEmail: null,
      pendingReport: null,
      setEmail: (email) => set({ email }),
      markVerified: (email) => set({ email, verifiedEmail: email }),
      setPendingReport: (report) => set({ pendingReport: report }),
      clearPendingReport: () => set({ pendingReport: null }),
      clearSession: () => set({ email: null, verifiedEmail: null, pendingReport: null }),
    }),
    {
      name: 'reporter-session',
      storage: appStorage,
      partialize: (state) => ({
        email: state.email,
        verifiedEmail: state.verifiedEmail,
      }),
    },
  ),
);

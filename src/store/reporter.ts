import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { appStorage } from './storage';
import type { CreateReporterReportRequestDto } from '../api/mock/reporter';

interface ReporterSessionState {
  email: string | null;
  verifiedEmail: string | null;
  pendingReport: CreateReporterReportRequestDto | null;
  /** Id bản nháp đang chờ đăng nhập — dùng làm scope Idempotency-Key ổn định. */
  pendingDraftId: string | null;
  setEmail: (email: string) => void;
  markVerified: (email: string) => void;
  setPendingReport: (report: CreateReporterReportRequestDto | null, draftId?: string) => void;
  clearPendingReport: () => void;
  clearSession: () => void;
}

export const useReporterStore = create<ReporterSessionState>()(
  persist(
    (set) => ({
      email: null,
      verifiedEmail: null,
      pendingReport: null,
      pendingDraftId: null,
      setEmail: (email) => set({ email }),
      markVerified: (email) => set({ email, verifiedEmail: email }),
      setPendingReport: (report, draftId) =>
        set({ pendingReport: report, pendingDraftId: report ? draftId ?? null : null }),
      clearPendingReport: () => set({ pendingReport: null, pendingDraftId: null }),
      clearSession: () =>
        set({ email: null, verifiedEmail: null, pendingReport: null, pendingDraftId: null }),
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

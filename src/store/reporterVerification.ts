import { computePollBackoffMs } from '../api/uploads';

// A foreground observation budget, not a server SLA. No mutation is retried here.
export const REPORTER_VERIFICATION_BUDGET_MS = 180_000;
export async function waitForReporterVerification(options: {
  observe: () => Promise<boolean>;
  assertActive: () => void;
  onWaiting: (elapsedMs: number) => void;
  clock?: { now: () => number; sleep: (ms: number) => Promise<void> };
}): Promise<void> {
  const clock = options.clock ?? { now: Date.now, sleep: (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)) };
  const started = clock.now();
  for (let attempt = 0; attempt < 16; attempt++) {
    options.assertActive();
    const elapsed = clock.now() - started;
    if (elapsed >= REPORTER_VERIFICATION_BUDGET_MS) break;
    options.onWaiting(elapsed);
    await clock.sleep(Math.min(computePollBackoffMs(attempt), REPORTER_VERIFICATION_BUDGET_MS - elapsed));
    options.assertActive();
    if (clock.now() - started >= REPORTER_VERIFICATION_BUDGET_MS) break;
    const verified = await options.observe();
    options.assertActive();
    if (verified) return;
  }
  throw { code: 'verification_timeout' };
}

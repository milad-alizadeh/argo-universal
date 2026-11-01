import { describe, expect, it, vi } from 'vitest';
import {
  type RunHost,
  releaseAtRunEnd,
  runHostSchema,
} from './release-at-run-end';

const TEARDOWN_MS = 50;

function host(): RunHost {
  return { reporters: [], config: { teardownTimeout: TEARDOWN_MS } };
}

function endRun(runHost: RunHost): void {
  for (const reporter of runHost.reporters) reporter.onTestRunEnd?.();
}

describe('releaseAtRunEnd', () => {
  it('keeps the lock while the tests run', () => {
    const runHost = host();
    const release = vi.fn<() => void>();

    releaseAtRunEnd(runHost, release, vi.fn<() => void>());

    expect(release).not.toHaveBeenCalled();
  });

  it('hands the lock back the moment the tests end, before anything slow after them', () => {
    const runHost = host();
    const release = vi.fn<() => void>();

    releaseAtRunEnd(runHost, release, vi.fn<() => void>());
    endRun(runHost);

    expect(release).toHaveBeenCalledOnce();
  });

  it('ends a process that is still alive a teardown timeout after the tests ended', async () => {
    const runHost = host();
    const exit = vi.fn<() => void>();

    releaseAtRunEnd(runHost, vi.fn<() => void>(), exit);
    endRun(runHost);

    expect(exit).not.toHaveBeenCalled();
    await vi.waitFor((): void => expect(exit).toHaveBeenCalledOnce());
  });

  it('rejects a Vitest that stops exposing what it needs, rather than holding the lock unguarded', () => {
    expect(runHostSchema.safeParse({}).success).toBe(false);
    expect(runHostSchema.safeParse(host()).success).toBe(true);
  });
});

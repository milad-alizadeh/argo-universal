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

function endRun(runHost: RunHost, states: string[]): void {
  const modules = states.map((state) => ({ state: (): string => state }));

  for (const reporter of runHost.reporters) reporter.onTestRunEnd?.(modules);
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
    endRun(runHost, ['passed']);

    expect(release).toHaveBeenCalledOnce();
  });

  it('ends a process that is still alive a teardown timeout after the tests ended', async () => {
    const runHost = host();
    const exit = vi.fn<() => void>();

    releaseAtRunEnd(runHost, vi.fn<() => void>(), exit);
    endRun(runHost, ['passed']);

    expect(exit).not.toHaveBeenCalled();
    await vi.waitFor((): void => expect(exit).toHaveBeenCalledOnce());
  });

  it('marks the process failed when a test module failed, so ending it never reads as a pass', () => {
    const runHost = host();
    process.exitCode = undefined;

    releaseAtRunEnd(runHost, vi.fn<() => void>(), vi.fn<() => void>());
    endRun(runHost, ['passed', 'failed']);

    expect(process.exitCode).toBe(1);
    process.exitCode = undefined;
  });

  it('rejects a Vitest that stops exposing what it needs', () => {
    expect(runHostSchema.safeParse({}).success).toBe(false);
  });

  it('accepts what Vitest exposes', () => {
    expect(runHostSchema.safeParse(host()).success).toBe(true);
  });
});

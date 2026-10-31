import { afterEach, describe, expect, it, vi } from 'vitest';
import { HELD_VARIABLE, lockBrowserSuite } from './browser-suite-lock';
import { describeHolder, formatDuration } from './wait-message';

afterEach((): void => {
  vi.unstubAllEnvs();
});

describe('lockBrowserSuite', () => {
  it('skips the lock on CI, where each runner has one suite', async () => {
    vi.stubEnv('CI', 'true');

    await expect(lockBrowserSuite()).resolves.toBeUndefined();
  });

  it('skips the lock inside a `pnpm quality` that already holds it', async () => {
    vi.stubEnv('CI', '');
    vi.stubEnv(HELD_VARIABLE, '1');

    await expect(lockBrowserSuite()).resolves.toBeUndefined();
  });
});

describe('describeHolder', () => {
  const since = '2026-10-31T03:00:00.000Z';
  const now = Date.parse('2026-10-31T07:03:00.000Z');

  it('names the checkout, what it runs and how long it has held the lock', () => {
    const line = describeHolder(
      { pid: 7, cwd: '/wt/a', since, command: 'vitest run turn-end.test' },
      now,
    );

    expect(line).toContain('/wt/a');
    expect(line).toContain('`vitest run turn-end.test`');
    expect(line).toContain('held for 4h 3m');
  });

  it('still names a holder that predates the command', () => {
    expect(describeHolder({ pid: 7, cwd: '/wt/a', since }, now)).not.toContain(
      'running',
    );
  });
});

describe('formatDuration', () => {
  it('says seconds, minutes or hours by size', () => {
    expect(formatDuration(9000)).toBe('9s');
    expect(formatDuration(125_000)).toBe('2m 5s');
    expect(formatDuration(14_580_000)).toBe('4h 3m');
  });
});

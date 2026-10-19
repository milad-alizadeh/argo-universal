import { afterEach, describe, expect, it, vi } from 'vitest';
import { HELD_VARIABLE, lockBrowserSuite } from './browser-suite-lock';

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

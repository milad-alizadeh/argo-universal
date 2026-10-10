import { describe, expect, it } from 'vitest';
import type { ConnectionState } from '#features/connection';
import { liveUpdatesStopped } from './live-updates-stopped';

describe('liveUpdatesStopped', () => {
  it('is true when the subscription failed on an open Connection', () => {
    expect(liveUpdatesStopped('error', 'open')).toBe(true);
  });

  it.each(['reconnecting', 'offline'] satisfies ConnectionState[])(
    'is false while the Connection is %s',
    (connection) => {
      expect(liveUpdatesStopped('error', connection)).toBe(false);
    },
  );

  it.each(['pending', 'success', 'idle', 'connecting'])(
    'is false for a %s subscription',
    (status) => {
      expect(liveUpdatesStopped(status, 'open')).toBe(false);
    },
  );
});

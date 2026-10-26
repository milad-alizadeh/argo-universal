import { describe, expect, it } from 'vitest';
import { connectionStatus } from './settings-connection-status';

describe('connectionStatus', () => {
  it('is ready while the Connection is open', () => {
    expect(connectionStatus('open')).toBe('ready');
  });

  it('is loading while the Connection is first connecting', () => {
    expect(connectionStatus('connecting')).toBe('loading');
  });

  it.each(['reconnecting', 'offline'] as const)(
    'is disconnected while the Connection is %s',
    (state) => {
      expect(connectionStatus(state)).toBe('disconnected');
    },
  );
});

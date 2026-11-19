import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type EmptySessionHarness,
  emptySessionHarness,
  failure,
  settle,
  worktree,
} from '../../../../mocks/sessions/empty-session-store.mocks';

let h: EmptySessionHarness;

beforeEach(() => {
  vi.useFakeTimers();
  h = emptySessionHarness();
});

afterEach(() => {
  h.store.stop();
  vi.useRealTimers();
});

const initial = [{ configId: 'model', value: 'small' }];

describe('a Voice call started from New Session', () => {
  it('creates the Session with no prompt, goes to it, then starts the call for its id', async () => {
    const order: string[] = [];
    h.choose(worktree);
    h.store.configure({ initial });

    h.store.call((sessionId) => order.push(`start:${sessionId}`));
    expect(h.calls.open.map((call) => call.input)).toEqual([
      { ...worktree, configOptions: initial, prompt: [] },
    ]);
    expect(order).toEqual([]);
    h.calls.open[0]?.call.resolve({ sessionId: 'session-1' });
    await settle();

    expect(h.calls.handOff).toEqual(['session-1']);
    expect(order).toEqual(['start:session-1']);
  });

  it('starts no call when the Session could not be created', async () => {
    const start = vi.fn<(sessionId: string) => void>();
    h.choose(worktree);

    h.store.call(start);
    h.calls.open[0]?.call.reject(failure);
    await settle();

    expect(start).not.toHaveBeenCalled();
    expect(h.store.getState().attempt.status).toBe('failed');
  });
});

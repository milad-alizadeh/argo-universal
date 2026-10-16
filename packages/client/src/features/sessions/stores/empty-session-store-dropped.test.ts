import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  dropped,
  type EmptySessionHarness,
  emptySessionHarness,
  local,
  prompt,
  settle,
  worktree,
} from './empty-session-store.mocks';

let h: EmptySessionHarness;

beforeEach(() => {
  vi.useFakeTimers();
  h = emptySessionHarness();
});

afterEach(() => {
  h.store.stop();
  vi.useRealTimers();
});

describe('A Local open the Connection dropped', () => {
  it('is no launch failure: a toast says why', async () => {
    h.choose(local('agent-one'));
    h.calls.open[0]?.call.reject(dropped);
    await settle();

    expect(h.store.getState()).toMatchObject({
      attempt: { status: 'idle' },
      unreached: dropped,
    });
  });

  it('opens again when the Connection reopens', async () => {
    h.choose(local('agent-one'));
    h.calls.open[0]?.call.reject(dropped);
    await settle();

    h.reconnect();
    await h.openLocal('session-1');

    expect(h.calls.open).toHaveLength(2);
    expect(h.store.getState()).toMatchObject({
      attempt: { status: 'idle' },
      unreached: undefined,
    });
  });
});

describe('A New worktree create the Connection dropped', () => {
  it('drops a toast’s failure once Send creates it again', async () => {
    h.choose(worktree);
    h.store.send(prompt);
    h.calls.open[0]?.call.reject(dropped);
    await settle();
    expect(h.store.getState()).toMatchObject({
      attempt: { status: 'idle' },
      unreached: dropped,
      pendingPrompt: false,
    });

    h.store.send(prompt);

    expect(h.calls.open).toHaveLength(2);
    expect(h.store.getState()).toMatchObject({
      attempt: { status: 'idle' },
      unreached: undefined,
    });
  });
});

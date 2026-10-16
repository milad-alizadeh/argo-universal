import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  choiceDebounceMs,
  type EmptySessionHarness,
  emptySessionHarness,
  failure,
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

describe('New worktree checkout', () => {
  it('opens nothing before Send', async () => {
    h.choose(worktree);
    await vi.advanceTimersByTimeAsync(choiceDebounceMs);

    expect(h.calls.open).toEqual([]);
    expect(h.store.getState().opening).toBe(false);
  });

  it('creates one Session at Send with the chosen options and the prompt', () => {
    h.choose(worktree);
    const initial = [{ configId: 'model', value: 'small' }];
    h.store.configure({ saved: {}, picks: {}, initial });

    h.store.send(prompt);

    expect(h.calls.open.map(({ input }) => input)).toEqual([
      { ...worktree, configOptions: initial, prompt },
    ]);
  });

  it('puts the prompt back when the Session fails to open', async () => {
    h.choose(worktree);
    h.store.send(prompt);

    h.calls.open[0]?.call.reject(failure);
    await settle();

    expect(h.store.getState()).toMatchObject({
      pendingPrompt: false,
      error: { type: 'failed', message: failure.message },
      handedOff: false,
    });
    expect(h.calls.clearDraft).toBe(0);
  });

  it('closes the Local Empty Session when New worktree is chosen', async () => {
    h.choose(local('agent-one'));
    await h.openLocal('session-1');

    h.choose(worktree);
    await settle();

    expect(h.calls.close).toEqual(['session-1']);
    expect(h.calls.open).toHaveLength(1);
  });
});

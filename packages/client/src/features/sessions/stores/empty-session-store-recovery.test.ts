import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type EmptySessionHarness,
  emptySessionHarness,
  failure,
  local,
  options,
  prompt,
  promptOutput,
  settle,
  worktree,
} from './empty-session-store.mocks';

// Written out so the store cannot grade itself.
const promptShowTimeoutMs = 3_000;

let h: EmptySessionHarness;

beforeEach(() => {
  vi.useFakeTimers();
  h = emptySessionHarness();
});

afterEach(() => {
  h.store.stop();
  vi.useRealTimers();
});

describe('A Local first prompt that goes wrong', () => {
  it('puts the prompt back when the Server refuses it', async () => {
    h.choose(local('agent-one'));
    h.store.send(prompt);
    await h.openLocal('session-1');

    h.calls.prompt[0]?.call.reject(failure);
    await settle();

    expect(h.store.getState()).toMatchObject({
      attempt: {
        status: 'failed',
        error: { type: 'failed', message: failure.message },
      },
      pendingPrompt: false,
      handedOff: false,
    });
  });

  it('hands the Session on when its Feed never shows the prompt', async () => {
    h.choose(local('agent-one'));
    h.store.send(prompt);
    await h.openLocal('session-1');
    h.calls.prompt[0]?.call.resolve(promptOutput);
    await settle();

    await vi.advanceTimersByTimeAsync(promptShowTimeoutMs);

    expect(h.calls.handOff).toEqual(['session-1']);
  });
});

describe('A first prompt still on its way when the reader leaves', () => {
  it('hands nothing on', async () => {
    h.choose(worktree);
    h.store.send(prompt);
    h.store.stop();

    h.calls.open[0]?.call.resolve({ sessionId: 'session-1' });
    await settle();
    await vi.advanceTimersByTimeAsync(promptShowTimeoutMs);

    expect(h.calls.handOff).toEqual([]);
    expect(h.calls.clearDraft).toBe(0);
  });
});

describe("The reader's choices on the open Session", () => {
  it('reach it before the first prompt, which waits for its options', async () => {
    h.choose(local('agent-one'));
    h.store.send(prompt);
    h.calls.open[0]?.call.resolve({ sessionId: 'session-1' });
    await settle();
    expect(h.calls.prompt).toEqual([]);

    h.store.configure(
      { saved: {}, picks: { mode: 'plan' }, initial: [] },
      { sessionId: 'session-1', configOptions: options },
    );
    await settle();

    expect(h.calls.setConfigOption).toEqual([
      { configId: 'mode', value: 'plan' },
    ]);
    expect(h.calls.prompt.map(({ input }) => input)).toEqual(['session-1']);
  });

  it('tries a value the Session refuses only once', async () => {
    h.choose(local('agent-one'));
    await h.openLocal('session-1');
    const configuration = { saved: {}, picks: { mode: 'plan' }, initial: [] };
    const live = { sessionId: 'session-1', configOptions: options };

    h.store.configure(configuration, live);
    await settle();
    h.store.configure({ ...configuration }, live);
    await settle();

    expect(h.calls.setConfigOption).toEqual([
      { configId: 'mode', value: 'plan' },
    ]);
  });
});

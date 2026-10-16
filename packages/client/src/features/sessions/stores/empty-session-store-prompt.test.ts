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

describe('The first prompt on a Local checkout', () => {
  it('delivers a prompt sent while it opens once the open succeeds', async () => {
    h.choose(local('agent-one'));
    h.store.send(prompt);
    expect(h.store.getState().pendingPrompt).toBe(true);
    await settle();
    expect(h.calls.prompt).toEqual([]);

    await h.openLocal('session-1');

    expect(h.calls.prompt.map(({ input }) => input)).toEqual(['session-1']);
  });

  it('keeps a Send queued through a failed open and delivers it once Retry opens', async () => {
    h.choose(local('agent-one'));
    h.store.send(prompt);
    h.calls.open[0]?.call.reject(failure);
    await settle();
    expect(h.store.getState()).toMatchObject({
      error: failure.message,
      pendingPrompt: true,
    });

    h.store.retry();
    await h.openLocal('session-1');

    expect(h.calls.prompt.map(({ input }) => input)).toEqual(['session-1']);
  });

  it('gives the prompt back when the open a Send retried fails again', async () => {
    h.choose(local('agent-one'));
    h.calls.open[0]?.call.reject(failure);
    await settle();

    h.store.send(prompt);
    h.calls.open[1]?.call.reject(failure);
    await settle();

    expect(h.store.getState()).toMatchObject({
      error: failure.message,
      pendingPrompt: false,
    });
  });

  it('hands the prompted Session to its page once the Feed shows the prompt', async () => {
    h.choose(local('agent-one'));
    h.store.send(prompt);
    await h.openLocal('session-1');

    h.calls.prompt[0]?.call.resolve(promptOutput);
    await settle();
    h.store.feedShowsPrompt();

    expect(h.calls.handOff).toEqual(['session-1']);
    expect(h.calls.clearDraft).toBe(1);
    expect(h.store.getState().handedOff).toBe(true);
  });

  it('applies a pick to the open Session before the prompt', async () => {
    h.choose(local('agent-one'));
    await h.openLocal('session-1');

    h.store.configure(
      { saved: {}, picks: { mode: 'plan' }, initial: [] },
      { sessionId: 'session-1', configOptions: options },
    );
    await settle();

    expect(h.calls.setConfigOption).toEqual([
      { configId: 'mode', value: 'plan' },
    ]);
  });

  it('closes the Empty Session on leave', async () => {
    h.choose(local('agent-one'));
    await h.openLocal('session-1');

    h.store.stop();

    expect(h.calls.close).toEqual(['session-1']);
  });

  it('closes a Session that opens after the screen was left', async () => {
    h.choose(local('agent-one'));
    h.store.stop();

    h.calls.open[0]?.call.resolve({ sessionId: 'session-1' });
    await settle();

    expect(h.calls.close).toEqual(['session-1']);
  });

  it('keeps a prompted Session on leave', async () => {
    h.choose(local('agent-one'));
    h.store.send(prompt);
    await h.openLocal('session-1');

    h.store.stop();

    expect(h.calls.close).toEqual([]);
  });
});

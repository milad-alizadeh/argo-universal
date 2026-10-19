import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type EmptySessionHarness,
  emptySessionHarness,
  local,
  worktree,
  prompt,
  failure,
  authRequired,
  settle,
} from '../../../../mocks/sessions/empty-session-store.mocks';
import {
  dropped,
  serverError,
} from '../../../../mocks/sessions/open-failure.mocks';
let h: EmptySessionHarness;
beforeEach(() => {
  vi.useFakeTimers();
  h = emptySessionHarness();
});
afterEach(() => {
  h.store.stop();
  vi.useRealTimers();
});

describe.each([local('agent-one'), worktree])(
  'Send with $checkout.type',
  (input) => {
    it('opens nothing while choosing, then sends exactly once with the selected configuration', async () => {
      h.choose(input);
      await settle();
      expect(h.calls.open).toEqual([]);
      const initial = [
        { configId: 'model', value: 'small' },
        { configId: 'effort', value: 'low' },
      ];
      h.store.configure({ initial });
      h.store.send(prompt);
      h.store.send(prompt);
      expect(h.calls.open.map((call) => call.input)).toEqual([
        { ...input, configOptions: initial, prompt },
      ]);
    });
    it.each([failure, authRequired, serverError])(
      'retains the draft and exposes an opening failure',
      async (cause) => {
        h.choose(input);
        h.store.send(prompt);
        h.calls.open[0]?.call.reject(cause);
        await settle();
        expect(h.store.getState()).toMatchObject({
          pendingPrompt: false,
          attempt: { status: 'failed' },
          handedOff: false,
        });
        expect(h.calls.clearDraft).toBe(0);
        h.retry();
        expect(h.sendDraft).toHaveBeenCalledOnce();
        h.store.send(prompt);
        expect(h.calls.open).toHaveLength(2);
        expect(h.store.getState().attempt.status).toBe('retrying');
      },
    );
    it('does not resend on reconnect after a dropped creation', async () => {
      h.choose(input);
      h.store.send(prompt);
      h.drop();
      h.calls.open[0]?.call.reject(dropped);
      await settle();
      expect(h.store.getState()).toMatchObject({
        connectionError: dropped,
        pendingPrompt: false,
      });
      h.reconnect();
      await settle();
      expect(h.calls.open).toHaveLength(1);
      h.store.send(prompt);
      expect(h.store.getState().connectionError).toBeUndefined();
    });
    it('hands off and clears the draft once the Feed shows the prompt', async () => {
      h.choose(input);
      h.store.send(prompt);
      h.calls.open[0]?.call.resolve({ sessionId: 'session-1' });
      await settle();
      h.store.feedShowsPrompt();
      expect(h.calls.handOff).toEqual(['session-1']);
      expect(h.calls.clearDraft).toBe(1);
      h.store.feedShowsPrompt();
      expect(h.calls.clearDraft).toBe(1);
    });
    it('hands off after the Feed timeout', async () => {
      h.choose(input);
      h.store.send(prompt);
      h.calls.open[0]?.call.resolve({ sessionId: 'session-1' });
      await settle();
      await vi.advanceTimersByTimeAsync(3000);
      expect(h.calls.handOff).toEqual(['session-1']);
    });
    it('does not navigate or clear the draft if the reader leaves during Send', async () => {
      h.choose(input);
      h.store.send(prompt);
      h.store.stop();
      h.calls.open[0]?.call.resolve({ sessionId: 'session-1' });
      await settle();
      await vi.advanceTimersByTimeAsync(3000);
      expect(h.calls.handOff).toEqual([]);
      expect(h.calls.clearDraft).toBe(0);
    });
  },
);
it('uses the latest Agent and never sends stale incomplete choices', () => {
  h.choose(local('agent-one'));
  h.choose(local('agent-two'));
  h.choose();
  h.store.send(prompt);
  expect(h.calls.open).toEqual([]);
  h.choose(local('agent-two'));
  h.store.send(prompt);
  expect(h.calls.open[0]?.input.agent).toBe('agent-two');
});

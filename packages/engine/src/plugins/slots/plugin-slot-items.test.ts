import type { SlotCall } from '@repo/contracts/plugins/argo-calls';
import {
  sessionRowSlotId,
  type PluginEvent,
  type SlotItemsInput,
} from '@repo/contracts/plugins/wire';
import { expect, it } from 'vitest';
import type { PluginClock } from '../clock';
import { PluginSlotItems } from './plugin-slot-items';
import { itemsLeftOut } from './slot-item-calls';

const input: SlotItemsInput = {
  slotId: sessionRowSlotId,
  contexts: [{ sessionId: 'first', projectId: 'argo' }],
};

const manualClock = (): PluginClock & { fire: () => void } => {
  const timers = new Set<() => void>();

  return {
    now: () => 0,
    delay: async () => {},
    schedule: (callback) => {
      timers.add(callback);

      return () => timers.delete(callback);
    },
    fire: () => {
      for (const timer of timers) timer();
    },
  };
};

type WorkerCalls = {
  calls: PluginSlotItems;
  sent: PluginEvent[];
  clock: ReturnType<typeof manualClock>;
};

function workerCalls(): WorkerCalls {
  const sent: PluginEvent[] = [];
  const clock = manualClock();

  const calls = new PluginSlotItems({
    clock,
    send: (_pluginId, event): void => void sent.push(event),
  });

  calls.activate('counter', 1);
  calls.running('counter', 1);

  return { calls, sent, clock };
}

const answer = (id: number, text: string): SlotCall => ({
  action: 'items',
  id,
  items: { first: [{ text }] },
});

it('keeps an answer for its worker generation and asks a new generation again', async () => {
  const { calls, sent } = workerCalls();
  const first = calls.items('counter', input);

  calls.receive({ pluginId: 'counter', generation: 1 }, answer(0, 'one'));
  expect(await first).toEqual({
    ok: true,
    items: { first: [{ text: 'one' }] },
  });
  expect(await calls.items('counter', input)).toEqual({
    ok: true,
    items: { first: [{ text: 'one' }] },
  });
  expect(sent).toHaveLength(1);

  calls.release('counter');
  calls.activate('counter', 2);
  calls.running('counter', 2);
  const restarted = calls.items('counter', input);

  calls.receive({ pluginId: 'counter', generation: 1 }, answer(1, 'stale'));
  calls.receive({ pluginId: 'counter', generation: 2 }, answer(1, 'two'));
  expect(await restarted).toEqual({
    ok: true,
    items: { first: [{ text: 'two' }] },
  });
  expect(sent).toHaveLength(2);
});

it('leaves a Plugin out that is not running yet, answers late, or stops mid-call', async () => {
  const { calls, clock } = workerCalls();

  calls.activate('starting', 1);
  expect(await calls.items('starting', input)).toEqual({
    ok: false,
    reason: itemsLeftOut.notRunning,
  });

  const stopped = calls.items('counter', input);

  calls.release('counter');
  expect(await stopped).toEqual({ ok: false, reason: itemsLeftOut.notRunning });

  calls.activate('counter', 2);
  calls.running('counter', 2);

  const late = calls.items('counter', input);

  clock.fire();
  expect(await late).toEqual({ ok: false, reason: itemsLeftOut.late });
});

it('drops what a Plugin answered before its change signal', async () => {
  const { calls, sent } = workerCalls();
  const before = calls.changes.version;
  const asked = calls.items('counter', input);

  calls.receive(
    { pluginId: 'counter', generation: 1 },
    { action: 'changed', slotId: sessionRowSlotId },
  );
  calls.receive({ pluginId: 'counter', generation: 1 }, answer(0, 'old'));
  await asked;
  expect(calls.changes.version).toBeGreaterThan(before);

  void calls.items('counter', input);
  expect(sent).toHaveLength(2);
});

it('asks a failing Plugin again only after its change signal', async () => {
  const { calls, sent } = workerCalls();
  const caller = { pluginId: 'counter', generation: 1 };
  const asked = calls.items('counter', input);

  calls.receive(caller, { action: 'failed', id: 0, error: 'broken' });

  expect(await asked).toEqual({ ok: false, reason: itemsLeftOut.threw });
  expect(await calls.items('counter', input)).toEqual({
    ok: false,
    reason: itemsLeftOut.threw,
  });
  expect(sent).toHaveLength(1);

  calls.receive(caller, { action: 'changed', slotId: sessionRowSlotId });
  void calls.items('counter', input);
  expect(sent).toHaveLength(2);
});

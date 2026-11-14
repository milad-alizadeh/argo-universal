import type { SlotCall } from '@repo/contracts/plugins/argo-calls';
import {
  sessionBarSlotId,
  sessionRowSlotId,
  type PluginEvent,
  type SlotItemsInput,
} from '@repo/contracts/plugins/wire';
import { expect, it } from 'vitest';
import type { PluginClock } from '../clock';
import { WorkerCalls } from '../runtime/worker-calls';
import { itemsLeftOut } from './kept-items';
import { PluginSlotItems } from './plugin-slot-items';

const nothing = (): void => {};

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

type SlotItems = {
  calls: PluginSlotItems;
  workers: WorkerCalls;
  sent: PluginEvent[];
  clock: ReturnType<typeof manualClock>;
};

function slotItems(): SlotItems {
  const sent: PluginEvent[] = [];
  const clock = manualClock();

  const workers = new WorkerCalls({
    clock,
    send: (_pluginId, event): void => void sent.push(event),
  });

  const calls = new PluginSlotItems(workers, clock, { written: nothing });

  workers.run('counter', 1);

  return { calls, workers, sent, clock };
}

const answer = (id: number, text: string): SlotCall => ({
  action: 'items',
  id,
  items: { first: [{ text }] },
});

it('keeps all Session bar lines when a Session has more than 500 attachments', async () => {
  const { calls } = slotItems();

  const items = Array.from({ length: 501 }, (_, index) => ({
    text: `#${index + 1} · Open`,
    action: { path: `/issues/${index + 1}` },
  }));

  const pending = calls.items('counter', {
    ...input,
    slotId: sessionBarSlotId,
  });

  calls.receive(
    { pluginId: 'counter', generation: 1 },
    {
      action: 'items',
      id: 0,
      items: { first: items },
    },
  );
  expect(await pending).toEqual({ ok: true, items: { first: items } });
});

it('keeps an answer for its worker generation and asks a new generation again', async () => {
  const { calls, workers, sent } = slotItems();
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

  workers.release('counter');
  workers.run('counter', 2);
  const restarted = calls.items('counter', input);

  calls.receive({ pluginId: 'counter', generation: 2 }, answer(1, 'two'));
  expect(await restarted).toEqual({
    ok: true,
    items: { first: [{ text: 'two' }] },
  });
  expect(sent).toHaveLength(2);
});

it('leaves a Plugin out that is not running, stops mid-call or answers late', async () => {
  const { calls, workers, clock } = slotItems();

  expect(await calls.items('starting', input)).toEqual({
    ok: false,
    reason: itemsLeftOut.notRunning,
  });

  const stopped = calls.items('counter', input);

  workers.release('counter');
  expect(await stopped).toEqual({ ok: false, reason: itemsLeftOut.notRunning });

  workers.run('counter', 2);

  const late = calls.items('counter', input);

  clock.fire();
  expect(await late).toEqual({ ok: false, reason: itemsLeftOut.late });
});

it('drops what a Plugin answered before its change signal', async () => {
  const { calls, sent } = slotItems();
  const before = calls.changes.version;
  const asked = calls.items('counter', input);

  calls.changed('counter');
  calls.receive({ pluginId: 'counter', generation: 1 }, answer(0, 'old'));
  await asked;
  expect(calls.changes.version).toBeGreaterThan(before);

  void calls.items('counter', input);
  expect(sent).toHaveLength(2);
});

it('asks a failing Plugin again only after its change signal', async () => {
  const { calls, sent } = slotItems();
  const caller = { pluginId: 'counter', generation: 1 };
  const asked = calls.items('counter', input);

  calls.receive(caller, { action: 'failed', id: 0, error: 'broken' });

  expect(await asked).toEqual({ ok: false, reason: itemsLeftOut.threw });
  expect(await calls.items('counter', input)).toEqual({
    ok: false,
    reason: itemsLeftOut.threw,
  });
  expect(sent).toHaveLength(1);

  calls.changed('counter');
  void calls.items('counter', input);
  expect(sent).toHaveLength(2);
});

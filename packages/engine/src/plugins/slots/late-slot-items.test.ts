import type { SlotCall } from '@repo/contracts/plugins/argo-calls';
import {
  sessionRowSlotId,
  type PluginEvent,
  type SlotItemsInput,
} from '@repo/contracts/plugins/wire';
import { expect, it } from 'vitest';
import type { PluginClock } from '../clock';
import { WorkerCalls } from '../runtime/worker-calls';
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
  clock: ReturnType<typeof manualClock>;
  sent: PluginEvent[];
};

// The clock's timers run only when a test fires them, so a call runs late on demand.
function slotItems(): SlotItems {
  const sent: PluginEvent[] = [];
  const clock = manualClock();

  const workers = new WorkerCalls({
    clock,
    send: (_pluginId, event): void => void sent.push(event),
  });

  const calls = new PluginSlotItems(workers, clock, { written: nothing });

  workers.run('counter', 1);

  return { calls, clock, sent };
}

const answer = (id: number, text: string): SlotCall => ({
  action: 'items',
  id,
  items: { first: [{ text }] },
});

it('answers a late Plugin with what it last answered, until its next change signal', async () => {
  const { calls, clock, sent } = slotItems();
  const caller = { pluginId: 'counter', generation: 1 };
  const first = calls.items('counter', input);

  calls.receive(caller, answer(0, 'one'));
  await first;
  calls.changed('counter');

  const late = calls.items('counter', input);

  clock.fire();
  expect(await late).toEqual({
    ok: true,
    items: { first: [{ text: 'one' }] },
    late: true,
  });
  expect(await calls.items('counter', input)).toEqual({
    ok: true,
    items: { first: [{ text: 'one' }] },
    late: true,
  });
  expect(sent).toHaveLength(2);

  calls.changed('counter');
  const asked = calls.items('counter', input);

  calls.receive(caller, answer(2, 'two'));
  expect(await asked).toEqual({
    ok: true,
    items: { first: [{ text: 'two' }] },
  });
});

it('answers a late Plugin with no items for a Session it never answered', async () => {
  const { calls, clock } = slotItems();
  const caller = { pluginId: 'counter', generation: 1 };
  const first = calls.items('counter', input);

  calls.receive(caller, answer(0, 'one'));
  await first;
  calls.changed('counter');

  const both: SlotItemsInput = {
    ...input,
    contexts: [...input.contexts, { sessionId: 'second', projectId: 'argo' }],
  };

  const late = calls.items('counter', both);

  clock.fire();
  expect(await late).toEqual({
    ok: true,
    items: { first: [{ text: 'one' }], second: [] },
    late: true,
  });
});

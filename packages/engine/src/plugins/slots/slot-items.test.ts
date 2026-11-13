import {
  itemsSlot,
  sessionChangesSlotId,
  type PluginEvent,
  type SlotItemsInput,
} from '@repo/contracts/plugins/wire';
import { expect, it, vi } from 'vitest';
import type { PluginClock } from '../clock';
import { WorkerCalls } from '../runtime/worker-calls';
import { PluginSlotItems } from './plugin-slot-items';
import { watchSlotItems, type Contributors } from './slot-items';

const input: SlotItemsInput = {
  slotId: sessionChangesSlotId,
  contexts: [{ sessionId: 'first', projectId: 'argo' }],
};

const refreshMs = itemsSlot(sessionChangesSlotId)?.content.refreshMs;

const nothing = (): void => {};

type Harness = {
  calls: PluginSlotItems;
  // What the Plugin was asked.
  sent: PluginEvent[];
  // The refresh timers set and not yet cancelled or fired.
  refreshTimers: () => number;
  contributors: Contributors;
};

// One Plugin that fills the Changes Slot, over a clock that only counts what is scheduled.
function harness(): Harness {
  const timers = new Set<number>();
  const sent: PluginEvent[] = [];

  const clock: PluginClock = {
    now: (): number => 0,
    delay: async (): Promise<void> => {},
    schedule: (_callback, ms): (() => void) => {
      timers.add(ms);

      return (): void => void timers.delete(ms);
    },
  };

  const workers = new WorkerCalls({
    clock,
    send: (_pluginId, event): void => void sent.push(event),
  });

  const calls = new PluginSlotItems(workers, clock, { written: nothing });

  workers.run('github', 1);

  return {
    calls,
    sent,
    refreshTimers: () => (refreshMs === undefined ? 0 : +timers.has(refreshMs)),
    contributors: {
      pluginIds: ['github'],
      input,
      surface: undefined,
      failed: nothing,
      start: async (): Promise<void> => {},
      enabled: (): boolean => true,
    },
  };
}

const answer = { action: 'items', id: 0, items: { first: [] } } as const;

// Opens a list and waits for its first answer, so its clock is held.
async function opened(
  { calls, contributors, sent }: Harness,
  signal: AbortSignal,
): Promise<AsyncGenerator<unknown>> {
  const list = watchSlotItems(calls, contributors, signal);
  const first = list.next();

  await vi.waitFor(() => expect(sent).toHaveLength(1));
  calls.receive({ pluginId: 'github', generation: 1 }, answer);
  await first;

  return list;
}

it('holds the Slot clock only while the list is open: aborting the list releases it', async () => {
  const run = harness();
  const controller = new AbortController();
  const list = await opened(run, controller.signal);

  expect(run.refreshTimers()).toBe(1);

  controller.abort();
  await list.next();

  expect(run.refreshTimers()).toBe(0);
});

it('releases the Slot clock when the App stops reading the list without aborting it', async () => {
  const run = harness();
  const list = await opened(run, new AbortController().signal);

  expect(run.refreshTimers()).toBe(1);

  await list.return(null);

  expect(run.refreshTimers()).toBe(0);
});

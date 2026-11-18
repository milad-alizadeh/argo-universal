import type { PluginEvent } from '@repo/contracts/plugins/wire';
import type { PluginClock } from '../clock';
import { WorkerCalls } from '../runtime/worker-calls';
import { PluginSlotItems } from './plugin-slot-items';

const nothing = (): void => {};

// A clock whose timers run only when the test fires them, so a call runs late exactly when the test says.
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

export type SlotItems = {
  calls: PluginSlotItems;
  workers: WorkerCalls;
  sent: PluginEvent[];
  clock: ReturnType<typeof manualClock>;
};

// One running Plugin, `counter`, over a manual clock, with every event sent to it.
export function slotItems(): SlotItems {
  const sent: PluginEvent[] = [];
  const clock = manualClock();

  const workers = new WorkerCalls({
    clock,
    send: (_pluginId, event): void => void sent.push(event),
  });

  const calls = new PluginSlotItems(workers, clock, {
    writes: { dueWhenOlder: nothing },
  });

  workers.run('counter', 1);

  return { calls, workers, sent, clock };
}

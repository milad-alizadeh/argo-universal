import type { PluginEvent } from '@repo/contracts/plugins/wire';
import type { PluginClock } from '../clock';
import { WorkerCalls } from '../runtime/worker-calls';
import { PluginSlotItems } from './plugin-slot-items';

const nothing = (): void => {};

type Timer = { callback: () => void; ms: number };

type Timers = Set<Timer>;

// Runs, once, each timer set for at most `ms`.
function fireUpTo(timers: Timers, ms: number): void {
  const due = [...timers].filter((timer) => timer.ms <= ms);

  for (const timer of due) timers.delete(timer);

  for (const timer of due) timer.callback();
}

/*
 * A clock whose timers run only when the test fires them, so a call runs late exactly when the test says. `fire(ms)`
 * runs only the timers set for at most `ms`; `fire()` runs them all.
 */
const manualClock = (): PluginClock & { fire: (ms?: number) => void } => {
  const timers: Timers = new Set();

  return {
    now: () => 0,
    delay: async () => {},
    schedule: (callback, ms) => {
      const timer = { callback, ms };

      timers.add(timer);

      return () => timers.delete(timer);
    },
    fire: (ms = Infinity) => fireUpTo(timers, ms),
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

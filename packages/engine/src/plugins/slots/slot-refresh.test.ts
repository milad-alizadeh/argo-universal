import { expect, it } from 'vitest';
import type { PluginClock } from '../clock';
import { SlotRefresh } from './slot-refresh';

const every = 30_000;

const asking = 'ask github';

type Timer = { callback: () => void; ms: number };

type Harness = {
  refreshing: SlotRefresh;
  timers: Set<Timer>;
  tick: () => void;
  asked: string[];
  running: Set<string>;
};

function refresh(): Harness {
  const timers = new Set<Timer>();
  const asked: string[] = [];
  const running = new Set(['github']);

  const clock: PluginClock = {
    now: (): number => 0,
    delay: async (): Promise<void> => {},
    schedule: (callback, ms): (() => void) => {
      const timer = { callback, ms };

      timers.add(timer);

      return (): void => void timers.delete(timer);
    },
  };

  const refreshing = new SlotRefresh({
    clock,
    running: (pluginId): boolean => running.has(pluginId),
    due: (pluginId): void => void asked.push(`due ${pluginId}`),
    ask: (pluginId): void => void asked.push(`ask ${pluginId}`),
  });

  // The clock runs out once: what it fires, it re-arms itself.
  const tick = (): void => {
    for (const timer of timers) {
      timers.delete(timer);
      timer.callback();

      return;
    }
  };

  return { refreshing, timers, tick, asked, running };
}

it('makes the Plugin due and asks it again on each tick while a list holds the clock', () => {
  const { refreshing, tick, asked } = refresh();

  refreshing.hold(['github'], every);
  tick();
  tick();

  expect(asked).toEqual(['due github', asking, 'due github', asking]);
});

it('runs one clock for every list that holds it, and stops when the last lets go', () => {
  const { refreshing, timers } = refresh();
  const workbench = refreshing.hold(['github'], every);
  const inspector = refreshing.hold(['github'], every);

  expect(timers.size).toBe(1);

  workbench();
  expect(timers.size).toBe(1);

  inspector();
  expect(timers.size).toBe(0);
});

it('only asks again, and makes nothing due, while the Plugin is not running', () => {
  const { refreshing, tick, asked, running } = refresh();

  running.delete('github');
  refreshing.hold(['github'], every);
  tick();

  expect(asked).toEqual([asking]);
});

it('sets the timer afresh when the Plugin stops or starts, never keeping two', () => {
  const { refreshing, timers } = refresh();

  refreshing.hold(['github'], every);
  refreshing.restarted('github');
  refreshing.restarted('github');

  expect(timers.size).toBe(1);
});

it('asks nothing once closed', () => {
  const { refreshing, timers } = refresh();

  refreshing.hold(['github'], every);
  refreshing.close();

  expect(timers.size).toBe(0);
});

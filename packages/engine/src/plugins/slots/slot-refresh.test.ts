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
  off: Set<string>;
  enabled: (pluginId: string) => boolean;
};

function refresh(): Harness {
  const timers = new Set<Timer>();
  const asked: string[] = [];
  const running = new Set(['github']);
  const off = new Set<string>();

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

  const enabled = (pluginId: string): boolean => !off.has(pluginId);

  return { refreshing, timers, tick, asked, running, off, enabled };
}

it('makes the Plugin due and asks it again on each tick while a list holds the clock', () => {
  const { refreshing, tick, asked, enabled } = refresh();

  refreshing.hold(['github'], every, enabled);
  tick();
  tick();

  expect(asked).toEqual(['due github', asking, 'due github', asking]);
});

it('runs one clock for every list that holds it, and stops when the last lets go', () => {
  const { refreshing, timers, enabled } = refresh();
  const workbench = refreshing.hold(['github'], every, enabled);
  const inspector = refreshing.hold(['github'], every, enabled);

  expect(timers.size).toBe(1);

  workbench();
  expect(timers.size).toBe(1);

  inspector();
  expect(timers.size).toBe(0);
});

it('only asks again, and makes nothing due, while the Plugin is on but not running', () => {
  const { refreshing, tick, asked, running, enabled } = refresh();

  running.delete('github');
  refreshing.hold(['github'], every, enabled);
  tick();

  expect(asked).toEqual([asking]);
});

it('releases the clock of a Plugin the person turns off, and sets it again when they turn it on', () => {
  const { refreshing, timers, tick, off, enabled } = refresh();

  refreshing.hold(['github'], every, enabled);
  expect(timers.size).toBe(1);

  off.add('github');
  refreshing.restarted('github');
  expect(timers.size).toBe(0);

  off.delete('github');
  refreshing.restarted('github');
  expect(timers.size).toBe(1);

  // A tick that finds the Plugin turned off since does not set the clock again.
  off.add('github');
  tick();
  expect(timers.size).toBe(0);
});

it('sets the timer afresh when the Plugin stops or starts, never keeping two', () => {
  const { refreshing, timers, enabled } = refresh();

  refreshing.hold(['github'], every, enabled);
  refreshing.restarted('github');
  refreshing.restarted('github');

  expect(timers.size).toBe(1);
});

it('asks nothing once closed', () => {
  const { refreshing, timers, enabled } = refresh();

  refreshing.hold(['github'], every, enabled);
  refreshing.close();

  expect(timers.size).toBe(0);
});

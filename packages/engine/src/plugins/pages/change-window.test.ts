import { expect, it } from 'vitest';
import type { PluginClock } from '../clock';
import { ChangeWindow, changeWindowMs } from './change-window';

type Timer = { callback: () => void; ms: number };

type Windowed = {
  changes: ChangeWindow;
  settled: string[];
  timers: Set<Timer>;
  elapse: () => void;
};

function windowed(): Windowed {
  const timers = new Set<Timer>();
  const settled: string[] = [];

  const clock: PluginClock = {
    now: (): number => 0,
    delay: async (): Promise<void> => {},
    schedule: (callback, ms): (() => void) => {
      const timer = { callback, ms };

      timers.add(timer);

      return (): void => void timers.delete(timer);
    },
  };

  const changes = new ChangeWindow(
    clock,
    async (pluginId): Promise<void> => {
      settled.push(pluginId);
    },
    (): null => null,
  );

  const elapse = (): void => {
    for (const timer of timers.values().toArray()) {
      timers.delete(timer);
      timer.callback();
    }
  };

  return { changes, settled, timers, elapse };
}

it('settles a Plugin once for every change that lands inside one window', () => {
  const { changes, settled, timers, elapse } = windowed();

  for (let call = 0; call < 5; call += 1) changes.request('github');

  expect([...timers].map(({ ms }) => ms)).toEqual([changeWindowMs]);
  expect(settled).toEqual([]);

  elapse();
  expect(settled).toEqual(['github']);
});

it('keeps the windows of different Plugins apart, and opens a new one after a window ends', () => {
  const { changes, settled, elapse } = windowed();

  changes.request('github');
  changes.request('tracker');
  elapse();
  changes.request('github');
  elapse();

  expect(settled).toEqual(['github', 'tracker', 'github']);
});

it('settles nothing once closed', () => {
  const { changes, settled, timers } = windowed();

  changes.request('github');
  changes.close();

  expect(timers.size).toBe(0);
  expect(settled).toEqual([]);
});

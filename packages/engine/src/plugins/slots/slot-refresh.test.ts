import { sessionRowSlotId } from '@repo/contracts/plugins/wire';
import { expect, it } from 'vitest';
import type { PluginClock } from '../clock';
import { refreshFor, SlotRefresh, type Shown } from './slot-refresh';

const every = 30_000;

const asking = `ask github ${sessionRowSlotId} 30000`;

const list: Shown = {
  slotId: sessionRowSlotId,
  contexts: [{ sessionId: 'first', projectId: 'argo' }],
};

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
    ask: (pluginId, shown, ms): void =>
      void asked.push(
        `ask ${pluginId} ${shown.map(({ slotId }) => slotId).join()} ${ms}`,
      ),
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

it('asks the contexts the list shows again on each tick while a list holds the clock', () => {
  const { refreshing, tick, asked, enabled } = refresh();

  refreshing.hold(['github'], { ms: every, enabled }, list);
  tick();
  tick();

  expect(asked).toEqual([asking, asking]);
});

it('runs one clock for every list that holds it, and stops when the last lets go', () => {
  const { refreshing, timers, enabled } = refresh();
  const workbench = refreshing.hold(['github'], { ms: every, enabled }, list);
  const inspector = refreshing.hold(['github'], { ms: every, enabled }, list);

  expect(timers.size).toBe(1);

  workbench();
  expect(timers.size).toBe(1);

  inspector();
  expect(timers.size).toBe(0);
});

it('ages the Queries a Slot read, only of a running Plugin, and asks the shown contexts again', () => {
  const calls: string[] = [];
  const fires: Array<() => void> = [];
  const generations = new Map([['github', 1]]);

  const parts = {
    clock: {
      now: (): number => 0,
      delay: async (): Promise<void> => {},
      schedule: (callback: () => void): (() => void) => {
        fires.push(callback);

        return (): void => {};
      },
    },
    data: {
      writes: {
        dueWhenOlder: (id: string, ms: number): void =>
          void calls.push(`older ${id} ${ms}`),
      },
    },
    items: {
      askAgain: (id: string, shown: readonly Shown[]): void =>
        void calls.push(`again ${id} ${shown.length}`),
    },
  };

  const hold = { ms: 1000, enabled: (): boolean => true };

  refreshFor({ generation: (id) => generations.get(id) }, parts).hold(
    ['github', 'tracker'],
    hold,
    list,
  );

  for (const fire of fires.values().toArray()) fire();

  expect(calls).toEqual([
    'older github 900',
    'again github 1',
    'again tracker 1',
  ]);
});

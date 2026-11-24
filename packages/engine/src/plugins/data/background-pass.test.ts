import { expect, it } from 'vitest';
import type { PluginClock } from '../clock';
import {
  BackgroundPass,
  type BackgroundEntry,
  type BackgroundServices,
} from './background-pass';
import { PluginBackground } from './plugin-background';
import { backgroundBudgetMs } from './query-intervals';

type Timer = { at: number; run: () => void };

// A clock that moves only when told, so a pass's budget and interval are exact.
function steppedClock(): PluginClock & { advance: (ms: number) => void } {
  let now = 0;
  const timers = new Set<Timer>();

  return {
    now: () => now,
    delay: () => Promise.resolve(),
    schedule: (run, ms) => {
      const timer = { at: now + ms, run };

      timers.add(timer);

      return () => timers.delete(timer);
    },
    advance: (ms) => {
      now += ms;

      for (const timer of [...timers].sort((a, b) => a.at - b.at))
        if (timer.at <= now && timers.delete(timer)) timer.run();
    },
  };
}

const tick = async (): Promise<void> => {
  for (let n = 0; n < 10; n += 1) await Promise.resolve();
};

it('never has two loads in flight while a Watch overruns its budget', async () => {
  const clock = steppedClock();
  const lines: string[] = [];
  const finishes: (() => void)[] = [];
  let inFlight = 0;
  let peak = 0;
  let started = 0;

  const draws: BackgroundServices['draws'] = {
    load: (): Promise<{ ok: true }> => {
      started += 1;
      inFlight += 1;
      peak = Math.max(peak, inFlight);

      return new Promise((resolve) => {
        finishes.push(() => {
          inFlight -= 1;
          resolve({ ok: true });
        });
      });
    },
  };

  const services: BackgroundServices & {
    enter: () => Promise<() => void>;
  } = {
    clock,
    log: (line) => lines.push(line),
    kind: 'watch',
    draws,
    projectRemoved: () => {},
    enter: () => Promise.resolve(() => {}),
  };

  const entry: BackgroundEntry = {
    pluginId: 'github',
    declaration: { path: '/', interval: 60_000 },
    activate: () => Promise.resolve(),
  };

  new BackgroundPass(entry, 'project-1', services).start();
  await tick();

  clock.advance(backgroundBudgetMs);
  await tick();
  expect(lines.some((line) => line.includes('reached'))).toBe(true);

  // The interval passes many times over while the first load still runs.
  clock.advance(10 * 60_000);
  await tick();

  expect(started).toBe(1);
  expect(peak).toBe(1);

  finishes[0]?.();
  await tick();
  clock.advance(60_000);
  await tick();

  expect(started).toBe(2);
  expect(peak).toBe(1);
});

it('lets another Project’s pass start once the first have overrun their budget', async () => {
  const clock = steppedClock();
  const loaded: string[] = [];

  const background = new PluginBackground({
    clock,
    log: (): void => {},
    kind: 'watch',
    projectRemoved: (): void => {},
    // Every load waits on its Plugin and never answers.
    draws: {
      load: (_pluginId, { projectId }): Promise<never> => {
        loaded.push(projectId);

        return new Promise<never>(() => {});
      },
    },
  });

  background.configure('github', { path: '/', interval: 60_000 }, () =>
    Promise.resolve(),
  );
  // More Projects than the gate lets run at once.
  background.syncProjects(['p1', 'p2', 'p3', 'p4', 'p5']);
  await tick();
  expect(loaded).toHaveLength(4);

  clock.advance(backgroundBudgetMs);
  await tick();

  expect(loaded).toContain('p5');
  background.close();
});

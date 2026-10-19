import { expect, it, vi } from 'vitest';
import { createPluginRealm } from './realm';
import { PluginTestClock } from './test-clock';

/*
 * Stands in for the kit bundle: it takes the timers the realm hands it, as
 * kit/scheduler.ts does. `run` reads `setTimeout` when called, after the test
 * clock is installed, so it schedules a Plugin timer.
 */
const kitSource = `
  const kitTimers = globalThis.__argoKitTimers;
  delete globalThis.__argoKitTimers;
  globalThis.__argoKit = { createKit: () => ({}) };
  globalThis.run = (record) => {
    setTimeout(() => record('plugin'), 1000);
    kitTimers.cancel(kitTimers.schedule(() => record('cancelled'), 0));
    kitTimers.schedule(() => record('kit'), 0);
  };
`;

it('keeps kit timers real and apart from Plugin timers under a test clock', async () => {
  const clock = new PluginTestClock();
  const realm = createPluginRealm(async () => 'null', kitSource, clock);
  const fired: string[] = [];

  realm.run((name: string) => fired.push(name));
  await vi.waitFor(() => expect(fired).toEqual(['kit']));
  await clock.advance(1000);
  expect(fired).toEqual(['kit', 'plugin']);
});

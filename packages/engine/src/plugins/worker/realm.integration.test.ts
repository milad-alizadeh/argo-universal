import { expect, it, vi } from 'vitest';
import { createPluginRealm } from './realm';
import { bundleRealm } from './realm-bundle';
import { PluginTestClock } from './test-clock';

/*
 * Stands in for the kit: it keeps the timers the realm has as it loads, as
 * kit/scheduler.ts does. `run` reads `setTimeout` when called, after the test
 * clock is installed, so it schedules a Plugin timer.
 */
const api = `
  const kitTimers = { schedule: setTimeout, cancel: clearTimeout };
  globalThis.__argoRealm = () => ({});
  globalThis.run = (record) => {
    setTimeout(() => record('plugin'), 1000);
    kitTimers.cancel(kitTimers.schedule(() => record('cancelled'), 0));
    kitTimers.schedule(() => record('kit'), 0);
  };
`;

it('keeps kit timers real and apart from Plugin timers under a test clock', async () => {
  const clock = new PluginTestClock();

  const { clock: realmClock } = await bundleRealm();

  const { context } = createPluginRealm(
    async () => 'null',
    { clock: realmClock, api },
    clock,
  );

  const fired: string[] = [];

  context.run((name: string) => fired.push(name));
  await vi.waitFor(() => expect(fired).toEqual(['kit']));
  await clock.advance(1000);
  expect(fired).toEqual(['kit', 'plugin']);
});

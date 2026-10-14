import { expect, it, afterEach, onTestFinished, vi } from 'vitest';
import { openTestDatabase, readAddedAgentRows } from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';
import { listedAgent, pathNpmCommand, pathNpmEntry } from '#mocks/installation';
import { createMachinePath } from '#mocks/machine-path';
import type { FetchAgents } from '../index';
import { npmTimeoutMs } from '../registry/npm-command';

const npmEntry = pathNpmEntry();

const registry = { version: '1.0.0', agents: [npmEntry] };

afterEach(() => vi.useRealTimers());

// npm never answers; the Registry answers at once.
type HeldNpm = { signals: AbortSignal[]; fetchAgents: FetchAgents };

const npmHeld = (): HeldNpm => {
  const signals: AbortSignal[] = [];

  return {
    signals,
    fetchAgents: async (signal, npmRelease) => {
      if (!npmRelease) return JSON.stringify(registry);
      signals.push(signal);

      return new Promise(() => {});
    },
  };
};

it('an npm read slower than its time limit is given up and the catalog sync commits without its command', async () => {
  const machine = await createMachinePath();
  await machine.place(pathNpmCommand);
  const npm = npmHeld();

  const host = await startEngineTestHost({
    fixtureAgents: [],
    fetchAgents: npm.fetchAgents,
  });

  vi.useFakeTimers();
  await host.caller.agents.syncCatalog();
  await vi.advanceTimersByTimeAsync(npmTimeoutMs - 1);
  expect(npm.signals.map(({ aborted }) => aborted)).toEqual([false]);
  await vi.advanceTimersByTimeAsync(1);
  expect(npm.signals.map(({ aborted }) => aborted)).toEqual([true]);
  vi.useRealTimers();
  await expect
    .poll(async () => (await host.caller.agents.catalog()).syncStatus)
    .toBe('idle');
  const [listed] = (await host.caller.agents.catalog()).agents;

  if (!listed) throw new Error('The catalog sync did not commit');
  expect(listed.entry.id).toBe(npmEntry.id);
  await host.caller.agents.list({ refresh: true });
  expect(await listedAgent(host.caller, listed.id)).toBeUndefined();
}, 30_000);

it('Server shutdown aborts a pending npm read and commits no catalog rows', async () => {
  const stored = openTestDatabase();
  onTestFinished(stored.remove);
  const npm = npmHeld();

  const host = await startEngineTestHost({
    fixtureAgents: [],
    database: stored.database,
    fetchAgents: npm.fetchAgents,
  });

  await host.caller.agents.syncCatalog();
  await expect.poll(() => npm.signals.length).toBe(1);
  await host.stop();
  expect(npm.signals[0]?.aborted).toBe(true);
  expect(readAddedAgentRows(stored.database)).toEqual([]);
}, 30_000);

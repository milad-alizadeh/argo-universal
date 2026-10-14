import { scenarios } from '@repo/mocks/agent/scenarios';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import {
  listedAgent,
  pathAgents,
  pathBinaryEntry,
  pathEntrypoint,
  startInstallEngine,
} from '#mocks/installation';
import { createMachinePath } from '#mocks/machine-path';
import { createScriptedAgentProcess } from '#mocks/scripted-agent';

// With the Registry and npm unreachable from Server start, only names saved by the catalog sync can find an Agent.
type UnreachableRegistry = {
  asked: unknown[][];
  fetchAgents: (...request: unknown[]) => Promise<never>;
};

const unreachableRegistry = (): UnreachableRegistry => {
  const asked: unknown[][] = [];

  return {
    asked,
    fetchAgents: async (...request) => {
      asked.push(request);
      throw new Error('The Registry is unreachable');
    },
  };
};

it.each(pathAgents)(
  'Server start looks for a saved $kind Agent on PATH by its saved name, without asking the Registry, and checks it before anything lists it',
  async ({ entry, command }) => {
    const machine = await createMachinePath();

    const first = await startInstallEngine(entry, undefined, {
      fixtureAgents: [],
    });

    expect(await listedAgent(first.caller, first.agentId)).toBeUndefined();
    await first.stop();
    const file = await machine.place(command);
    const checks = createScriptedAgentProcess(scenarios.reply);
    const registry = unreachableRegistry();

    const second = await startEngineTestHost({
      home: first.home,
      fixtureAgents: [],
      acp: checks,
      keepStartupLaunches: true,
      fetchAgents: registry.fetchAgents,
    });

    await expect
      .poll(() => checks.processes.map(({ launch }) => launch.executable))
      .toEqual([file]);
    expect(await listedAgent(second.caller, first.agentId)).toMatchObject({
      status: 'ready',
      enabled: true,
      owner: 'unknown',
    });
    expect(registry.asked).toEqual([]);
    await second.stop();
  },
  30_000,
);

it('Server start shows Not found for an Agent that left PATH while the Server was stopped, without launching it', async () => {
  const machine = await createMachinePath();
  await machine.place(pathEntrypoint);

  const first = await startInstallEngine(pathBinaryEntry(), undefined, {
    fixtureAgents: [],
    acp: createScriptedAgentProcess(scenarios.reply),
  });

  await expect
    .poll(() => listedAgent(first.caller, first.agentId))
    .toMatchObject({ status: 'ready', owner: 'unknown' });
  await first.stop();
  await machine.remove(pathEntrypoint);
  const checks = createScriptedAgentProcess(scenarios.reply);

  const second = await startEngineTestHost({
    home: first.home,
    fixtureAgents: [],
    acp: checks,
    keepStartupLaunches: true,
  });

  await expect
    .poll(() => listedAgent(second.caller, first.agentId))
    .toMatchObject({ status: 'not-found', enabled: true });
  expect(checks.processes).toEqual([]);
  await second.stop();
}, 30_000);

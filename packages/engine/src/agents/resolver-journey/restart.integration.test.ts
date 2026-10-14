import type { AgentInfo } from '@repo/contracts';
import { scenarios } from '@repo/mocks/agent/scenarios';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import {
  pathBinaryEntry,
  pathEntrypoint,
  startInstallEngine,
} from '#mocks/installation';
import { createMachinePath } from '#mocks/machine-path';
import { createScriptedAgentProcess } from '#mocks/scripted-agent';

type Caller = Awaited<ReturnType<typeof startInstallEngine>>['caller'];
const listed = async (
  caller: Caller,
  agentId: string,
): Promise<AgentInfo | undefined> =>
  (await caller.agents.list()).find(({ agent }) => agent === agentId);

it('Server start looks for saved catalog Agents on PATH without fetching the catalog', async () => {
  const machine = await createMachinePath();
  const first = await startInstallEngine(pathBinaryEntry(), undefined, {
    fixtureAgents: [],
  });
  expect(await listed(first.caller, first.agentId)).toBeUndefined();
  await first.stop();
  const file = await machine.place(pathEntrypoint);
  const checks = createScriptedAgentProcess(scenarios.reply);
  let fetches = 0;
  const second = await startEngineTestHost({
    home: first.home,
    fixtureAgents: [],
    acp: checks,
    keepStartupLaunches: true,
    fetchAgents: async () => {
      fetches += 1;
      return { version: '1.0.0', agents: [] };
    },
  });
  await expect
    .poll(() => listed(second.caller, first.agentId))
    .toMatchObject({ status: 'ready', enabled: true, owner: 'unknown' });
  expect(checks.processes.map(({ launch }) => launch.executable)).toEqual([
    file,
  ]);
  expect(fetches).toBe(0);
  await second.stop();
}, 30_000);

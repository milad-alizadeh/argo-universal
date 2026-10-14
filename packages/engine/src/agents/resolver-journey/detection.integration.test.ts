import { realpath } from 'node:fs/promises';
import { join, sep } from 'node:path';
import type { AgentInfo } from '@repo/contracts';
import { scenarios } from '@repo/mocks/agent/scenarios';
import { expect, it } from 'vitest';
import {
  pathBinaryEntry,
  pathEntrypoint,
  startInstallEngine,
} from '#mocks/installation';
import { createMachinePath } from '#mocks/machine-path';
import { createScriptedAgentProcess } from '#mocks/scripted-agent';

type Host = Awaited<ReturnType<typeof startInstallEngine>>;
const entrypoint = pathEntrypoint;
const binaryEntry = pathBinaryEntry();
const listed = async (host: Host): Promise<AgentInfo | undefined> =>
  (await host.caller.agents.list()).find(({ agent }) => agent === host.agentId);

it('an Agent already on PATH is found after the catalog sync, enabled and checked Ready, without a second install', async () => {
  const machine = await createMachinePath();
  const file = await machine.place(entrypoint);
  const checks = createScriptedAgentProcess(scenarios.reply);
  const host = await startInstallEngine(binaryEntry, undefined, {
    fixtureAgents: [],
    acp: checks,
  });
  await expect
    .poll(() => listed(host))
    .toMatchObject({
      status: 'ready',
      enabled: true,
      label: 'Fixture ACP',
      owner: 'unknown',
    });
  expect(checks.processes.map(({ launch }) => launch.executable)).toEqual([
    file,
  ]);
  expect(checks.processes[0]?.launch.args).toEqual(['acp']);
  expect(
    (await host.caller.agents.installStatus({ agentId: host.agentId }))
      .operation,
  ).toBeNull();
}, 30_000);

it("Argo's own copy wins over the same Agent on PATH", async () => {
  const machine = await createMachinePath();
  await machine.place(entrypoint);
  const checks = createScriptedAgentProcess(scenarios.reply);
  const host = await startInstallEngine(binaryEntry, undefined, {
    fixtureAgents: [],
    acp: checks,
  });
  await expect
    .poll(() => listed(host))
    .toMatchObject({ status: 'ready', owner: 'unknown' });
  await host.caller.agents.install({ agentId: host.agentId, version: '1.2.3' });
  await expect
    .poll(() => listed(host))
    .toMatchObject({ status: 'ready', owner: 'argo' });
  const launched = await realpath(
    checks.processes.at(-1)?.launch.executable ?? '',
  );
  expect(
    launched.startsWith((await realpath(join(host.home, 'agents'))) + sep),
  ).toBe(true);
}, 30_000);

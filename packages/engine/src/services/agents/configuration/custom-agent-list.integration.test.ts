import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { AgentInfo } from '@repo/contracts';
import { expect, it, onTestFinished } from 'vitest';
import {
  acpProgram,
  customAgentDefinition,
  startCustomAgentEngine,
} from '#mocks/custom-agent';

// A removable launcher for the fixture program, so the saved executable can disappear.
const writeLauncher = (): string => {
  const directory = mkdtempSync(join(tmpdir(), 'argo-custom-program-'));
  onTestFinished(() => rmSync(directory, { recursive: true, force: true }));
  const launcher = join(directory, 'agent.mjs');
  writeFileSync(launcher, `await import('${pathToFileURL(acpProgram).href}');`);
  return launcher;
};

it('lists an enabled custom Agent with availability from a fresh check, not from its saved record', async () => {
  const program = writeLauncher();
  const host = await startCustomAgentEngine();
  const registration = await host.caller.agents.registerCustom({
    ...customAgentDefinition,
    args: [program],
  });
  if (registration.status !== 'ready') throw new Error(registration.failure);
  const listed = (): Promise<AgentInfo | undefined> =>
    host.caller.agents
      .list()
      .then((agents) =>
        agents.find(({ agent }) => agent === registration.agentId),
      );
  await expect(listed()).resolves.toMatchObject({
    label: 'Fixture ACP',
    availability: 'available',
  });
  rmSync(program);
  await expect(listed()).resolves.toMatchObject({
    availability: 'unavailable',
  });
  await expect(
    host.caller.agents.check({ agentId: registration.agentId }),
  ).resolves.toEqual({
    status: 'failed',
    failure: 'Fixture ACP exited before answering ACP initialize.',
  });
});

it('leaves a disabled custom Agent out of the list', async () => {
  const host = await startCustomAgentEngine();
  const registration = await host.caller.agents.registerCustom(
    customAgentDefinition,
  );
  if (registration.status !== 'ready') throw new Error(registration.failure);
  await host.caller.agents.setEnabled({
    agentId: registration.agentId,
    enabled: false,
  });
  const agents = await host.caller.agents.list();
  expect(agents.map(({ agent }) => agent)).not.toContain(registration.agentId);
});

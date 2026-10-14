import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { AgentInfo } from '@repo/contracts';
import { expect, it, onTestFinished } from 'vitest';
import {
  customAgentDefinition,
  startCustomAgentEngine,
} from '#mocks/custom-agent';

// A removable launcher for the fixture program, so the saved executable can disappear.
const writeLauncher = (): string => {
  const [entry] = customAgentDefinition.args;
  if (!entry) throw new Error('Missing scripted Agent program');
  const directory = mkdtempSync(join(tmpdir(), 'argo-custom-program-'));
  onTestFinished(() => rmSync(directory, { recursive: true, force: true }));
  const launcher = join(directory, 'agent.mjs');
  writeFileSync(launcher, `await import('${pathToFileURL(entry).href}');`);
  return launcher;
};

it('a Recheck shows Can’t start once a custom Agent’s program is missing', async () => {
  const program = writeLauncher();
  const host = await startCustomAgentEngine();
  const registration = await host.caller.agents.registerCustom({
    ...customAgentDefinition,
    args: [program, ...customAgentDefinition.args.slice(1)],
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
    enabled: true,
    status: 'ready',
  });
  rmSync(program);
  const failed = {
    status: 'cant-start',
    reason: 'Fixture ACP exited before answering ACP initialize.',
  };
  await expect(
    host.caller.agents.recheck({ agentId: registration.agentId }),
  ).resolves.toEqual(failed);
  await expect(listed()).resolves.toMatchObject(failed);
}, 20_000);

it('lists a disabled custom Agent as disabled', async () => {
  const host = await startCustomAgentEngine();
  const registration = await host.caller.agents.registerCustom(
    customAgentDefinition,
  );
  if (registration.status !== 'ready') throw new Error(registration.failure);
  await host.caller.agents.setEnabled({
    agentId: registration.agentId,
    enabled: false,
  });
  expect(await host.caller.agents.list()).toContainEqual(
    expect.objectContaining({ agent: registration.agentId, enabled: false }),
  );
}, 20_000);

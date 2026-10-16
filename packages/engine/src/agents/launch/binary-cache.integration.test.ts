import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { expect, it, vi } from 'vitest';
import {
  createResourceOpening,
  deferLaunch,
  resourceLaunch,
} from '#mocks/acp-resource';
import { startEngineTestHost } from '#mocks/engine';
import { installEntry, installationPorts } from '#mocks/installation';
import type { AcpResources, AcpSessionLease } from '../index';
import { getCommand } from './get-command';
import type { CommandInput, RegistryCommand } from './types';

type Upgrade = {
  input: CommandInput;
  resources: AcpResources;
  first: RegistryCommand;
  lease: AcpSessionLease;
  unused: string;
};

// A live connection on version 1.2.3 whose entry was dropped, an unused version folder, and a Registry now at 2.0.0.
const upgradeWhileLeased = async (): Promise<Upgrade> => {
  let entry = installEntry('binary');

  const host = await startEngineTestHost({
    fetchAgents: async () =>
      JSON.stringify({ version: '1.0.0', agents: [entry] }),
  });

  const resources = host.engine.getSnapshot().context.acpResources;

  const input = {
    database: host.database,
    registry: host.engine.system.get('registry'),
    home: host.home,
    id: entry.id,
    shellEnv: {},
    ports: installationPorts,
    signal: new AbortController().signal,
    isDirectoryInUse: resources.isDirectoryInUse,
  };

  const first = await getCommand(input);
  const opening = createResourceOpening();
  opening.launch = deferLaunch({
    ...resourceLaunch,
    agentId: entry.id,
    installationDirectory: first.directory,
  });
  const lease = await resources.open(opening);
  first.release();
  resources.dropAgentConnections(entry.id);
  const unused = join(dirname(first.directory), 'v_unused');
  await mkdir(unused);
  entry = { ...entry, version: '2.0.0' };
  await host.caller.agents.refreshRegistry();

  return { input, resources, first, lease, unused };
};

it('prunes an unused binary version when a newer version resolves', async () => {
  const upgrade = await upgradeWhileLeased();
  const second = await getCommand(upgrade.input);
  expect(second.directory).not.toBe(upgrade.first.directory);
  expect(existsSync(upgrade.unused)).toBe(false);
  second.release();
});

it('retains the binary version a dropped live connection uses', async () => {
  const upgrade = await upgradeWhileLeased();
  const second = await getCommand(upgrade.input);
  expect(existsSync(upgrade.first.directory)).toBe(true);
  expect(
    await upgrade.lease.agent.request('session/prompt', {
      sessionId: upgrade.lease.sessionId,
      prompt: [],
    }),
  ).toEqual({ stopReason: 'end_turn' });
  second.release();
});

it('prunes a retained binary version after its connection closes', async () => {
  const upgrade = await upgradeWhileLeased();
  const second = await getCommand(upgrade.input);
  await upgrade.lease.close();
  await vi.waitFor(() =>
    expect(upgrade.resources.isDirectoryInUse(upgrade.first.directory)).toBe(
      false,
    ),
  );
  const third = await getCommand(upgrade.input);
  expect(existsSync(upgrade.first.directory)).toBe(false);
  second.release();
  third.release();
});

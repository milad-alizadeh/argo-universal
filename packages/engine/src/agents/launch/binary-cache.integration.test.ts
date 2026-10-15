import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { zipSync } from 'fflate';
import { expect, it, vi } from 'vitest';
import { createResourceOpening } from '#mocks/acp-resource';
import { startEngineTestHost } from '#mocks/engine';
import {
  installEntry,
  installationExecutable,
  installationPorts,
} from '#mocks/installation';
import { getCommand } from './get-command';

it('prunes old binary versions but retains folders used by live connections, including dropped entries', async () => {
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
  opening.launch = {
    ...opening.launch,
    agentId: entry.id,
    installationDirectory: first.directory,
  };
  const lease = await resources.open(opening);
  first.release();
  resources.dropAgentConnections(entry.id);
  const unused = join(dirname(first.directory), 'v_unused');
  await mkdir(unused);
  entry = { ...entry, version: '2.0.0' };
  await host.caller.agents.refreshRegistry();
  const second = await getCommand(input);
  expect(second.directory).not.toBe(first.directory);
  expect(existsSync(first.directory)).toBe(true);
  expect(existsSync(unused)).toBe(false);
  expect(
    await lease.agent.request('session/prompt', {
      sessionId: lease.sessionId,
      prompt: [],
    }),
  ).toEqual({ stopReason: 'end_turn' });
  await lease.close();
  await vi.waitFor(() =>
    expect(resources.isDirectoryInUse(first.directory)).toBe(false),
  );
  const third = await getCommand(input);
  expect(existsSync(first.directory)).toBe(false);
  second.release();
  third.release();
});

it.each(['.zip', '.gz', ''] as const)(
  'extracts %s binary data and validates the supplied checksum before publishing',
  async (extension) => {
    const entry = installEntry('binary');
    const target = Object.values(entry.distribution.binary ?? {})[0];

    if (!target) throw new Error('Binary fixture is missing');

    const bytes = archiveBytes(extension);

    target.archive += extension;
    target.sha256 = createHash('sha256').update(bytes).digest('hex');

    const download = vi.fn<typeof installationPorts.download>(
      async () => bytes,
    );

    const host = await startEngineTestHost({
      fetchAgents: async () =>
        JSON.stringify({ version: '1.0.0', agents: [entry] }),
    });

    const command = await getCommand({
      database: host.database,
      registry: host.engine.system.get('registry'),
      home: host.home,
      id: entry.id,
      shellEnv: {},
      ports: { ...installationPorts, download },
      signal: new AbortController().signal,
      isDirectoryInUse:
        host.engine.getSnapshot().context.acpResources.isDirectoryInUse,
    });

    expect(await readFile(command.executable)).toEqual(installationExecutable);
    expect(download).toHaveBeenCalledTimes(1);
    command.release();
  },
);

const archiveBytes = (extension: string): Uint8Array => {
  if (extension === '.zip') return zipSync({ agent: installationExecutable });

  return extension === '.gz'
    ? gzipSync(installationExecutable)
    : installationExecutable;
};

it('uses the GitHub asset digest when the Registry omits a checksum', async () => {
  const entry = installEntry('binary');
  const target = Object.values(entry.distribution.binary ?? {})[0];

  if (!target) throw new Error('Binary fixture is missing');
  target.archive =
    'https://github.com/example/agent/releases/download/v1.2.3/agent';
  let digest = createHash('sha256').update('different bytes').digest('hex');

  const download = vi.fn<typeof installationPorts.download>(async (url) =>
    url.startsWith('https://api.github.com/')
      ? Buffer.from(
          JSON.stringify({
            assets: [{ name: 'agent', digest: `sha256:${digest}` }],
          }),
        )
      : installationExecutable,
  );

  const host = await startEngineTestHost({
    fetchAgents: async () =>
      JSON.stringify({ version: '1.0.0', agents: [entry] }),
  });

  const input = {
    database: host.database,
    registry: host.engine.system.get('registry'),
    home: host.home,
    id: entry.id,
    shellEnv: {},
    ports: { ...installationPorts, download },
    signal: new AbortController().signal,
    isDirectoryInUse:
      host.engine.getSnapshot().context.acpResources.isDirectoryInUse,
  };

  await expect(getCommand(input)).rejects.toThrow(
    'failed The downloaded files failed their integrity check',
  );
  expect(download).toHaveBeenCalledWith(
    'https://api.github.com/repos/example/agent/releases/tags/v1.2.3',
    expect.any(AbortSignal),
  );
  expect(
    await readdir(join(host.home, 'agents', 'registry', entry.id)),
  ).toEqual([]);
  digest = createHash('sha256').update(installationExecutable).digest('hex');
  const command = await getCommand(input);
  expect(existsSync(command.executable)).toBe(true);
  command.release();
});

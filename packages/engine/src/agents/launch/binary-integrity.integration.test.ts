import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { zipSync } from 'fflate';
import { expect, it, vi } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import {
  installEntry,
  installationExecutable,
  installationPorts,
} from '#mocks/installation';
import { getCommand } from './get-command';

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

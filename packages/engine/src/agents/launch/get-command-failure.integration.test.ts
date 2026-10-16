import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { installEntry, installationPorts } from '#mocks/installation';
import { binaryRejections } from '#mocks/launch-archives';
import { getCommand } from './get-command';

it.each(['missing', 'uvx'] as const)(
  'fails a %s Registry entry through command resolution',
  async (kind) => {
    const entry = installEntry('uvx');

    const host = await startEngineTestHost({
      fetchAgents: async () =>
        JSON.stringify({
          version: '1.0.0',
          agents: kind === 'missing' ? [] : [entry],
        }),
    });

    await expect(
      getCommand({
        database: host.database,
        registry: host.engine.system.get('registry'),
        home: host.home,
        id: entry.id,
        shellEnv: {},
        ports: installationPorts,
        signal: new AbortController().signal,
        isDirectoryInUse:
          host.engine.getSnapshot().context.acpResources.isDirectoryInUse,
      }),
    ).rejects.toThrow(`failed Agent "${entry.id}" is not in the ACP Registry.`);
  },
);

it.each(['binary', 'npx'] as const)(
  'releases the %s install lock after failure so the next open can retry',
  async (kind) => {
    const entry = installEntry(kind);

    const host = await startEngineTestHost({
      fetchAgents: async () =>
        JSON.stringify({ version: '1.0.0', agents: [entry] }),
    });

    let fail = true;

    const ports = {
      download: async (
        url: string,
        signal: AbortSignal,
      ): Promise<Uint8Array> => {
        if (fail) throw new Error('download offline');

        return installationPorts.download(url, signal);
      },
      runTool: async (
        tool: Parameters<typeof installationPorts.runTool>[0],
      ): Promise<string> => {
        if (fail && tool.args[0] === 'install') throw new Error('npm offline');

        return installationPorts.runTool(tool);
      },
    };

    const input = {
      database: host.database,
      registry: host.engine.system.get('registry'),
      home: host.home,
      id: entry.id,
      shellEnv: {},
      ports,
      signal: new AbortController().signal,
      isDirectoryInUse:
        host.engine.getSnapshot().context.acpResources.isDirectoryInUse,
    };

    await expect(getCommand(input)).rejects.toThrow(
      kind === 'binary' ? 'failed download offline' : 'failed npm offline',
    );
    fail = false;
    expect((await getCommand(input)).executable).toBeTruthy();
  },
);

it('rejects Node below 22 when neither shell nor bundled runtime can launch an npm Agent', async () => {
  const entry = installEntry('npx');

  const host = await startEngineTestHost({
    fetchAgents: async () =>
      JSON.stringify({ version: '1.0.0', agents: [entry] }),
  });

  await expect(
    getCommand({
      database: host.database,
      registry: host.engine.system.get('registry'),
      home: host.home,
      id: entry.id,
      shellEnv: {},
      ports: { ...installationPorts, runTool: async () => 'v20.0.0' },
      signal: new AbortController().signal,
      isDirectoryInUse:
        host.engine.getSnapshot().context.acpResources.isDirectoryInUse,
    }),
  ).rejects.toThrow('failed Node.js 22 or newer is required');
});

it.each(binaryRejections)(
  'rejects $failure before publishing a usable binary',
  async ({ cmd, suffix, bytes, message }) => {
    const entry = installEntry('binary');
    const target = Object.values(entry.distribution.binary ?? {})[0];

    if (!target) throw new Error('Binary fixture is missing');
    target.cmd = cmd;
    target.archive += suffix;

    const host = await startEngineTestHost({
      fetchAgents: async () =>
        JSON.stringify({ version: '1.0.0', agents: [entry] }),
    });

    const ports = {
      ...installationPorts,
      download: bytes,
    };

    await expect(
      getCommand({
        database: host.database,
        registry: host.engine.system.get('registry'),
        home: host.home,
        id: entry.id,
        shellEnv: {},
        ports,
        signal: new AbortController().signal,
        isDirectoryInUse:
          host.engine.getSnapshot().context.acpResources.isDirectoryInUse,
      }),
    ).rejects.toThrow(message);
  },
);

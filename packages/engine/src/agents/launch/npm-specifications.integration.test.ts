import { expect, it, vi } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { installEntry, installationPorts } from '#mocks/installation';
import { getCommand } from './get-command';

it.each([
  'fixture-install@latest',
  'fixture-install@^1.2.0',
  'fixture-install',
])(
  'preserves npm specification %s rather than making it a ceiling',
  async (specification) => {
    const entry = installEntry('npx');

    if (!entry.distribution.npx) throw new Error('npm fixture is missing');
    entry.distribution.npx.package = specification;

    const host = await startEngineTestHost({
      fetchAgents: async () =>
        JSON.stringify({ version: '1.0.0', agents: [entry] }),
    });

    const runTool = vi.fn<typeof installationPorts.runTool>(
      installationPorts.runTool,
    );

    await getCommand({
      database: host.database,
      registry: host.engine.system.get('registry'),
      home: host.home,
      id: entry.id,
      shellEnv: {},
      ports: { ...installationPorts, runTool },
      signal: new AbortController().signal,
      isDirectoryInUse:
        host.engine.getSnapshot().context.acpResources.isDirectoryInUse,
    });
    expect(runTool).toHaveBeenCalledWith(
      expect.objectContaining({
        args: ['install', specification, '--save-exact'],
      }),
    );
  },
);

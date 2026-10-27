import { expect, it, vi } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { installEntry, installationPorts } from '#mocks/installation';
import { getCommand } from './get-command';

it.each([
  {
    pkg: 'fixture-install@1.2.3',
    specification: 'fixture-install@0.0.0 - 1.2.3',
  },
  { pkg: 'fixture-install@latest', specification: 'fixture-install@latest' },
  { pkg: 'fixture-install@^1.2.0', specification: 'fixture-install@^1.2.0' },
  { pkg: 'fixture-install', specification: 'fixture-install' },
])(
  'installs npm package $pkg as $specification',
  async ({ pkg, specification }) => {
    const entry = installEntry('npx');

    if (!entry.distribution.npx) throw new Error('npm fixture is missing');
    entry.distribution.npx.package = pkg;

    const host = await startEngineTestHost({
      fetchAgents: async () =>
        JSON.stringify({ version: '1.0.0', agents: [entry] }),
    });

    const runTool = vi.fn<typeof installationPorts.runTool>(
      installationPorts.runTool,
    );

    const base = `${host.home}/agents/registry/npx/${entry.id}`;
    const staging = expect.stringMatching(new RegExp(`^${base}/\\.staging-`));

    const command = await getCommand({
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
        args: [
          'install',
          '--prefix',
          staging,
          '--no-audit',
          '--no-fund',
          '--save-exact',
          '--',
          specification,
        ],
      }),
    );
    expect(command.directory).toMatch(new RegExp(`^${base}/v_1\\.2\\.3_`));
  },
);

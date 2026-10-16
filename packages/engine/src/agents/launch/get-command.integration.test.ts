import { chmod, readFile } from 'node:fs/promises';
import { fixtureRegistryIds } from '@repo/mocks/agent/app-fixtures';
import { expect, it, vi } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { installEntry, installationPorts } from '#mocks/installation';
import { getCommand } from './get-command';
import type { InstallPorts } from './ports';
import type { CommandInput } from './types';

const kinds = ['binary', 'npx'] as const;

type Kind = (typeof kinds)[number];

type CountedPorts = { ports: InstallPorts; materializations: () => number };

// Counts downloads for a binary and `npm install` runs for npx; npm leaves its entry point non-executable.
const countedPorts = (kind: Kind): CountedPorts => {
  const download = vi.fn<InstallPorts['download']>(installationPorts.download);

  const runTool = vi.fn<InstallPorts['runTool']>(async (tool) => {
    const output = await installationPorts.runTool(tool);

    if (tool.args[0] === 'install')
      await chmod(`${tool.cwd}/node_modules/fixture-install/agent.mjs`, 0o644);

    return output;
  });

  const installs = (): number =>
    runTool.mock.calls.filter(([tool]) => tool.args[0] === 'install').length;

  return {
    ports: { download, runTool },
    materializations: () =>
      kind === 'binary' ? download.mock.calls.length : installs(),
  };
};

const startCommandHost = async (
  kind: Kind,
): Promise<CountedPorts & { input: CommandInput }> => {
  const entry = installEntry(kind);
  const counted = countedPorts(kind);

  const host = await startEngineTestHost({
    fetchAgents: async () =>
      JSON.stringify({ version: '1.0.0', agents: [entry] }),
  });

  const input = {
    database: host.database,
    registry: host.engine.system.get('registry'),
    home: host.home,
    id: entry.id,
    isDirectoryInUse:
      host.engine.getSnapshot().context.acpResources.isDirectoryInUse,
    shellEnv: { PATH: '/shell/bin' },
    ports: counted.ports,
    signal: new AbortController().signal,
  };

  return { ...counted, input };
};

const resolveForTwoProjects = (
  input: CommandInput,
): Promise<Awaited<ReturnType<typeof getCommand>>[]> =>
  Promise.all(
    ['first', 'second'].map((project) =>
      getCommand({
        ...input,
        shellEnv: { ...input.shellEnv, PROJECT: project },
      }),
    ),
  );

it.each(kinds)(
  'materializes a %s Agent once for concurrent Project environments',
  async (kind) => {
    const { input, materializations } = await startCommandHost(kind);
    const [first, second] = await resolveForTwoProjects(input);
    expect(first?.executable).toBe(second?.executable);
    expect(materializations()).toBe(1);
  },
);

it.each(kinds)(
  'keeps each Project environment on its concurrent %s command',
  async (kind) => {
    const { input } = await startCommandHost(kind);
    const commands = await resolveForTwoProjects(input);
    expect(commands.map((command) => command.env.PROJECT)).toEqual([
      'first',
      'second',
    ]);
  },
);

it('publishes a lazy binary under its version folder', async () => {
  const { input } = await startCommandHost('binary');
  const command = await getCommand(input);
  expect(await readFile(command.executable, 'utf8')).toContain('#!');
  expect(command.directory).toMatch(/\/registry\/fixture-install\/v_1\.2\.3_/);
});

it('reuses a published binary for a later command', async () => {
  const { input, materializations } = await startCommandHost('binary');
  await getCommand(input);
  await getCommand(input);
  expect(materializations()).toBe(1);
});

it.each(kinds)(
  'merges shell, distribution and vendor env for %s',
  async (kind) => {
    const entry = { ...installEntry(kind), id: String(fixtureRegistryIds[0]) };

    const recipe = environmentRecipe(entry);

    if (!recipe) throw new Error('Fixture distribution is missing');
    recipe.env = {
      ANTHROPIC_API_KEY: 'distribution',
      VALUE: 'distribution',
      DISTRIBUTION: 'kept',
    };

    const host = await startEngineTestHost({
      fetchAgents: async () =>
        JSON.stringify({ version: '1.0.0', agents: [entry] }),
    });

    await host.caller.agents.refreshRegistry();

    const input = {
      database: host.database,
      registry: host.engine.system.get('registry'),
      home: host.home,
      id: entry.id,
      shellEnv: { VALUE: 'shell', SHELL_ONLY: 'kept', PATH: '/shell/bin' },
      ports: installationPorts,
      signal: new AbortController().signal,
      isDirectoryInUse:
        host.engine.getSnapshot().context.acpResources.isDirectoryInUse,
    };

    expect((await getCommand(input)).env).toMatchObject({
      VALUE: 'distribution',
      ANTHROPIC_API_KEY: '',
      DISTRIBUTION: 'kept',
      SHELL_ONLY: 'kept',
    });
  },
);

const environmentRecipe = (
  entry: ReturnType<typeof installEntry>,
):
  | Pick<
      NonNullable<ReturnType<typeof installEntry>['distribution']['npx']>,
      'env'
    >
  | undefined =>
  entry.distribution.npx ?? Object.values(entry.distribution.binary ?? {})[0];

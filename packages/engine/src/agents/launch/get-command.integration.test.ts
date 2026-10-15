import { chmod, readFile } from 'node:fs/promises';
import { fixtureRegistryIds } from '@repo/mocks/agent/app-fixtures';
import { expect, it, vi } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { installEntry, installationPorts } from '#mocks/installation';
import { getCommand } from './get-command';

it('downloads a lazy binary once across two Project environments and resolves the target arguments', async () => {
  const entry = installEntry('binary');

  const download = vi.fn<typeof installationPorts.download>(
    installationPorts.download,
  );

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
    isDirectoryInUse:
      host.engine.getSnapshot().context.acpResources.isDirectoryInUse,
    shellEnv: {},
    ports: { ...installationPorts, download },
    signal: new AbortController().signal,
  };

  const [first, second] = await Promise.all([
    getCommand({ ...input, shellEnv: { ...input.shellEnv, PROJECT: 'first' } }),
    getCommand({
      ...input,
      shellEnv: { ...input.shellEnv, PROJECT: 'second' },
    }),
  ]);

  expect(first.executable).toBe(second.executable);
  expect([first.env.PROJECT, second.env.PROJECT]).toEqual(['first', 'second']);
  expect(await readFile(first.executable, 'utf8')).toContain('#!');
  expect(first.directory).toMatch(/\/registry\/fixture-install\/v_1\.2\.3_/);
  expect(download).toHaveBeenCalledTimes(1);
  await getCommand(input);
  expect(download).toHaveBeenCalledTimes(1);
});

it('installs npm with a ceiling range once across concurrent Project environments and again on a new connection', async () => {
  const entry = installEntry('npx');

  const host = await startEngineTestHost({
    fetchAgents: async () =>
      JSON.stringify({ version: '1.0.0', agents: [entry] }),
  });

  const runTool = vi.fn<typeof installationPorts.runTool>(async (tool) => {
    const output = await installationPorts.runTool(tool);

    if (tool.args[0] === 'install')
      await chmod(`${tool.cwd}/node_modules/fixture-install/agent.mjs`, 0o644);

    return output;
  });

  const input = {
    database: host.database,
    registry: host.engine.system.get('registry'),
    home: host.home,
    id: entry.id,
    shellEnv: { PATH: '/shell/bin', VALUE: 'shell' },
    ports: { ...installationPorts, runTool },
    signal: new AbortController().signal,
    isDirectoryInUse:
      host.engine.getSnapshot().context.acpResources.isDirectoryInUse,
  };

  const [first, second] = await Promise.all([
    getCommand({ ...input, shellEnv: { ...input.shellEnv, PROJECT: 'first' } }),
    getCommand({
      ...input,
      shellEnv: { ...input.shellEnv, PROJECT: 'second' },
    }),
  ]);

  expect(first.executable).toBe(second.executable);
  expect([first.env.PROJECT, second.env.PROJECT]).toEqual(['first', 'second']);
  expect(
    runTool.mock.calls.filter(([call]) => call.args[0] === 'install'),
  ).toHaveLength(1);
  expect(runTool).toHaveBeenCalledWith(
    expect.objectContaining({
      args: ['install', 'fixture-install@0.0.0 - 1.2.3', '--save-exact'],
    }),
  );
  expect(first.args[0]).toMatch(/\/node_modules\/fixture-install\/agent.mjs$/);
  await getCommand(input);
  expect(
    runTool.mock.calls.filter(([call]) => call.args[0] === 'install'),
  ).toHaveLength(2);
});

it.each(['binary', 'npx'] as const)(
  'merges shell, distribution, vendor and saved env for %s',
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
    await host.caller.agents.addRegistry({ id: entry.id });
    host.database.$client
      .prepare('UPDATE agent_servers SET env = ? WHERE id = ?')
      .run(JSON.stringify({ VALUE: 'saved' }), entry.id);

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
      VALUE: 'saved',
      ANTHROPIC_API_KEY: '',
      DISTRIBUTION: 'kept',
      SHELL_ONLY: 'kept',
    });
    host.database.$client
      .prepare('UPDATE agent_servers SET env = ? WHERE id = ?')
      .run(JSON.stringify({ ANTHROPIC_API_KEY: 'saved' }), entry.id);
    expect((await getCommand(input)).env.ANTHROPIC_API_KEY).toBe('saved');
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

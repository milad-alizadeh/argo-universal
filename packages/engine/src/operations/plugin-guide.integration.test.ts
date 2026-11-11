import { PluginGuide } from '@repo/contracts/operations/plugin-guide';
import { kitComponents } from '@repo/contracts/plugins/kit';
import { expect, it } from 'vitest';
import { runOperation } from '#mocks/operations';
import { startPluginOperations } from '#mocks/plugin-operations';

it('answers the blueprint and every kit component the schemas declare', async () => {
  const caller = await startPluginOperations();

  const answer = await runOperation(caller.operations, {
    id: 'plugin.guide',
    params: {},
  });

  const { guide } = PluginGuide.parse(answer);

  expect(guide).toContain('# Build an Argo Plugin');

  for (const name of Object.keys(kitComponents))
    expect(guide).toContain(`### ${name}\n`);
});

it('is found by what an Agent filters on when asked to build a Plugin', async () => {
  const caller = await startPluginOperations();

  const found = async (filter: string): Promise<string[]> =>
    (await caller.operations.list.query({ filter })).map(({ id }) => id);

  for (const filter of ['plugin', 'build', 'create', 'scaffold', 'blueprint'])
    expect(await found(filter)).toContain('plugin.guide');

  expect(await found('scaffold')).toContain('plugin.new');
});

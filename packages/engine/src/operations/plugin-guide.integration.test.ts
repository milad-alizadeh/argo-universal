import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { PluginGuide } from '@repo/contracts/operations/plugin-guide';
import { draftStateIds } from '@repo/contracts/plugins/drafts';
import { kitComponents } from '@repo/contracts/plugins/kit';
import { expect, it } from 'vitest';
import { runOperation } from '#mocks/operations';
import { startPluginOperations } from '#mocks/plugin-operations';

const guideId = 'plugin.guide';

async function guide(params: { components?: string[] }): Promise<string> {
  const caller = await startPluginOperations();

  const answer = await runOperation(caller.operations, {
    id: guideId,
    params,
  });

  return PluginGuide.parse(answer).guide.join('\n');
}

it('answers the blueprint and an index naming every kit component the schemas declare', async () => {
  const text = await guide({});

  expect(text).toContain('# Build an Argo Plugin');

  for (const name of Object.keys(kitComponents))
    expect(text).toContain(`- ${name}: `);
});

it('answers the generated props of the components asked for, and only those', async () => {
  const text = await guide({ components: ['Button', 'List'] });

  expect(text).toContain('### Button\n');
  expect(text).toContain('- `label`: string');
  expect(text).toContain('### List\n');
  expect(text).not.toContain('### Screen\n');
});

it('refuses a component the kit lacks, and says where the names are', async () => {
  const caller = await startPluginOperations();

  await expect(
    runOperation(caller.operations, {
      id: guideId,
      params: { components: ['Buton'] },
    }),
  ).rejects.toThrow('No kit component named Buton. Run plugin.guide');
});

it('is found by what an Agent filters on when asked to build a Plugin', async () => {
  const caller = await startPluginOperations();

  const found = async (filter: string): Promise<string[]> =>
    (await caller.operations.list.query({ filter })).map(({ id }) => id);

  for (const filter of ['plugin', 'build', 'create', 'scaffold', 'blueprint'])
    expect(await found(filter)).toContain('plugin.guide');

  expect(await found('scaffold')).toContain('plugin.new');
});

it('answers the Draft step, naming each Operation, the ship gate and the Variant key, before the step that writes real data code', async () => {
  const text = await guide({});

  for (const phrase of [
    'plugin.draft.show',
    'plugin.draft.pick',
    'argo plugin validate --ship',
    'draftVariant.<regionId>',
  ])
    expect(text).toContain(phrase);

  // Step 3 points to the Drafts section; step 4 is the one that writes the real Plugin.
  expect(text.indexOf('`## Drafts`')).toBeLessThan(text.indexOf('\n4. '));
});

it('answers the minimum state set, every state the contracts declare, once', async () => {
  const text = await guide({});

  for (const id of draftStateIds)
    expect(text.split(`- \`${id}\`: `)).toHaveLength(2);
});

it('is the definition the Draft authoring doc points to, without restating the state set', async () => {
  const doc = await readFile(
    fileURLToPath(
      new URL('../../../../docs/agents/plugin-drafts.md', import.meta.url),
    ),
    'utf8',
  );

  expect(doc).toContain(guideId);

  for (const id of draftStateIds) expect(doc).not.toContain(`- \`${id}\`: `);
});

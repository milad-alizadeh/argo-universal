import { rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { draftStateIds } from '@repo/contracts/plugins/drafts';
import { expect, it } from 'vitest';
import { fixture, manifestFile, readManifest, run } from '../mocks/plugin-cli';

type DraftFixture = {
  states?: readonly string[];
  load?: string;
  capabilities?: boolean;
};

// A Plugin whose `/` page is a Draft of the given states, with the given Loader body, scaffolded like any fixture.
async function draft({
  states = draftStateIds,
  load = '({ state }) => ({ state })',
  capabilities = false,
}: DraftFixture = {}): Promise<string> {
  const directory = await fixture(
    `export function register(argo) {\n  argo.pages.define('/', { load: ${load}, render: () => null });\n}`,
  );

  const manifest = await readManifest(directory);

  // The example's Operations are gone from the manifest, so are the types it generated for them.
  await rm(join(directory, 'plugin.gen.d.ts'), { force: true });
  await writeFile(
    join(directory, manifestFile),
    JSON.stringify(
      {
        ...manifest,
        contributes: {
          ...manifest.contributes,
          accounts: undefined,
          operations: undefined,
          drafts: [{ page: '/', states }],
        },
        capabilities: capabilities ? manifest.capabilities : [],
      },
      null,
      2,
    ),
  );

  return directory;
}

it('validate accepts a complete Draft', async () => {
  const result = await run('validate', await draft());

  expect(result).toMatchObject({ code: 0 });
  expect(result.output).toContain('Plugin is valid');
}, 30_000);

it('validate lists the minimum states a Draft page is missing', async () => {
  const result = await run(
    'validate',
    await draft({ states: ['loading', 'populated'] }),
  );

  expect(result).toMatchObject({
    code: 1,
    output: expect.stringContaining('plugin.json:'),
  });
  expect(result.output).toContain(
    'Draft page / is missing states: empty, error, signed-out, pending',
  );
}, 30_000);

it.each([
  ['an argo read', "async () => argo.queries.read('issues')"],
  ['the input read', 'async ({ read }) => read({ name: "issues" })'],
])(
  'validate refuses a Draft Loader calling %s, with and without Capabilities',
  async (_, load) => {
    for (const capabilities of [false, true]) {
      const result = await run('validate', await draft({ load, capabilities }));

      expect(result).toMatchObject({
        code: 1,
        output: expect.stringContaining('index.tsx:2:'),
      });
      expect(result.output).toContain('Draft Loader of /');
    }
  },
  60_000,
);

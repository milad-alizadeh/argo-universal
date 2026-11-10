import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PluginManifest } from '@repo/contracts/plugins';
import { pluginInstructionsLimit } from '@repo/contracts/plugins/manifest-fields';
import { expect, it } from 'vitest';
import { fixture, manifestFile, readManifest, run } from '../mocks/plugin-cli';

const instructionsFile = 'instructions.md';

it.each([
  [undefined, 'instructions file instructions.md is missing'],
  ['x'.repeat(1_001), 'is over 1000 characters'],
])(
  'validate refuses Plugin instructions of %s',
  async (text, reason) => {
    const directory = await fixture('export function register() {}');
    const manifest = await readManifest(directory);

    await writeFile(
      join(directory, manifestFile),
      JSON.stringify({
        ...manifest,
        contributes: {
          ...manifest.contributes,
          instructions: instructionsFile,
        },
      }),
    );

    if (text !== undefined)
      await writeFile(join(directory, instructionsFile), text);

    const result = await run('validate', directory);
    expect(result).toMatchObject({ code: 1 });
    expect(result.output).toContain(reason);
  },
  30_000,
);

const issueTracker = fileURLToPath(
  new URL('../../../plugins/issue-tracker/', import.meta.url),
);

it('ships the Issue tracker with Plugin instructions under the cap', async () => {
  const manifest = PluginManifest.parse(
    JSON.parse(await readFile(join(issueTracker, manifestFile), 'utf8')),
  );

  const file = manifest.contributes.instructions;

  expect(file).toBeDefined();

  const text = await readFile(join(issueTracker, file ?? ''), 'utf8');

  expect(text.trim().length).toBeGreaterThan(0);
  expect(text.length).toBeLessThanOrEqual(pluginInstructionsLimit);
});

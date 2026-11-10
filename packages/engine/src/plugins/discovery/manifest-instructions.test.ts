import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { makeResolvedTempFolder } from '@repo/mocks/fs/resolved-temp-folder';
import { rm } from 'node:fs/promises';
import { expect, it, onTestFinished } from 'vitest';
import { manifestTemplate } from '../../../mocks/plugin-manifest-template';
import { readManifest } from './manifest';

const instructionsCap = 1_000;

// A Plugin folder whose manifest declares `instructions.md`, with that file's text if it has one.
async function pluginFolder(text: string | undefined): Promise<string> {
  const folder = await makeResolvedTempFolder('argo-instructions-');
  onTestFinished(() => rm(folder, { recursive: true, force: true }));
  await mkdir(folder, { recursive: true });
  await writeFile(join(folder, 'index.js'), '');
  await writeFile(
    join(folder, 'plugin.json'),
    JSON.stringify({
      ...manifestTemplate,
      contributes: {
        ...manifestTemplate.contributes,
        instructions: 'instructions.md',
      },
    }),
  );

  if (text !== undefined)
    await writeFile(join(folder, 'instructions.md'), text);

  return folder;
}

it('accepts Plugin instructions in a file beside the manifest', async () => {
  const folder = await pluginFolder('x'.repeat(instructionsCap));

  expect((await readManifest(folder, '1.2.3')).contributes.instructions).toBe(
    'instructions.md',
  );
});

it('refuses Plugin instructions whose file is missing', async () => {
  const folder = await pluginFolder(undefined);

  await expect(readManifest(folder, '1.2.3')).rejects.toThrow(
    'instructions file instructions.md is missing',
  );
});

it('refuses Plugin instructions over the cap', async () => {
  const folder = await pluginFolder('x'.repeat(instructionsCap + 1));

  await expect(readManifest(folder, '1.2.3')).rejects.toThrow(
    `instructions file instructions.md is over ${instructionsCap} characters`,
  );
});

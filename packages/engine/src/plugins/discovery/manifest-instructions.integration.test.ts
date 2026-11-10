import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { makeResolvedTempFolder } from '@repo/mocks/fs/resolved-temp-folder';
import { expect, it, onTestFinished } from 'vitest';
import { manifestTemplate } from '#mocks/plugin-manifest-template';
import { readManifest } from './manifest';

const instructionsCap = 1_000;

const instructionsFile = 'instructions.md';

// A Plugin folder whose manifest declares its instructions file, holding this text when given.
async function pluginFolder(
  text?: string,
  declared = instructionsFile,
): Promise<string> {
  const folder = await makeResolvedTempFolder('argo-instructions-');
  onTestFinished(() => rm(folder, { recursive: true, force: true }));
  await mkdir(folder, { recursive: true });
  await writeFile(join(folder, 'index.js'), '');

  const { contributes } = manifestTemplate;

  await writeFile(
    join(folder, 'plugin.json'),
    JSON.stringify({
      ...manifestTemplate,
      contributes: { ...contributes, instructions: declared },
    }),
  );

  if (text !== undefined) await writeFile(join(folder, instructionsFile), text);

  return folder;
}

it('accepts Plugin instructions in a file beside the manifest', async () => {
  const folder = await pluginFolder('x'.repeat(instructionsCap));

  const manifest = await readManifest(folder, '1.2.3');

  expect(manifest.contributes.instructions).toBe(instructionsFile);
});

it('refuses Plugin instructions whose file is missing', async () => {
  await expect(readManifest(await pluginFolder(), '1.2.3')).rejects.toThrow(
    'instructions file instructions.md is missing',
  );
});

it('refuses Plugin instructions over the cap', async () => {
  const folder = await pluginFolder('x'.repeat(instructionsCap + 1));

  await expect(readManifest(folder, '1.2.3')).rejects.toThrow(
    'instructions file instructions.md is over 1000 characters',
  );
});

it.each(['../outside.md', '/etc/outside.md', 'instructions.txt'])(
  'refuses the Plugin instructions path %s',
  async (declared) => {
    const folder = await pluginFolder('Hi.', declared);
    await writeFile(join(folder, '..', 'outside.md'), 'Outside.');
    onTestFinished(() => rm(join(folder, '..', 'outside.md'), { force: true }));

    await expect(readManifest(folder, '1.2.3')).rejects.toThrow('instructions');
  },
);

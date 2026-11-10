import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { makeResolvedTempFolder } from '@repo/mocks/fs/resolved-temp-folder';
import { expect, it, onTestFinished } from 'vitest';
import { z } from 'zod';
import { manifestTemplate } from '#mocks/plugin-manifest-template';
import { readManifest } from './manifest';

const instructionsCap = 1_000;

const instructionsFile = 'instructions.md';

// A Plugin folder whose manifest declares its instructions file, holding this text when given.
async function pluginFolder(
  text?: string,
  declared = instructionsFile,
): Promise<string> {
  const parent = await makeResolvedTempFolder('argo-instructions-');
  const folder = join(parent, 'plugin');
  onTestFinished(() => rm(parent, { recursive: true, force: true }));
  await mkdir(folder);
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

it('measures the trimmed text the Server serves', async () => {
  const folder = await pluginFolder(`\n${'x'.repeat(instructionsCap)}\n\n`);

  await expect(readManifest(folder, '1.2.3')).resolves.toBeDefined();
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
    await writeFile(join(dirname(folder), 'outside.md'), 'Outside.');

    // The schema refuses the path itself; a missing or long file is a ManifestFieldError.
    await expect(readManifest(folder, '1.2.3')).rejects.toBeInstanceOf(
      z.ZodError,
    );
  },
);

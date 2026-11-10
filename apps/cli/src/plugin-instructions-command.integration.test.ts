import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
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

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { z } from 'zod';
import { root } from './tracked-files.mts';

const listInto = (base: string, listing: string): void => {
  execFileSync(
    resolve(root, 'node_modules/.bin/vitest'),
    [
      'list',
      '--project',
      'storybook',
      '--filesOnly',
      '--changed',
      base,
      `--json=${listing}`,
    ],
    {
      cwd: root,
      // Under Vitest the Storybook project indexes test stories only; the gate draws presentation stories.
      env: { ...process.env, ARGO_LIST_EVERY_STORY: '1' },
      stdio: ['ignore', 'ignore', 'inherit'],
    },
  );
};

// Vitest's module graph names every story file that imports a changed file, without starting a browser.
export const dependentStories = (base: string): string[] => {
  const scratch = mkdtempSync(join(tmpdir(), 'story-renders-'));
  const listing = join(scratch, 'stories.json');

  try {
    listInto(base, listing);

    const listed = z
      .array(z.object({ file: z.string() }))
      .parse(JSON.parse(readFileSync(listing, 'utf8')));

    return listed.map(({ file }): string => {
      if (
        !isAbsolute(file) ||
        !/^packages\/(kit|client)\/src\/.+\.stories\.tsx$/.test(
          relative(root, file),
        )
      )
        throw new Error('Invalid Storybook file in Vitest listing');

      return file;
    });
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
};

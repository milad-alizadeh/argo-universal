import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
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

    const listed: { file: string }[] = JSON.parse(
      readFileSync(listing, 'utf8'),
    );

    return listed.map(({ file }): string => file);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
};

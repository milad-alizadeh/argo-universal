/*
 * The render gates' runner: it plans what to draw, hands the plan to the Storybook browser project,
 * and reads the fingerprints back through `story-render-rules.mts`. Rendering every story twice is
 * minutes of browser time, so this runs in CI rather than in `pnpm quality:lint`
 * (docs/agents/hooks.md).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lockBrowserSuite } from '../tooling/browser-suite-lock/browser-suite-lock.ts';
import {
  childStateProblems,
  duplicateRenderProblems,
  fixturePairs,
  type ChildStatePair,
  type FixturePair,
  type StoryRender,
} from './story-render-rules.mts';

type PlannedFile = { file: string; pairs: FixturePair[] };

type Fingerprints = {
  renders: StoryRender[];
  childPairs: ChildStatePair[];
  failures: string[];
};

const root = fileURLToPath(new URL('..', import.meta.url));

const storybook = resolve(root, 'apps/storybook');

const planPath = resolve(storybook, 'story-render-plan.json');

const fingerprintPath = resolve(storybook, 'story-render-fingerprints.json');

const storyExport = /^export const \w+\s*:/gm;

const presentationFiles = (): string[] =>
  execFileSync(
    'git',
    [
      'ls-files',
      '--cached',
      '--others',
      '--exclude-standard',
      '--',
      'packages/*/src/**/*.stories.tsx',
    ],
    { cwd: root, encoding: 'utf8' },
  )
    .split('\n')
    .filter(
      (file): boolean =>
        file !== '' &&
        !file.endsWith('.test.stories.tsx') &&
        existsSync(resolve(root, file)),
    );

const planFor = (file: string): PlannedFile[] => {
  const source = readFileSync(resolve(root, file), 'utf8');
  const stories = [...source.matchAll(storyExport)].length;

  return stories < 2 ? [] : [{ file, pairs: fixturePairs({ file, source }) }];
};

const runStorybookProject = (): void => {
  execFileSync(
    resolve(root, 'node_modules/.bin/vitest'),
    ['run', '--config', 'vitest.renders.config.ts'],
    { cwd: storybook, stdio: 'inherit' },
  );
};

const readFingerprints = (): Fingerprints =>
  JSON.parse(readFileSync(fingerprintPath, 'utf8'));

const report = (problems: readonly string[], files: number): number => {
  for (const problem of problems) console.error(problem);

  console.log(
    `check-story-renders: ${files} files, ${problems.length} problems`,
  );

  return problems.length > 0 ? 1 : 0;
};

/* An argument narrows the plan to the files whose path contains it, for trying one gate by hand. */
const only = process.argv[2] ?? '';

const files = presentationFiles()
  .filter((file): boolean => file.includes(only))
  .flatMap(planFor);

writeFileSync(planPath, JSON.stringify({ files }, undefined, 2));

const release = await lockBrowserSuite();

try {
  runStorybookProject();
} finally {
  release?.();
}

const { renders, childPairs, failures } = readFingerprints();

const code = report(
  [
    ...failures,
    ...duplicateRenderProblems(renders),
    ...childStateProblems(childPairs),
  ],
  files.length,
);

console.log(`check-story-renders: fingerprints in ${fingerprintPath}`);

process.exit(code);

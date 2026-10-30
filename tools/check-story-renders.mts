/*
 * The render gates' runner: it plans what to draw, hands the plan to the Storybook browser project,
 * and reads the fingerprints back through `story-render-rules.mts`. Rendering every story twice is
 * minutes of browser time, so this runs in CI rather than in `pnpm quality:lint`
 * (docs/agents/hooks.md).
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { lockBrowserSuite } from '@repo/browser-suite-lock';
import { readStory, testStory, type StoryFile } from './story-file.mts';
import { loadStoryFiles } from './story-files.mts';
import {
  childStateProblems,
  duplicateRenderProblems,
  fixturePairs,
  type ChildStatePair,
  type FixturePair,
  type StoryRender,
} from './story-render-rules.mts';
import { root } from './tracked-files.mts';

type PlannedFile = { file: string; pairs: FixturePair[] };

type Fingerprints = {
  renders: StoryRender[];
  childPairs: ChildStatePair[];
  failures: string[];
};

const storybook = resolve(root, 'apps/storybook');

const planPath = resolve(storybook, 'story-render-plan.json');

const fingerprintPath = resolve(storybook, 'story-render-fingerprints.json');

const presentationFiles = (): StoryFile[] =>
  loadStoryFiles(['packages/*/src/**/*.stories.tsx']).filter(
    ({ file }): boolean => !testStory.test(file),
  );

const planFor = (story: StoryFile): PlannedFile[] =>
  readStory(story).exports.length < 2
    ? []
    : [{ file: story.file, pairs: fixturePairs(story) }];

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
  .filter(({ file }): boolean => file.includes(only))
  .flatMap(planFor);

const release = await lockBrowserSuite();

/* Under the lock: two runs share one plan file, so writing it early hands the waiting run the other's. */
writeFileSync(planPath, JSON.stringify({ files }, undefined, 2));

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

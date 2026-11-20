/*
 * The render gates' runner: it plans what to draw, hands the plan to the Storybook browser project,
 * and reads the fingerprints back through `story-render-rules.mts`. Rendering every story twice is
 * minutes of browser time, so this runs in CI rather than in `pnpm quality:lint`
 * (docs/agents/hooks.md).
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { lockBrowserSuite } from '@repo/browser-suite-lock';
import { changedPaths } from './hook-checks.mts';
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
import {
  capScope,
  renderScope,
  type RenderScope,
} from './story-render-scope.mts';
import { parseShard, shardByWeight } from './story-render-shard.mts';
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

/* What a file costs in the browser: each story is drawn once and each candidate pair twice more. */
type Weighted = PlannedFile & { weight: number };

const planFor = (story: StoryFile): Weighted[] => {
  const { exports } = readStory(story);

  if (exports.length < 2) return [];

  const pairs = fixturePairs(story);

  return [
    { file: story.file, pairs, weight: exports.length + 2 * pairs.length },
  ];
};

const runStorybookProject = (): void => {
  execFileSync(
    resolve(root, 'node_modules/.bin/vitest'),
    ['run', '--config', 'vitest.renders.config.ts'],
    { cwd: storybook, stdio: 'inherit' },
  );
};

const listInto = (base: string, listing: string): void => {
  execFileSync(
    resolve(root, 'node_modules/.bin/vitest'),
    ['list', '--filesOnly', '--changed', base, `--json=${listing}`],
    {
      cwd: root,
      // Under Vitest the Storybook project indexes test stories only; the gate draws presentation stories.
      env: { ...process.env, ARGO_LIST_EVERY_STORY: '1' },
      stdio: ['ignore', 'ignore', 'inherit'],
    },
  );
};

// Vitest's module graph names every story file that imports a changed file, without starting a browser.
const dependentStories = (base: string): string[] => {
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

const scopeFor = (base: string | undefined, changed: string[]): RenderScope =>
  base === undefined
    ? { all: true }
    : renderScope({ changed, dependents: dependentStories(base), root });

// Every file in a full run; past RENDER_LIMIT in a scoped one, those in the touched folders.
const capped = (
  stories: StoryFile[],
  scope: RenderScope,
  changed: string[],
): StoryFile[] => {
  if (scope.all) return stories;

  const kept = capScope({
    files: stories.map(({ file }): string => file),
    changed,
    root,
  });

  if (kept.narrowed)
    console.log(
      `check-story-renders: the change reaches ${kept.dependents} story files; drawing the ${kept.files.length} in the folders it touched. The push to main draws them all.`,
    );

  const files = new Set(kept.files);

  return stories.filter(({ file }): boolean => files.has(file));
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

/*
 * A path fragment narrows the plan to the files whose path contains it, for trying one gate by hand.
 * `--changed=<ref>` draws only the files a change since that ref reaches; without it, every file.
 * `--shard=2/4` keeps that runner's share of the plan; both gates judge one file against itself, so
 * the shards need no merge and each judges its own drawings.
 */
const args = process.argv.slice(2);

const only = args.find((arg): boolean => !arg.startsWith('--')) ?? '';

const shardArg = args.find((arg): boolean => arg.startsWith('--shard='));

const changedArg = args.find((arg): boolean => arg.startsWith('--changed='));

const shard =
  shardArg === undefined
    ? undefined
    : parseShard(shardArg.slice('--shard='.length));

if (shardArg !== undefined && shard === undefined) {
  console.error(`check-story-renders: ${shardArg} is not --shard=<n>/<total>.`);
  process.exit(2);
}

const base = changedArg?.slice('--changed='.length);

const changed = base === undefined ? [] : changedPaths(base);

const scope = scopeFor(base, changed);

const inScope = ({ file }: StoryFile): boolean =>
  scope.all || scope.files.has(file);

const reached = presentationFiles()
  .filter(({ file }): boolean => file.includes(only))
  .filter(inScope);

const planned = capped(reached, scope, changed).flatMap(planFor);

const files: PlannedFile[] = (
  shard === undefined
    ? planned
    : shardByWeight(planned, ({ weight }): number => weight, shard)
).map(({ file, pairs }): PlannedFile => ({ file, pairs }));

if (files.length === 0) {
  console.log('check-story-renders: the change reaches no story file to draw.');
  process.exit(0);
}

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

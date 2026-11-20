// Shadow plan for the exact checkout the required browser jobs test.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { relative } from 'node:path';
import { dependentStories } from './story-dependents.mts';
import { readStory, testStory } from './story-file.mts';
import { loadStoryFiles } from './story-files.mts';
import { planStories } from './story-job-plan.mts';
import { root } from './tracked-files.mts';

const git = (...args: string[]): string =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8' });
const base = process.argv[2] ?? '';
function changedPaths(): string[] | undefined {
  if (!base) return undefined;
  try {
    // Disabling rename detection exposes a rename's deleted path as well.
    const diff = [
      'diff',
      '--no-renames',
      '-z',
      '--name-only',
      base + '...HEAD',
    ];
    if (git(...diff, '--diff-filter=D').length) return undefined;
    return git(...diff)
      .split('\0')
      .filter(Boolean);
  } catch {
    return undefined;
  }
}

const inventory = loadStoryFiles(['packages/*/src/**/*.stories.tsx']).flatMap(
  (story) => {
    const weight = readStory(story).exports.length;
    return weight >= 2 || testStory.test(story.file)
      ? [{ file: story.file, weight: Math.max(1, weight) }]
      : [];
  },
);
const changed = changedPaths();
const plan = planStories(inventory, changed, () =>
  dependentStories(base).map((file) => relative(root, file)),
);
writeFileSync(
  process.argv[3]!,
  JSON.stringify(
    { revision: git('rev-parse', 'HEAD').trim(), base, changed, ...plan },
    null,
    2,
  ),
);
console.log(`Shadow plan: ${plan.jobs} browser jobs. ${plan.reason}.`);

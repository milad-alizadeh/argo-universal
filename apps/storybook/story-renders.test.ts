/*
 * The browser half of the render gates. It reads the plan `tools/check-story-renders.mts` wrote,
 * draws what the plan names, and writes the fingerprints back for that runner to judge.
 */
import {
  composeStories,
  setProjectAnnotations,
} from '@storybook/react-native-web-vite';
import { expect, test } from 'vitest';
import { page, server } from 'vitest/browser';
import type {
  ChildStatePair,
  FixturePair,
  StoryRender,
} from '../../tools/story-render-rules.mts';
import preview from './.storybook/preview';
import { auditCompactMenuPaint } from './composer-material-render-audit.ts';
import {
  drawStory,
  type ComposedStory,
  type DrawnStory,
  measurePair,
  presentationStories,
  type PairSubject,
  type StoryModule,
} from './story-render-capture.ts';

type PlannedFile = { file: string; pairs: FixturePair[] };

type Plan = { files: PlannedFile[] };

const PLAN_FILE = 'story-render-plan.json';

const FINGERPRINT_FILE = 'story-render-fingerprints.json';

const annotations = setProjectAnnotations([preview]);

type StoryExports = Parameters<typeof composeStories>[0];

const modules = import.meta.glob<StoryExports>(
  '../../packages/*/src/**/*.stories.tsx',
);

const plan: Plan = JSON.parse(await server.commands.readFile(PLAN_FILE));

/* A narrowed run can plan nothing to draw; only a planned file that drew nothing is a fault. */
const DRAWINGS_EXPECTED = plan.files.length > 0 ? 1 : 0;

const renders: StoryRender[] = [];

const childPairs: ChildStatePair[] = [];

const failures: string[] = [];

const moduleFor = async (file: string): Promise<StoryModule> => {
  const tail = file.replace('packages/', '');

  const load = Object.entries(modules).find(([candidate]): boolean =>
    candidate.endsWith(tail),
  )?.[1];

  if (load === undefined) throw new Error(`no story module for ${file}`);

  return composeStories(await load());
};

/*
 * A cold first draw paints differently from every warm one after it — fonts land, an entry
 * animation starts from nothing — so the first story is drawn once and thrown away. Without it a
 * story in the first slot never matches its own copy, and a duplicate of it goes unreported.
 */
const warmUp = async (module: StoryModule): Promise<void> => {
  const first = presentationStories(module)[0];
  const story = first === undefined ? undefined : module[first];

  if (story !== undefined) await drawStory(story);
};

const drawAuditedStory = async (
  file: string,
  name: string,
  story: ComposedStory,
): Promise<DrawnStory> => {
  if (
    !file.endsWith('/composer-pill-comparison.stories.tsx') ||
    name !== 'CompactMenuSurface'
  )
    return drawStory(story);

  await page.viewport(390, 844);

  try {
    const drawn = await drawStory(story);

    await auditCompactMenuPaint();

    return drawn;
  } finally {
    await page.viewport(1440, 900);
  }
};

const drawFile = async (
  file: string,
  module: StoryModule,
): Promise<Map<string, PairSubject>> => {
  const subjects = new Map<string, PairSubject>();

  await warmUp(module);

  for (const name of presentationStories(module)) {
    const story = module[name];

    if (story === undefined) continue;
    const drawn = await drawAuditedStory(file, name, story);

    subjects.set(name, { story, tree: drawn.tree });
    renders.push({
      file,
      story: name,
      domHash: drawn.domHash,
      pixelHash: drawn.pixelHash,
    });
  }

  return subjects;
};

const recordPair = async (
  pair: FixturePair,
  subjects: ReadonlyMap<string, PairSubject>,
): Promise<void> => {
  const left = subjects.get(pair.first);
  const right = subjects.get(pair.second);

  if (left === undefined || right === undefined) return;

  childPairs.push({ ...pair, ...(await measurePair(left, right)) });
};

const runPlannedFile = async (planned: PlannedFile): Promise<void> => {
  const subjects = await drawFile(planned.file, await moduleFor(planned.file));

  for (const pair of planned.pairs) await recordPair(pair, subjects);
};

/* One story that will not draw must not cost the run every other file's fingerprints. */
const tryPlannedFile = async (planned: PlannedFile): Promise<void> => {
  try {
    await runPlannedFile(planned);
  } catch (error) {
    failures.push(
      `${planned.file}: a story would not draw (${String(error)}).`,
    );
  }
};

test('fingerprints every planned story render', async (): Promise<void> => {
  await annotations.beforeAll?.();

  for (const planned of plan.files) await tryPlannedFile(planned);

  await server.commands.writeFile(
    FINGERPRINT_FILE,
    JSON.stringify({ renders, childPairs, failures }, undefined, 2),
  );

  expect(renders.length).toBeGreaterThanOrEqual(DRAWINGS_EXPECTED);
});

import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
  atlas,
  canvas,
  field,
  labels,
  nodes,
  rectType,
  selectedRect,
} from './testing/atlas-view';
import {
  app,
  appSource,
  commit,
  emptyRepository,
  git,
  largeRepository,
  repository,
  temporaryFolder,
} from './testing/git-fixtures';

// The Engine's limit on a drawn page, in bytes.
const pageBytes = 1_047_552;

const wait = { timeout: 10_000 };

const files = ['README.md', app, 'src/lib/parse.ts'];

it('draws each text file of the Project, named by its path', async () => {
  const view = await atlas(await repository());
  await expect.poll(() => canvas(view), wait).toBeDefined();

  expect(labels(view)).toEqual(files);
});

it('selects a file and shows what the map measured', async () => {
  const view = await atlas(await repository());
  await view.find(app);
  await view.press(app);

  await expect
    .poll(() => selectedRect(view), wait)
    .toMatchObject({ props: { label: app } });
  expect(field(view, 'Lines')).toMatchObject({ props: { text: '8' } });
  expect(field(view, 'Branching lines')).toMatchObject({
    props: { text: '3' },
  });
  expect(field(view, 'Changes')).toMatchObject({ props: { text: '2' } });
});

it('reads the files whatever pattern syntax the user configured for git grep', async () => {
  const folder = await repository();
  await git(folder, 'config', 'grep.patternType', 'fixed');

  const view = await atlas(folder);
  await expect.poll(() => canvas(view), wait).toBeDefined();

  expect(labels(view)).toEqual(files);
});

it('draws only the folder of a Project inside a larger repository, with its history', async () => {
  const folder = await emptyRepository();

  await commit(
    folder,
    { 'outside.md': 'outside\n', [`pkg/${app}`]: appSource },
    'Add both folders',
  );

  const view = await atlas(join(folder, 'pkg'));
  await view.find(app);
  await view.press(app);

  await expect.poll(() => field(view, 'Changes'), wait).toBeDefined();
  expect(labels(view)).toEqual([app]);
  expect(field(view, 'Changes')).toMatchObject({ props: { text: '1' } });
});

it('says so when the Project is not a git repository', async () => {
  const view = await atlas(await temporaryFolder());

  await view.find('Could not read this Project’s files.');
  expect(canvas(view)).toBeUndefined();
});

it('draws the largest files of a big Project within the page limit', async () => {
  const view = await atlas(await largeRepository());
  await view.find('Showing the 2,500 largest of 3,000 files.');

  expect(nodes(view, rectType)).toHaveLength(2500);
  expect(Buffer.byteLength(JSON.stringify(view.tree))).toBeLessThan(pageBytes);
});

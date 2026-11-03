import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
  follow,
  issuesRoot,
  issueTitle,
  linkedPage,
  project,
  signedIn,
  wait,
  type PageView,
} from './journey-fixture';

const shownValue = (view: PageView, text: string): string => {
  const value = view.findText(text)?.node.props.value;

  return typeof value === 'string' ? value : '';
};

const assignedToYou = 'Assigned to you';

const selected = (view: PageView, title: string): boolean =>
  view.findText(title)?.node.props.selected === true;

it('groups Issues by status, by you and by label, each with its own list', async () => {
  const { root } = await issuesRoot();

  await expect.poll(() => shownValue(root, 'Open'), wait).toBe('2');
  expect(root.tree).toMatchObject({
    type: 'ListDetail',
    slots: { list: [{ type: 'List' }] },
  });
  expect(shownValue(root, 'Closed')).toBe('0');
  expect(root.findText(assignedToYou)).toBeDefined();
  await expect
    .poll(() => root.findText('good first issue'), wait)
    .toBeDefined();
  expect(root.findText(issueTitle)).toBeUndefined();
  expect(linkedPage(root, 'good first issue')).toBe(
    '/projects/project-1/filters/label-good_20_first_20_issue',
  );
}, 20_000);

it('declares the page the section opens on, with no empty landing', async () => {
  const { root } = await issuesRoot();

  await expect
    .poll(() => root.tree?.props.landing, wait)
    .toBe('/projects/project-1/filters/open');
  expect(root.tree?.slots.empty).toBeUndefined();
}, 20_000);

it('nests a sub-Issue under its parent in a filter list', async () => {
  const { test, root } = await issuesRoot();
  const list = await follow(test, root, 'Open');

  await expect.poll(() => list.findText(issueTitle), wait).toBeDefined();

  const parent = list.findText(issueTitle)?.node;

  expect(JSON.stringify(parent?.children)).toContain(
    'Fixture issue GitHub cannot change',
  );
}, 20_000);

it('opens a filter list, then an Issue from it, on pages beside the one list', async () => {
  const { test, root } = await issuesRoot();
  const list = await follow(test, root, 'Open');

  await expect.poll(() => list.findText(issueTitle), wait).toBeDefined();
  expect(list.tree).toMatchObject({
    type: 'Screen',
    props: { title: 'Open' },
  });
  expect(list.findText(assignedToYou)).toBeUndefined();
  expect(JSON.stringify(list.tree)).toContain('"color":"#d73a4a"');

  const detail = await follow(test, list, issueTitle);
  expect(detail.tree).toMatchObject({ type: 'Screen' });
  expect(detail.findText(assignedToYou)).toBeUndefined();

  // Detail draws the body as `markdown`, which `findText` does not read.
  await expect
    .poll(
      () =>
        JSON.stringify(detail.tree).includes(
          'This Issue came from the fixture GitHub.',
        ),
      wait,
    )
    .toBe(true);
  // The Issue's one link out is a header Action; its properties sit in the Screen's aside.
  expect(detail.tree?.slots.aside?.[0]).toMatchObject({ type: 'Metadata' });
  expect(await test.log()).not.toContain('refused');
}, 20_000);

it('shows the Project the shown page belongs to in the one list', async () => {
  const other = { ...project, id: 'project-2', name: 'Other Project' };
  const { test } = await signedIn([project, other]);
  const root = await test.mount({ page: '/', surface: { platform: 'web' } });
  await expect.poll(() => root.findText(other.name), wait).toBeDefined();
  expect(selected(root, project.name)).toBe(true);
  expect(linkedPage(root, 'Open')).toBe('/projects/project-1/filters/open');

  const list = await follow(test, root, other.name);
  await expect.poll(() => list.findText(issueTitle), wait).toBeDefined();
  await expect.poll(() => selected(root, other.name), wait).toBe(true);
  expect(linkedPage(root, 'Open')).toBe('/projects/project-2/filters/open');
  await expect.poll(() => shownValue(root, 'Open'), wait).toBe('2');

  const detail = await follow(test, list, issueTitle);
  await expect.poll(() => detail.findText('Start Session'), wait).toBeDefined();
  expect(selected(root, other.name)).toBe(true);
}, 20_000);

it('shows an empty list for a filter with no Issues', async () => {
  const { test, root } = await issuesRoot();
  const list = await follow(test, root, 'Closed');

  await expect.poll(() => list.findText('No Issues.'), wait).toBeDefined();
}, 20_000);

it('lists a Project added after the section opened when Check again is pressed', async () => {
  const { test } = await signedIn([]);
  const root = await test.mount({ page: '/', surface: { platform: 'web' } });

  await expect
    .poll(() => root.findText('No Projects yet.'), wait)
    .toBeDefined();
  const path = await mkdtemp(join(tmpdir(), 'argo-project-'));

  await test.projects.add({ ...project, path });
  await root.press('Check again');

  await expect.poll(() => root.findText('Open'), wait).toBeDefined();
}, 20_000);

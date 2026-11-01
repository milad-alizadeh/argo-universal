import { expect, it } from 'vitest';
import {
  follow,
  issuesRoot,
  issueTitle,
  linkedPage,
  chooseGithub,
  project,
  tracker,
  trackerPage,
  wait,
  type PageView,
} from './journey-fixture';

const shownValue = (view: PageView, text: string): string => {
  const value = view.findText(text)?.node.props.value;

  return typeof value === 'string' ? value : '';
};

const listDetail = 'ListDetail';

const assignedToYou = 'Assigned to you';

const selected = (view: PageView, title: string): boolean =>
  view.findText(title)?.node.props.selected === true;

it('groups Issues by status, by you and by label, each with its own list', async () => {
  const { root } = await issuesRoot();

  await expect.poll(() => shownValue(root, 'Open'), wait).toBe('2');
  expect(root.tree).toMatchObject({
    type: listDetail,
    slots: { list: [{ type: 'List' }], empty: [{ type: 'EmptyState' }] },
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

it('nests a sub-Issue under its parent in a filter list', async () => {
  const { test, root } = await issuesRoot();
  const list = await follow(test, root, 'Open');

  await expect.poll(() => list.findText(issueTitle), wait).toBeDefined();

  const parent = list.findText(issueTitle)?.node;

  expect(JSON.stringify(parent?.children)).toContain(
    'Fixture issue gh cannot change',
  );
}, 20_000);

it('opens a filter list, then an Issue from it, on their own pages', async () => {
  const { test, root } = await issuesRoot();
  const list = await follow(test, root, 'Open');

  await expect.poll(() => list.findText(issueTitle), wait).toBeDefined();
  expect(list.tree).toMatchObject({
    type: listDetail,
    slots: {
      list: [{ type: 'List' }],
      detail: [{ type: 'Screen', props: { title: 'Open' } }],
    },
  });
  expect(list.findText(assignedToYou)).toBeDefined();
  expect(list.findText('Open')?.node.props.selected).toBe(true);
  expect(JSON.stringify(list.tree)).toContain('"color":"#d73a4a"');

  const detail = await follow(test, list, issueTitle);
  expect(detail.tree).toMatchObject({
    type: listDetail,
    slots: { list: [{ type: 'List' }], detail: [{ type: 'Screen' }] },
  });
  expect(detail.findText(assignedToYou)).toBeDefined();

  // Detail draws the body as `markdown`, which `findText` does not read.
  await expect
    .poll(
      () =>
        JSON.stringify(detail.tree).includes(
          'This Issue came from the fixture gh executable.',
        ),
      wait,
    )
    .toBe(true);
  // The Issue's one link out is a property beside its description: the number goes to GitHub.
  expect(detail.findText('#42')?.node.props.href).toBe(
    'https://github.com/owner/repository/issues/42',
  );
  expect(await test.log()).not.toContain('refused');
  expect(
    (await test.log()).match(
      /argo\.process\.run gh api -X GET search\/issues/g,
    ),
  ).toHaveLength(5);
}, 20_000);

it('keeps the selected Project in the sidebar across filter and Issue routes', async () => {
  const other = { ...project, id: 'project-2', name: 'Other Project' };
  const test = await tracker([project, other]);
  await chooseGithub(trackerPage(test, other.id));
  const root = await test.mount({ page: '/', surface: { platform: 'web' } });
  await expect.poll(() => root.findText(other.name), wait).toBeDefined();

  const projectPage = await follow(test, root, other.name);
  await expect.poll(() => shownValue(projectPage, 'Open'), wait).toBe('2');
  expect(selected(projectPage, other.name)).toBe(true);
  expect(linkedPage(projectPage, 'Open')).toBe(
    '/projects/project-2/filters/open',
  );

  const list = await follow(test, projectPage, 'Open');
  await expect.poll(() => list.findText(issueTitle), wait).toBeDefined();
  expect(selected(list, other.name)).toBe(true);

  const detail = await follow(test, list, issueTitle);
  await expect.poll(() => detail.findText('Start Session'), wait).toBeDefined();
  expect(selected(detail, other.name)).toBe(true);
  expect(linkedPage(detail, 'Open')).toBe('/projects/project-2/filters/open');
}, 20_000);

it('shows an empty list for a filter with no Issues', async () => {
  const { test, root } = await issuesRoot();
  const list = await follow(test, root, 'Closed');

  await expect.poll(() => list.findText('No Issues.'), wait).toBeDefined();
}, 20_000);

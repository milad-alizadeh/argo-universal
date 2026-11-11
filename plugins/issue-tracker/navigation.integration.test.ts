import { expect, it } from 'vitest';
import type { GitHubFixture } from './github-fixture';
import {
  chooseGithub,
  issuesRoot,
  signIn,
  trackedGitHub,
  issueTitle,
  linkedPage,
  project,
  signedInRoot,
  tracker,
  trackerPage,
  type OpenPage,
} from './journey-fixture';

const shownValue = (page: OpenPage, text: string): string => {
  const value = page.findText(text)?.node.props.value;

  return typeof value === 'string' ? value : '';
};

const listDetail = 'ListDetail';

const assignedToYou = 'Assigned to you';

const checkAgain = 'Check again';

const selected = (page: OpenPage, title: string): boolean =>
  page.findText(title)?.node.props.selected === true;

it('groups Issues by status, by you and by label, each with its own list', async () => {
  const { root } = await issuesRoot();

  expect(shownValue(root, 'Open')).toBe('2');
  expect(root.tree).toMatchObject({
    type: listDetail,
    slots: { list: [{ type: 'List' }], empty: [{ type: 'EmptyState' }] },
  });
  expect(shownValue(root, 'Closed')).toBe('0');
  expect(root.findText(assignedToYou)).toBeDefined();
  expect(root.findText('good first issue')).toBeDefined();
  expect(root.findText(issueTitle)).toBeUndefined();
  expect(linkedPage(root, 'good first issue')).toBe(
    '/projects/project-1/filters/label-good_20_first_20_issue',
  );
}, 20_000);

it('nests a sub-Issue under its parent in a filter list', async () => {
  const { root } = await issuesRoot();
  const list = await root.press('Open');

  const parent = list.findText(issueTitle)?.node;

  expect(JSON.stringify(parent?.children)).toContain(
    'Fixture issue GitHub cannot change',
  );
}, 20_000);

const overviewCalls = (github: GitHubFixture): unknown[] =>
  github.graphqlCalls().filter(({ body }) => body.includes('count0'));

it('opens a filter list, then an Issue from it, on their own pages', async () => {
  const { test, github, root } = await signedInRoot();
  const list = await root.press('Open');

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

  const detail = await list.press(issueTitle);
  expect(detail.tree).toMatchObject({
    type: listDetail,
    slots: { list: [{ type: 'List' }], detail: [{ type: 'Screen' }] },
  });
  expect(detail.findText(assignedToYou)).toBeDefined();

  // Detail draws the body as `markdown`, which `findText` does not read.
  expect(JSON.stringify(detail.tree)).toContain(
    'This Issue came from the fixture GitHub.',
  );
  // The Issue's one link out is a property beside its description: the number goes to GitHub.
  expect(detail.findText('#42')?.node.props.href).toBe(
    'https://github.com/owner/repository/issues/42',
  );
  expect(await test.log()).not.toContain('refused');
  // The three pages read one overview, which is one GraphQL call.
  expect(overviewCalls(github)).toHaveLength(1);
}, 20_000);

it('keeps the selected Project in the sidebar across filter and Issue routes', async () => {
  const other = { ...project, id: 'project-2', name: 'Other Project' };
  const test = await tracker([project, other]);
  await chooseGithub(await trackerPage(test, other.id));
  const root = await test.pages.open({ path: '/' });
  expect(root.findText(other.name)).toBeDefined();

  const projectPage = await root.press(other.name);
  expect(shownValue(projectPage, 'Open')).toBe('2');
  expect(selected(projectPage, other.name)).toBe(true);
  expect(linkedPage(projectPage, 'Open')).toBe(
    '/projects/project-2/filters/open',
  );

  const list = await projectPage.press('Open');
  expect(list.findText(issueTitle)).toBeDefined();
  expect(selected(list, other.name)).toBe(true);

  const detail = await list.press(issueTitle);
  expect(detail.findText('Start Session')).toBeDefined();
  expect(selected(detail, other.name)).toBe(true);
  expect(linkedPage(detail, 'Open')).toBe('/projects/project-2/filters/open');
}, 20_000);

it('shows an empty list for a filter with no Issues', async () => {
  const { root } = await issuesRoot();
  const list = await root.press('Closed');

  expect(list.findText('No Issues.')).toBeDefined();
}, 20_000);

it('says an Issue its tracker cannot read as a danger Callout on its own page', async () => {
  const { test } = await issuesRoot();

  const page = await test.pages.open({
    path: '/projects/project-1/issues/404',
  });

  const drawn = JSON.stringify(page.tree);

  expect(drawn).toContain('"type":"Callout"');
  expect(drawn).toContain('"tone":"danger"');
  expect(drawn).toContain('Could not resolve');
  expect(page.findText('Start Session')).toBeUndefined();
}, 20_000);

it('offers Check again on the Callout of an Issue it cannot read', async () => {
  const { test } = await issuesRoot();

  const page = await test.pages.open({
    path: '/projects/project-1/issues/404',
  });

  expect(page.findText(checkAgain)).toBeDefined();
  expect((await page.press(checkAgain)).findText(checkAgain)).toBeDefined();
}, 20_000);

it('does not show the filter’s raw search as its caption', async () => {
  const { root } = await issuesRoot();
  const list = await root.press('Open');

  expect(JSON.stringify(list.tree)).not.toContain('is:open');
}, 20_000);

it('offers Choose a tracker where a Project has none, and opens that Project’s choice', async () => {
  const tracked = await trackedGitHub();

  await signIn(tracked);

  const page = await tracked.test.pages.open({
    path: '/projects/project-1/filters/open',
  });

  const choice = await page.press('Choose a tracker');

  await choice.press('GitHub Issues');
  expect(choice.findText('GitHub Issues')?.node.props.selected).toBe(true);

  const list = await tracked.test.pages.open({
    path: '/projects/project-1/filters/open',
  });

  expect(list.findText(issueTitle)).toBeDefined();
}, 20_000);

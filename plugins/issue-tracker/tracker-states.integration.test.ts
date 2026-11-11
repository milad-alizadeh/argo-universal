import { expect, it } from 'vitest';
import type { GitHubFixture } from './github-fixture';
import {
  issueTitle,
  linkedPage,
  signedInRoot,
  signIn,
  trackedGitHub,
  trackerPage,
} from './journey-fixture';

const checkAgain = 'Check again';

const githubIssues = 'GitHub Issues';

const issueReads = (github: GitHubFixture): number =>
  github.graphqlCalls().filter(({ body }) => body.includes('issue(number:'))
    .length;

it('offers Check again on the Callout of an Issue it cannot read, and reads it again when pressed', async () => {
  const { test, github } = await signedInRoot();

  const page = await test.pages.open({
    path: '/projects/project-1/issues/404',
  });

  const before = issueReads(github);

  expect(page.findText(checkAgain)).toBeDefined();
  await page.press(checkAgain);

  expect(issueReads(github)).toBeGreaterThan(before);
}, 20_000);

it('does not show the filter’s raw search as the Screen’s caption', async () => {
  const { root } = await signedInRoot();
  const list = await root.press('Open');

  const screen = list.find(({ type }) => type === 'Screen');

  expect(screen.props.title).toBe('Open');
  expect(screen.props).not.toHaveProperty('caption');
}, 20_000);

it('says there is no Project for a Tracker choice path that names none', async () => {
  const tracked = await trackedGitHub();

  await signIn(tracked);

  const page = await tracked.test.pages.open({
    path: '/projects/ghost/tracker',
  });

  expect(page.findText('No Project')).toBeDefined();
  expect(page.findText(githubIssues)).toBeUndefined();
}, 20_000);

it('offers Choose a tracker where a Project has none, and opens that Project’s choice', async () => {
  const tracked = await trackedGitHub();

  await signIn(tracked);

  const page = await tracked.test.pages.open({
    path: '/projects/project-1/filters/open',
  });

  expect(linkedPage(page, 'Choose a tracker')).toBe(
    '/projects/project-1/tracker',
  );

  const choice = await page.press('Choose a tracker');

  await choice.press(githubIssues);
  expect(choice.findText(githubIssues)?.node.props.selected).toBe(true);

  const list = await tracked.test.pages.open({
    path: '/projects/project-1/filters/open',
  });

  expect(list.findText(issueTitle)).toBeDefined();
}, 20_000);

it('names the Project in a choice made from the path, and not in one made from Project details', async () => {
  const tracked = await trackedGitHub();

  await signIn(tracked);

  const fromDetails = await trackerPage(tracked.test);

  const fromPath = await tracked.test.pages.open({
    path: '/projects/project-1/tracker',
  });

  expect(fromDetails.find(githubIssues).props.onPress).toHaveProperty('args', {
    tracker: 'github',
  });
  expect(fromPath.find(githubIssues).props.onPress).toHaveProperty('args', {
    projectId: 'project-1',
    tracker: 'github',
  });
}, 20_000);

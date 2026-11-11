import type { OpenPage, PluginTest } from '@argo/plugin-kit/testing';
import { expect, it } from 'vitest';
import type { GitHubFixture } from './github-fixture';
import {
  chooseGithub,
  issueTitle,
  project,
  refusedTitle,
  signedInRoot,
  signIn,
  trackedGitHub,
  trackerPage,
} from './journey-fixture';
import { attach, rowSlot, watch, until, itemsOf } from './session-slot-fixture';

const issueCalls = (github: GitHubFixture): number =>
  github.graphqlCalls().filter(({ body }) => body.includes('issue(number:'))
    .length;

const overviewCalls = (github: GitHubFixture): number =>
  github.graphqlCalls().filter(({ body }) => body.includes('count0')).length;

const closeLabel = 'Close Issue';

const startLabel = 'Start Session';

const signInLabel = 'Sign in to GitHub';

// The sign-in polls on the Plugin's clock; each step lets one poll through.
async function untilShown(
  test: PluginTest,
  page: OpenPage,
  text: string,
): Promise<void> {
  for (let step = 0; step < 6 && !page.findText(text); step += 1) {
    await test.clock.advance(1000);
    await page.draw();
  }

  expect(page.findText(text)).toBeDefined();
}

it('opens an Issue from its row with its title and status at once, and no further GitHub call', async () => {
  const { github, root } = await signedInRoot();
  const list = await root.press('Open');
  const before = github.graphqlCalls().length;

  const page = await list.press(issueTitle);

  expect(github.graphqlCalls()).toHaveLength(before);
  expect(page.findText(startLabel)).toBeDefined();
  expect(page.findText(closeLabel)).toBeDefined();
  expect(JSON.stringify(page.tree)).toContain(
    'This Issue came from the fixture GitHub.',
  );
  expect(JSON.stringify(page.tree)).not.toContain('Loading Issue…');
});

it('makes one call for an Issue a Slot and then a page both read', async () => {
  const tracked = await trackedGitHub();

  await signIn(tracked);
  await chooseGithub(await trackerPage(tracked.test));
  await attach(tracked.test, 'attach');

  const answers = watch(tracked.test, rowSlot);

  await until(answers, (answer) => itemsOf(answer).length > 0);
  await expect
    .poll(() => issueCalls(tracked.github), { timeout: 10_000 })
    .toBe(1);

  const page = await tracked.test.pages.open({
    path: `/projects/${project.id}/issues/42`,
  });

  expect(page.findText(startLabel)).toBeDefined();
  expect(issueCalls(tracked.github)).toBe(1);
});

it('closes an Issue with four pages open and re-reads only the page on screen', async () => {
  const { test, github, root } = await signedInRoot();
  const list = await root.press('Open');
  const issue = await list.press(issueTitle);
  const other = await list.press(refusedTitle);

  expect(other.findText(closeLabel)).toBeDefined();

  const before = github.graphqlCalls().length;
  const overviews = overviewCalls(github);
  const issues = issueCalls(github);

  await issue.press(closeLabel);

  // The Issue page's own overview and Issue; the root, the list and the other Issue are not drawn, so not read.
  expect(github.graphqlCalls().length - before).toBe(2);
  expect(overviewCalls(github) - overviews).toBe(1);
  expect(issueCalls(github) - issues).toBe(1);
  // Past the freshness window, a page nobody draws is still not read: only a page on screen reads again.
  await test.clock.advance(61_000);
  expect(github.graphqlCalls().length - before).toBe(2);
});

it('reads an Issue again once its page’s freshness window has passed, and not before', async () => {
  const { test, github, root } = await signedInRoot();
  const list = await root.press('Open');
  const page = await list.press(issueTitle);

  await test.clock.advance(30_000);
  await page.draw();
  expect(issueCalls(github)).toBe(0);

  await test.clock.advance(31_000);
  await page.draw();
  expect(issueCalls(github)).toBe(1);
});

it('never serves the previous Account’s Issue after signing in as another person', async () => {
  const { test, github, root } = await signedInRoot();
  const list = await root.press('Open');
  const page = await list.press(issueTitle);
  const [account] = test.accounts.list();

  expect(page.findText(issueTitle)).toBeDefined();
  await test.accounts.signOut(account?.id ?? '');
  await test.clock.advance(61_000);
  await page.draw();
  expect(page.findText(issueTitle)).toBeUndefined();
  expect(page.findText(signInLabel)).toBeDefined();

  github.script({ access_token: 'token-2' });
  await page.press(signInLabel);
  await untilShown(test, page, `${issueTitle} (as hubot)`);

  expect(page.findText(issueTitle)).toBeUndefined();
});

it('makes one call for an Issue a Slot and a page opened for a Project both read', async () => {
  const tracked = await trackedGitHub();

  await signIn(tracked);
  await chooseGithub(await trackerPage(tracked.test));
  await attach(tracked.test, 'attach');

  const answers = watch(tracked.test, rowSlot);

  await until(answers, (answer) => itemsOf(answer).length > 0);
  await expect
    .poll(() => issueCalls(tracked.github), { timeout: 10_000 })
    .toBe(1);

  // The App opens a page from Project details or a Session route with that Project's id.
  const page = await tracked.test.pages.open({
    path: `/projects/${project.id}/issues/42`,
    projectId: project.id,
  });

  expect(page.findText(startLabel)).toBeDefined();
  expect(issueCalls(tracked.github)).toBe(1);
});

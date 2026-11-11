import { fileURLToPath } from 'node:url';
import {
  Action,
  startPluginTest,
  type OpenPage,
  type PluginTest,
} from '@argo/plugin-kit/testing';
import { expect, onTestFinished } from 'vitest';
import { githubFixture, type GitHubFixture } from './github-fixture';
import { refusedTitle } from './github-issue-nodes';

type FixtureProject = { id: string; name: string; originUrl: string | null };

export const project: FixtureProject = {
  id: 'project-1',
  name: 'Fixture Project',
  originUrl: 'git@github.com:owner/repository.git',
};

export const issueTitle = 'Fixture issue from GitHub';

// The fixture GitHub refuses every status change to this Issue.
export { refusedTitle };

// Where GitHub's own pages are stood in for: the fixture service and what it saw.
export type Tracked = { test: PluginTest; github: GitHubFixture };

const trackerName = 'GitHub Issues';

// The Tracker choice page, which a Project details row drills into (ADR-0046).
const trackerPath = '/tracker';

export type { OpenPage } from '@argo/plugin-kit/testing';

// The Tracker choice page for one Project, as the row that drilled in opens it.
export const trackerPage = (
  test: PluginTest,
  projectId = project.id,
): Promise<OpenPage> => test.pages.open({ path: trackerPath, projectId });

// A check marks the chosen row.
export const chosen = (page: OpenPage): boolean =>
  page.findText(trackerName)?.node.props.selected === true;

export async function chooseGithub(page: OpenPage): Promise<void> {
  await page.press(trackerName);
  expect(chosen(page)).toBe(true);
}

// The tracker over a fixture GitHub, not signed in; its Plugin clock only moves when the test moves it.
export async function trackedGitHub(projects = [project]): Promise<Tracked> {
  const github = await githubFixture();

  const test = await startPluginTest({
    directory: fileURLToPath(new URL('.', import.meta.url)),
    pluginId: 'issue-tracker',
    version: '0.0.0',
    projects,
    network: github.network,
    clockStart: 0,
  });

  onTestFinished(() => test.close());

  return { test, github };
}

const signInLabel = 'Sign in to GitHub';

// The fixture asks the Plugin to poll every second, and approves at once.
const pollMs = 1000;

const pollLimit = 5;

// Signs in as a person does: asks for the code on the sign-in page, and lets the flow poll until GitHub approves it.
export async function signIn({ test }: Tracked): Promise<void> {
  const page = await test.pages.open({ path: '/sign-in' });

  await page.press(signInLabel);

  for (let poll = 0; poll < pollLimit; poll += 1) {
    if (page.findText('Signed in as octocat')) break;

    await test.clock.advance(pollMs);
    await page.draw();
  }

  expect(page.findText('Signed in as octocat')).toBeDefined();
}

// The tracker with the person already signed in to the fixture GitHub.
export async function tracker(projects = [project]): Promise<PluginTest> {
  const tracked = await trackedGitHub(projects);

  await signIn(tracked);

  return tracked.test;
}

export async function signedInRoot(): Promise<
  Tracked & { root: OpenPage }
> {
  const tracked = await trackedGitHub();

  await signIn(tracked);
  await chooseGithub(await trackerPage(tracked.test));

  return { ...tracked, root: await tracked.test.pages.open({ path: '/' }) };
}

export async function issuesRoot(): Promise<{
  test: PluginTest;
  root: OpenPage;
}> {
  const { test, root } = await signedInRoot();

  return { test, root };
}

// The page path a row's `navigate` Action names.
export function linkedPage(page: OpenPage, text: string): string {
  const action = Action.parse(page.findText(text)?.node.props.onPress);

  if (action.action !== 'navigate')
    throw new Error(`${text} does not navigate`);

  return action.path;
}

// The filter list, then the Issue a row of it opens, as a person presses them.
export async function openIssue(title: string): Promise<OpenPage> {
  const { root } = await issuesRoot();
  const list = await root.press('Open');
  const page = await list.press(title);

  expect(page.findText('Start Session')).toBeDefined();
  expect(page.findText('good first issue')).toBeDefined();

  return page;
}

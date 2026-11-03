import { fileURLToPath } from 'node:url';
import {
  Action,
  startPluginTest,
  type PluginTest,
} from '@argo/plugin-kit/testing';
import { expect, onTestFinished } from 'vitest';
import { githubFixture, type GitHubFixture } from './github-fixture';

export { refusedTitle } from './github-issue-nodes';

type FixtureProject = { id: string; name: string; originUrl: string | null };

export const project: FixtureProject = {
  id: 'project-1',
  name: 'Fixture Project',
  originUrl: 'git@github.com:owner/repository.git',
};

export const issueTitle = 'Fixture issue from GitHub';

export type PageView = Awaited<ReturnType<PluginTest['mount']>>;

export const wait = { timeout: 10_000 };

export type Tracked = { test: PluginTest; github: GitHubFixture };

export async function tracker(projects = [project]): Promise<Tracked> {
  const github = await githubFixture();

  const test = await startPluginTest({
    directory: fileURLToPath(new URL('.', import.meta.url)),
    pluginId: 'issue-tracker',
    version: '0.0.0',
    projects,
    network: github.network,
    clockStart: Date.now(),
  });

  onTestFinished(() => test.close());

  return { test, github };
}

// Moves the Plugin's clock on until the page shows `text`: the device flow waits GitHub's interval between polls.
const clockTickMs = 1000;

export async function clockUntil(
  test: PluginTest,
  view: PageView,
  text: string,
): Promise<void> {
  await expect
    .poll(async () => {
      await test.clock.advance(clockTickMs);

      return view.findText(text);
    }, wait)
    .toBeDefined();
}

// Signs in through the Account's own page, as "Add account" opens it, and waits until the Account is saved.
export async function signIn({ test }: Tracked): Promise<void> {
  const page = await test.mount({
    page: '/sign-in',
    surface: { platform: 'web' },
  });

  await page.press('Sign in to GitHub');
  await clockUntil(test, page, 'Signed in as octocat');
}

export async function signedIn(projects = [project]): Promise<Tracked> {
  const tracked = await tracker(projects);

  await signIn(tracked);

  return tracked;
}

// The one App every page of a journey opens on, as its list and pages share the Project it shows.
export const onApp = {
  surface: { platform: 'web' as const },
  connectionId: 'one-app',
};

export async function issuesRoot(): Promise<Tracked & { root: PageView }> {
  const tracked = await signedIn();

  const root = await tracked.test.mount({ page: '/', ...onApp });

  return { ...tracked, root };
}

// A row's `navigate` Action names the page's own path; the test mounts it as the App would.
export function linkedPage(view: PageView, text: string): string {
  const action = Action.parse(view.findText(text)?.node.props.onPress);

  if (action.action !== 'navigate')
    throw new Error(`${text} does not navigate`);

  return action.path;
}

export async function follow(
  test: PluginTest,
  view: PageView,
  text: string,
): Promise<PageView> {
  await expect.poll(() => view.findText(text), wait).toBeDefined();

  const page = linkedPage(view, text);

  return test.mount({ page, ...onApp });
}

export async function openIssue(title: string): Promise<PageView> {
  const { test, root } = await issuesRoot();
  const list = await follow(test, root, 'Open');
  const page = await follow(test, list, title);

  await expect.poll(() => page.findText('Start Session'), wait).toBeDefined();

  return page;
}

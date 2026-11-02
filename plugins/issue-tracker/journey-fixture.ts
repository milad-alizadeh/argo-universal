import { cp, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

/*
 * The Plugin's own directory with a client ID in place, since the real one is not registered yet: the sign-in tests
 * run the same code against a fixture GitHub that accepts it.
 */
async function withClientId(): Promise<string> {
  const source = fileURLToPath(new URL('.', import.meta.url));
  const directory = await mkdtemp(join(tmpdir(), 'argo-issue-tracker-'));

  await cp(source, directory, {
    recursive: true,
    filter: (path) => !path.includes('node_modules'),
  });
  await writeFile(
    join(directory, 'github-client-id.ts'),
    "export const githubClientId = 'fixture-client-id';\n",
  );
  onTestFinished(() => rm(directory, { recursive: true, force: true }));

  return directory;
}

export async function tracker(projects = [project]): Promise<Tracked> {
  const github = await githubFixture();

  const test = await startPluginTest({
    directory: await withClientId(),
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

export async function issuesRoot(): Promise<Tracked & { root: PageView }> {
  const tracked = await signedIn();

  const root = await tracked.test.mount({
    page: '/',
    surface: { platform: 'web' },
  });

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

  return test.mount({ page, surface: { platform: 'web' } });
}

export async function openIssue(title: string): Promise<PageView> {
  const { test, root } = await issuesRoot();
  const list = await follow(test, root, 'Open');
  const page = await follow(test, list, title);

  await expect.poll(() => page.findText('Start Session'), wait).toBeDefined();
  await expect
    .poll(() => page.findText('good first issue'), wait)
    .toBeDefined();

  return page;
}

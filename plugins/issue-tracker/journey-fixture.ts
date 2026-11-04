import { fileURLToPath } from 'node:url';
import {
  Action,
  startPluginTest,
  type PageView,
  type PluginTest,
} from '@argo/plugin-kit/testing';
import { expect, onTestFinished } from 'vitest';

type FixtureProject = { id: string; name: string; originUrl: string | null };

export const project: FixtureProject = {
  id: 'project-1',
  name: 'Fixture Project',
  originUrl: 'git@github.com:owner/repository.git',
};

export const issueTitle = 'Fixture issue from GitHub';

// The fixture gh refuses every status change to this Issue.
export const refusedTitle = 'Fixture issue gh cannot change';

const trackerName = 'GitHub Issues';

// The Tracker choice page, which a Project details row drills into (ADR-0046).
const trackerPath = '/tracker';

export type { PageView } from '@argo/plugin-kit/testing';

// The Tracker choice page for one Project, as the row that drilled in opens it.
export const trackerPage = (
  test: PluginTest,
  projectId = project.id,
): Promise<PageView> => test.pages.open({ path: trackerPath, projectId });

// A check marks the chosen row.
export const chosen = (view: PageView): boolean =>
  view.findText(trackerName)?.node.props.selected === true;

export async function chooseGithub(view: PageView): Promise<void> {
  await view.press(trackerName);
  expect(chosen(view)).toBe(true);
}

export async function tracker(projects = [project]): Promise<PluginTest> {
  const test = await startPluginTest({
    directory: fileURLToPath(new URL('.', import.meta.url)),
    pluginId: 'issue-tracker',
    version: '0.0.0',
    projects,
    path: [fileURLToPath(new URL('./mocks', import.meta.url))],
  });

  onTestFinished(() => test.close());

  return test;
}

export async function issuesRoot(): Promise<{
  test: PluginTest;
  root: PageView;
}> {
  const test = await tracker();

  await chooseGithub(await trackerPage(test));

  return { test, root: await test.pages.open({ path: '/' }) };
}

// The page path a row's `navigate` Action names.
export function linkedPage(view: PageView, text: string): string {
  const action = Action.parse(view.findText(text)?.node.props.onPress);

  if (action.action !== 'navigate')
    throw new Error(`${text} does not navigate`);

  return action.path;
}

// The filter list, then the Issue a row of it opens, as a person presses them.
export async function openIssue(title: string): Promise<PageView> {
  const { root } = await issuesRoot();
  const list = await root.press('Open');
  const page = await list.press(title);

  expect(page.findText('Start Session')).toBeDefined();
  expect(page.findText('good first issue')).toBeDefined();

  return page;
}

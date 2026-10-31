import { fileURLToPath } from 'node:url';
import {
  Action,
  projectDetailsSlotId,
  startPluginTest,
  type PluginSlotInput,
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

export type SlotView = ReturnType<PluginTest['slot']>;

export type PageView = Awaited<ReturnType<PluginTest['mount']>>;

export const wait = { timeout: 10_000 };

export const slot: PluginSlotInput = {
  slotId: projectDetailsSlotId,
  context: { projectId: project.id },
};

// A check marks the chosen row; its press is held until the stored choice arrives.
export const chosen = (view: SlotView): boolean =>
  view.findText(trackerName)?.node.props.selected === true;

export async function chooseGithub(view: SlotView): Promise<void> {
  await expect
    .poll(() => view.findText(trackerName)?.node.props.disabled, wait)
    .toBe(false);
  await view.press(trackerName);
  await expect.poll(() => chosen(view), wait).toBe(true);
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

  await chooseGithub(test.slot(slot));

  const root = await test.mount({ page: '/', surface: { platform: 'web' } });

  return { test, root };
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

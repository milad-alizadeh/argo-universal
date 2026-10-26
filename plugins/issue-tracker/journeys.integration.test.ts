import { fileURLToPath } from 'node:url';
import { startPluginTest, type PluginTest } from '@argo/plugin-kit/testing';
import {
  projectDetailsSlotId,
  type PluginSlotInput,
  type WireNode,
} from '@repo/contracts/plugins/wire';
import { findWireNodeEntry } from '@repo/contracts/plugins/wire-node-key';
import { expect, it, onTestFinished } from 'vitest';

const project = {
  id: 'project-1',
  name: 'Fixture Project',
  originUrl: 'git@github.com:owner/repository.git',
};

const issueTitle = 'Fixture issue from GitHub';

// The fixture gh refuses every status change to this Issue.
const refusedTitle = 'Fixture issue gh cannot change';

const trackerName = 'GitHub Issues';

type SlotView = ReturnType<PluginTest['slot']>;

type PageView = Awaited<ReturnType<PluginTest['mount']>>;

const wait = { timeout: 10_000 };

const closeIssue = 'Close Issue';

// A check marks the chosen row; its press is held until the stored choice arrives.
const chosen = (view: SlotView): boolean =>
  view.findText(trackerName)?.node.props.selected === true;

async function chooseGithub(view: SlotView): Promise<void> {
  await expect
    .poll(() => view.findText(trackerName)?.node.props.disabled, {
      timeout: 10_000,
    })
    .toBe(false);
  await view.press(trackerName);
  await expect.poll(() => chosen(view), { timeout: 10_000 }).toBe(true);
}

async function tracker(): Promise<PluginTest> {
  const test = await startPluginTest({
    directory: fileURLToPath(new URL('.', import.meta.url)),
    pluginId: 'issue-tracker',
    version: '0.0.0',
    projects: [project],
    path: [fileURLToPath(new URL('./mocks', import.meta.url))],
  });

  onTestFinished(() => test.close());

  return test;
}

const slot: PluginSlotInput = {
  slotId: projectDetailsSlotId,
  context: { projectId: project.id },
};

it('persists a Tracker chosen in the Project details Slot across views', async () => {
  const test = await tracker();
  const first = test.slot(slot);
  await chooseGithub(first);
  first.close();

  const reopened = test.slot(slot);
  await expect.poll(() => chosen(reopened), { timeout: 10_000 }).toBe(true);
}, 20_000);

it('lists Issues from the selected Tracker and opens an Issue description', async () => {
  const test = await tracker();
  await chooseGithub(test.slot(slot));
  const page = await test.mount({ page: '/', surface: { platform: 'web' } });
  await expect
    .poll(() => page.findText(issueTitle), {
      timeout: 10_000,
    })
    .toBeDefined();
  await page.press(issueTitle);
  // Detail draws the body as `markdown`, which `findText` does not read.
  await expect
    .poll(
      () =>
        JSON.stringify(page.tree).includes(
          'This Issue came from the fixture gh executable.',
        ),
      { timeout: 10_000 },
    )
    .toBe(true);
  expect(page.findText('Open in GitHub')?.node.props.onPress).toEqual({
    action: 'openUrl',
    url: 'https://github.com/owner/repository/issues/42',
  });
  expect(await test.log()).not.toContain('refused');
  await page.press('Back to Issues');
  await expect
    .poll(() => page.findText(issueTitle), {
      timeout: 10_000,
    })
    .toBeDefined();
}, 20_000);

async function openIssue(title: string): Promise<PageView> {
  const test = await tracker();
  await chooseGithub(test.slot(slot));
  const page = await test.mount({ page: '/', surface: { platform: 'web' } });
  await expect.poll(() => page.findText(title), wait).toBeDefined();
  await page.press(title);
  await expect.poll(() => page.findText('Start Session'), wait).toBeDefined();

  return page;
}

const isStatus = (node: WireNode): boolean =>
  node.type === 'Metadata.StatusDot';

// The Status the open Issue's Properties show.
function shownStatus(tree: WireNode | null): string {
  const entry = tree && findWireNodeEntry(tree, isStatus);

  return entry ? textOf(entry.node) : '';
}

function textOf(node: WireNode): string {
  const { text } = node.props;

  return typeof text === 'string' ? text : '';
}

// Whether the list's Closed section holds the Issue.
const listedClosed = (page: PageView, title: string): boolean => {
  const section =
    page.tree &&
    findWireNodeEntry(page.tree, (node) => node.props.title === 'Closed');

  return JSON.stringify(section ?? null).includes(title);
};

it('closes and reopens an Issue at once', async () => {
  const page = await openIssue(issueTitle);

  await page.press(closeIssue);
  await expect.poll(() => shownStatus(page.tree), wait).toBe('Closed');
  expect(listedClosed(page, issueTitle)).toBe(true);

  await page.press('Reopen Issue');
  await expect.poll(() => shownStatus(page.tree), wait).toBe('Open');
  expect(listedClosed(page, issueTitle)).toBe(false);
}, 20_000);

it('rolls a status change gh refuses back and fails the press with its error', async () => {
  const page = await openIssue(refusedTitle);
  const before = page.trees.length;

  // The App shows a failed press as an error toast.
  await expect(page.press(closeIssue)).rejects.toThrow(
    'GraphQL: Could not close the issue.',
  );
  await expect.poll(() => shownStatus(page.tree), wait).toBe('Open');
  expect(page.trees.slice(before).map(shownStatus)).toContain('Closed');
  expect(listedClosed(page, refusedTitle)).toBe(false);
  expect(page.findText(closeIssue)).toBeDefined();
}, 20_000);

it("starts a Session with the Issue's reference, title and link in the Composer", async () => {
  const page = await openIssue(issueTitle);

  expect(page.findText('Start Session')?.node.props.onPress).toEqual({
    action: 'newSession',
    projectId: project.id,
    draft:
      '#42 Fixture issue from GitHub\nhttps://github.com/owner/repository/issues/42',
  });
}, 20_000);

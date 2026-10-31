import {
  findWireNodeEntry,
  projectDetailsSlotId,
  type WireNode,
} from '@argo/plugin-kit/testing';
import { expect, it, onTestFinished } from 'vitest';
import {
  chooseGithub,
  chosen,
  follow,
  issuesRoot,
  issueTitle,
  openIssue,
  project,
  refusedTitle,
  tracker,
  trackerPage,
  wait,
} from './journey-fixture';

const closeIssue = 'Close Issue';

it('persists a Tracker chosen on the choice page across views', async () => {
  const test = await tracker();
  const first = trackerPage(test);
  await chooseGithub(first);
  first.close();

  const reopened = trackerPage(test);
  await expect.poll(() => chosen(reopened), wait).toBe(true);
}, 20_000);

/*
 * ADR-0046: Project details takes one row per Plugin, so the row names the chosen Tracker and says its items changed
 * once the page has saved a choice.
 */
it('answers the Project details row with the Tracker the choice page saved', async () => {
  const test = await tracker();
  const controller = new AbortController();
  onTestFinished(() => controller.abort());

  const rows = test.slotItems(
    { slotId: projectDetailsSlotId, contexts: [{ projectId: project.id }] },
    { signal: controller.signal },
  );

  expect((await rows.next()).value).toEqual({
    [project.id]: {
      items: [
        {
          pluginId: 'issue-tracker',
          item: {
            title: 'Issue tracker',
            value: 'None',
            action: { path: '/tracker' },
          },
        },
      ],
      overflow: [],
    },
  });

  await chooseGithub(trackerPage(test));

  expect((await rows.next()).value).toMatchObject({
    [project.id]: { items: [{ item: { value: 'GitHub Issues' } }] },
  });
}, 20_000);

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

it('closes and reopens an Issue at once', async () => {
  const page = await openIssue(issueTitle);

  await page.press(closeIssue);
  await expect.poll(() => shownStatus(page.tree), wait).toBe('Closed');

  await page.press('Reopen Issue');
  await expect.poll(() => shownStatus(page.tree), wait).toBe('Open');
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

it("lists an Issue's sub-Issues under its description, with GitHub's tally", async () => {
  const page = await openIssue(issueTitle);

  await expect.poll(() => page.findText('Sub-Issues'), wait).toBeDefined();
  expect(page.findText('Sub-Issues')?.node.props.subtitle).toBe(
    '0 of 1 closed',
  );
  expect(page.findText(refusedTitle)?.node.props.onPress).toMatchObject({
    action: 'navigate',
  });
}, 20_000);

const isBlocker = (node: WireNode): boolean =>
  node.type === 'Metadata.Label' && node.props.title === 'Blocked by';

it('names an open blocker in the Properties beside the Issue', async () => {
  const page = await openIssue(refusedTitle);

  await expect
    .poll(() => page.tree && findWireNodeEntry(page.tree, isBlocker), wait)
    .toBeDefined();

  const entry = page.tree && findWireNodeEntry(page.tree, isBlocker);

  expect(entry && textOf(entry.node)).toBe('#42 Fixture issue from GitHub');
}, 20_000);

it('marks a blocked row and a parent row’s progress in the list', async () => {
  const { test, root } = await issuesRoot();
  const list = await follow(test, root, 'Open');

  await expect.poll(() => list.findText(issueTitle), wait).toBeDefined();
  expect(list.findText('Blocked')).toBeDefined();
  expect(list.findText('0 / 1')).toBeDefined();
}, 20_000);

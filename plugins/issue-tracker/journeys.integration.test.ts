import {
  findWireNodeEntry,
  projectDetailsSlotId,
  type WireNode,
} from '@argo/plugin-kit/testing';
import { expect, it, onTestFinished } from 'vitest';
import {
  chooseGithub,
  chosen,
  issuesRoot,
  issueTitle,
  openIssue,
  project,
  refusedTitle,
  tracker,
  trackerPage,
} from './journey-fixture';

const closeIssue = 'Close Issue';

it('persists a Tracker chosen on the choice page across views', async () => {
  const test = await tracker();
  const first = await trackerPage(test);
  expect(chosen(first)).toBe(false);
  await chooseGithub(first);

  expect(chosen(await trackerPage(test))).toBe(true);
}, 20_000);

it('moves the check to the chosen Tracker at once, and chooses none again', async () => {
  const test = await tracker();
  const page = await trackerPage(test);

  expect(page.find('GitHub Issues').props.onPress).toMatchObject({
    operation: 'chooseTracker',
    args: { tracker: 'github' },
    optimistic: [
      { key: 'none', props: { selected: false } },
      { key: 'github', props: { selected: true } },
    ],
  });

  await chooseGithub(page);
  await page.press('None');
  expect(page.find('None').props.selected).toBe(true);
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

  await chooseGithub(await trackerPage(test));

  expect((await rows.next()).value).toMatchObject({
    [project.id]: { items: [{ item: { value: 'GitHub Issues' } }] },
  });
}, 20_000);

const isStatus = (node: WireNode): boolean =>
  node.type === 'Metadata.StatusDot';

// The Status the open Issue's Properties show.
function shownStatus(tree: WireNode): string {
  const entry = findWireNodeEntry(tree, isStatus);

  return entry ? textOf(entry.node) : '';
}

function textOf(node: WireNode): string {
  const { text } = node.props;

  return typeof text === 'string' ? text : '';
}

it('closes an Issue at once, as an Operation the page shows the new status of until it answers', async () => {
  const page = await openIssue(issueTitle);

  // The props the Issue's status and its Action show while its status change runs.
  expect(page.find(closeIssue).props.onPress).toEqual({
    operation: 'setStatus',
    args: { number: 42, status: 'closed', projectId: project.id },
    optimistic: [
      { key: 'dot-42', props: { text: 'Closed', tone: 'done' } },
      { key: 'status-42', props: { label: 'Reopen Issue', icon: 'issue' } },
    ],
  });
  await page.press(closeIssue);
  // The fixture gh keeps no status, so the Issue reads as open when drawn again.
  expect(shownStatus(page.tree)).toBe('Open');
}, 20_000);

it('fails a status change gh refuses with its error, and draws the old status', async () => {
  const page = await openIssue(refusedTitle);

  // The App shows a failed press as an error toast and puts the optimistic props back.
  await expect(page.press(closeIssue)).rejects.toThrow(
    'GraphQL: Could not close the issue.',
  );
  expect(shownStatus(page.tree)).toBe('Open');
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

  expect(page.findText('Sub-Issues')).toBeDefined();
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

  const entry = findWireNodeEntry(page.tree, isBlocker);

  expect(entry && textOf(entry.node)).toBe('#42 Fixture issue from GitHub');
}, 20_000);

it('marks a blocked row and a parent row’s progress in the list', async () => {
  const { root } = await issuesRoot();
  const list = await root.press('Open');

  expect(list.findText(issueTitle)).toBeDefined();
  expect(list.findText('Blocked')).toBeDefined();
  expect(list.findText('0 / 1')).toBeDefined();
}, 20_000);

it('closes an Issue from its filter row as an Operation, which makes the filter pages stale', async () => {
  const { test } = await issuesRoot();
  const path = '/projects/project-1/filters/open';
  const before = await test.pages.draw({ path });

  if (before.kind !== 'tree') throw new Error(`Answered ${before.kind}`);
  expect(JSON.stringify(before.root)).toContain('"key":"status-42"');

  const ran = await test.pages.run({
    operation: 'setStatus',
    args: { number: 42, status: 'closed', projectId: project.id },
  });

  expect(ran).toEqual({ result: { number: 42, status: 'closed' } });
  await expect(
    test.pages.run({
      operation: 'setStatus',
      args: { number: 43, status: 'closed', projectId: project.id },
    }),
  ).rejects.toThrow(/Could not close the issue/u);
}, 20_000);

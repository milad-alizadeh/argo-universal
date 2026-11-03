import { findWireNodeEntry, type WireNode } from '@argo/plugin-kit/testing';
import { expect, it } from 'vitest';
import {
  follow,
  issuesRoot,
  issueTitle,
  openIssue,
  project,
  refusedTitle,
  wait,
} from './journey-fixture';

const closeIssue = 'Close Issue';

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

it('rolls a status change GitHub refuses back and fails the press with its error', async () => {
  const page = await openIssue(refusedTitle);
  const before = page.trees.length;

  // The App shows a failed press as an error toast.
  await expect(page.press(closeIssue)).rejects.toThrow(
    'Could not close the issue.',
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
  node.type === 'Metadata.Link' && node.props.title === 'Blocked by';

// The open blocker in the Screen's aside, which holds the Issue's own properties.
function blockerIn(
  tree: WireNode | null,
): ReturnType<typeof findWireNodeEntry> {
  return (tree?.slots.aside ?? [])
    .map((aside) => findWireNodeEntry(aside, isBlocker))
    .find(Boolean);
}

it("links an open blocker in the Issue's aside to the blocker's page", async () => {
  const page = await openIssue(refusedTitle);

  await expect.poll(() => blockerIn(page.tree), wait).toBeDefined();

  const entry = blockerIn(page.tree);

  expect(entry && textOf(entry.node)).toBe('#42 Fixture issue from GitHub');
  expect(entry?.node.props.href).toMatch(/\/42$/);
}, 20_000);

it('opens the Issue on GitHub from a header Action', async () => {
  const page = await openIssue(issueTitle);

  await expect
    .poll(() => page.findText('Open on GitHub')?.node.props.onPress, wait)
    .toMatchObject({
      action: 'openUrl',
      url: 'https://github.com/owner/repository/issues/42',
    });
}, 20_000);

it('marks a blocked row and a parent row’s progress in the list', async () => {
  const { test, root } = await issuesRoot();
  const list = await follow(test, root, 'Open');

  await expect.poll(() => list.findText(issueTitle), wait).toBeDefined();
  expect(list.findText('Blocked')).toBeDefined();
  expect(list.findText('0 / 1')).toBeDefined();
}, 20_000);

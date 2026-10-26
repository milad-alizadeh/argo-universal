import type { WireNode } from '@repo/contracts/plugins/wire';
import { findWireNodeEntry } from '@repo/contracts/plugins/wire-node-key';
import { expect, it } from 'vitest';
import {
  chooseGithub,
  chosen,
  issueTitle,
  openIssue,
  project,
  refusedTitle,
  slot,
  tracker,
  wait,
} from './journey-fixture';

const closeIssue = 'Close Issue';

it('persists a Tracker chosen in the Project details Slot across views', async () => {
  const test = await tracker();
  const first = test.slot(slot);
  await chooseGithub(first);
  first.close();

  const reopened = test.slot(slot);
  await expect.poll(() => chosen(reopened), wait).toBe(true);
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

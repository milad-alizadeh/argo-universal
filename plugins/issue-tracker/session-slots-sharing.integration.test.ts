import { expect, it } from 'vitest';
import type { GitHubFixture } from './github-fixture';
import { signedIn, wait } from './journey-fixture';
import {
  attach,
  barSlot,
  issuePage,
  itemsOf,
  mountFor,
  rowSlot,
  sessionId,
  until,
  watch,
} from './session-slot-fixture';

const cardPage = '/session-issue';

const title = 'Fixture issue from GitHub';

// The freshness window of `freshForMs`, and a little over it.
const pastFresh = 61_000;

const issueReads = (github: GitHubFixture): number =>
  github.graphqlCalls().filter(({ body }) => body.includes('issue(number:'))
    .length;

const loaded = (answer: Parameters<typeof itemsOf>[0]): boolean =>
  JSON.stringify(itemsOf(answer)).includes('success');

async function attachedTracker(): Promise<
  Awaited<ReturnType<typeof signedIn>>
> {
  const tracked = await signedIn();

  await attach(tracked.test, 'attach');

  return tracked;
}

it("reads an Issue once for a page and then for its Slot's summary", async () => {
  const { test, github } = await attachedTracker();
  const card = await mountFor(test, cardPage, sessionId);

  await expect.poll(() => card.findText(title), wait).toBeDefined();
  expect(issueReads(github)).toBe(1);

  await until(watch(test, rowSlot), loaded);

  expect(issueReads(github)).toBe(1);
}, 30_000);

it("reads an Issue once for its Slot's summary and then for its page", async () => {
  const { test, github } = await attachedTracker();

  await until(watch(test, rowSlot), loaded);
  expect(issueReads(github)).toBe(1);

  const page = await mountFor(test, issuePage);

  await expect.poll(() => page.findText('Start Session'), wait).toBeDefined();

  expect(issueReads(github)).toBe(1);
}, 30_000);

it('reads an Issue once for the row and the bar', async () => {
  const { test, github } = await attachedTracker();

  await until(watch(test, rowSlot), loaded);
  await until(watch(test, barSlot), (answer) =>
    JSON.stringify(itemsOf(answer)).includes('Open'),
  );

  expect(issueReads(github)).toBe(1);
}, 30_000);

it('reads the Issue again for a Slot once its answer is past the freshness window', async () => {
  const { test, github } = await attachedTracker();

  await until(watch(test, rowSlot), loaded);
  expect(issueReads(github)).toBe(1);

  await test.clock.advance(pastFresh);
  // Argo keeps a Slot's answer until the Plugin says its items changed, so only that asks the provider again.
  await attach(test, 'attach');
  await until(watch(test, rowSlot), loaded);

  await expect.poll(() => issueReads(github), wait).toBe(2);
}, 30_000);

it('reads the Issue once after its status changes on a page, and the Slot shows the new state', async () => {
  const { test, github } = await attachedTracker();
  const rows = watch(test, rowSlot);

  await until(rows, loaded);

  const page = await mountFor(test, issuePage);

  await expect.poll(() => page.findText('Close Issue'), wait).toBeDefined();
  expect(issueReads(github)).toBe(1);

  await page.press('Close Issue');
  await expect.poll(() => page.findText('Reopen Issue'), wait).toBeDefined();

  await expect.poll(() => issueReads(github), wait).toBe(2);
  await until(rows, (answer) =>
    JSON.stringify(itemsOf(answer)).includes('Closed'),
  );
  await test.clock.advance(1000);
  expect(issueReads(github)).toBe(2);
}, 30_000);

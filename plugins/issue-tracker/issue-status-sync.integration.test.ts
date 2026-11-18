import { expect, it } from 'vitest';
import { drawnUntil } from './drawn-again';
import {
  signedInRoot,
  trackedGitHub,
  signIn,
  chooseGithub,
  trackerPage,
} from './journey-fixture';
import {
  attach,
  barSlot,
  issuePage,
  itemsOf,
  rowSlot,
  until,
  watch,
} from './session-slot-fixture';

const observe = async (
  answers: ReturnType<typeof watch>,
  update: (items: unknown[]) => void,
): Promise<void> => {
  for await (const answer of answers) update(itemsOf(answer));
};

const issueCalls = (
  github: Awaited<ReturnType<typeof trackedGitHub>>['github'],
): number =>
  github.graphqlCalls().filter(({ body }) => body.includes('issue(number:'))
    .length;

it('refreshes visible Session items when an Issue page reads a changed Query', async () => {
  const { test, github } = await signedInRoot();
  await attach(test, 'attach');
  const rows = watch(test, rowSlot);
  const bar = watch(test, barSlot);
  await until(rows, (answer) =>
    JSON.stringify(itemsOf(answer)).includes('Open'),
  );
  await until(bar, (answer) =>
    JSON.stringify(itemsOf(answer)).includes('Open'),
  );
  let row: unknown[] = [];
  let line: unknown[] = [];
  void observe(rows, (items) => {
    row = items;
  });
  void observe(bar, (items) => {
    line = items;
  });
  const page = await test.pages.open({ path: issuePage });

  github.closeIssue(42);
  await test.clock.advance(61_000);
  await drawnUntil(page, 'Reopen Issue');
  await expect
    .poll(() => [row, line], { timeout: 3000 })
    .toMatchObject([
      [{ text: '#42', tone: 'done' }],
      [{ text: '#42 · Closed', tone: 'done' }],
    ]);
}, 20_000);

it('fills a visible Session item after a slow shared Query completes without fetching it again', async () => {
  const tracked = await trackedGitHub();
  await signIn(tracked);
  await chooseGithub(await trackerPage(tracked.test));
  const { test, github } = tracked;
  github.delayIssues(2200);
  await attach(test, 'attach');
  const rows = watch(test, rowSlot);
  expect(issueCalls(github)).toBe(0);

  const first = rows.next();
  await expect.poll(() => issueCalls(github)).toBe(1);
  await test.clock.advance(1501);
  const pending = itemsOf((await first).value);
  expect(pending).toMatchObject([{ text: '#42' }]);
  expect(pending).not.toMatchObject([{ tone: 'success' }]);

  const loaded = await until(rows, (answer) =>
    JSON.stringify(itemsOf(answer)).includes('Open'),
  );

  expect(itemsOf(loaded)).toMatchObject([{ text: '#42', tone: 'success' }]);
  const page = await test.pages.open({ path: issuePage });

  expect(page.findText('Close Issue')).toBeDefined();
  expect(issueCalls(github)).toBe(1);
}, 15_000);

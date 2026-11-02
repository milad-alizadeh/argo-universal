import { expect, it } from 'vitest';
import {
  follow,
  issuesRoot,
  issueTitle,
  wait,
  type PageView,
} from './journey-fixture';

const surface = { platform: 'web' } as const;

const shown = (view: PageView): string[] =>
  view.trees.map((tree) => JSON.stringify(tree));

it('makes one GitHub call to open the root, and none when it is opened again inside the freshness window', async () => {
  const { test, github, root } = await issuesRoot();

  await expect.poll(() => root.findText('good first issue'), wait).toBeDefined();
  expect(github.graphqlCalls()).toHaveLength(1);
  expect(github.requests.filter(({ path }) => path.includes('search'))).toEqual(
    [],
  );

  await test.clock.advance(30_000);

  const again = await test.mount({ page: '/', surface });

  await expect.poll(() => again.findText('good first issue'), wait).toBeDefined();
  expect(github.graphqlCalls()).toHaveLength(1);
}, 30_000);

it('opens an Issue from its row with the row’s title and status, never a loading line', async () => {
  const { test, github, root } = await issuesRoot();
  const list = await follow(test, root, 'Open');

  await expect.poll(() => list.findText(issueTitle), wait).toBeDefined();

  const before = github.graphqlCalls().length;
  const page = await follow(test, list, issueTitle);

  await expect.poll(() => page.findText('Start Session'), wait).toBeDefined();
  expect(shown(page).some((tree) => tree.includes('Loading Issue…'))).toBe(false);
  expect(shown(page)[0]).toContain(issueTitle);
  await expect.poll(() => github.graphqlCalls().length, wait).toBe(before + 1);
}, 30_000);

it('closes an Issue with four pages open and refetches only the page it was closed on', async () => {
  const { test, github, root } = await issuesRoot();
  const list = await follow(test, root, 'Open');
  const issue = await follow(test, list, issueTitle);
  const other = await follow(test, list, 'Fixture issue GitHub cannot change');

  await expect.poll(() => issue.findText('Close Issue'), wait).toBeDefined();
  await expect.poll(() => other.findText('Close Issue'), wait).toBeDefined();
  await expect.poll(() => github.graphqlCalls().length, wait).toBe(4);

  await issue.press('Close Issue');
  await expect
    .poll(
      () => github.requests.filter(({ method }) => method === 'PATCH').length,
      wait,
    )
    .toBe(1);
  await expect.poll(() => issue.findText('Reopen Issue'), wait).toBeDefined();
  // The Issue's own entry is read again; the root, the list and the other Issue are not.
  await expect.poll(() => github.graphqlCalls().length, wait).toBe(5);
  await test.clock.advance(1000);
  expect(github.graphqlCalls()).toHaveLength(5);
}, 30_000);

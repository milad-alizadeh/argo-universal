import { expect, it } from 'vitest';
import { DraftPage, schemaOf } from './page-calls-fixtures';

const turns = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

// A typed field's throttle.
const pauseMs = 150;

it('draws a typed field once the typing pauses, not on every keystroke', async () => {
  const page = new DraftPage();

  await page.type('f');
  await page.type('fi');
  await page.type('fix');
  await page.clock.advance(pauseMs - 1);

  expect(page.drafts).toEqual([]);

  await page.clock.advance(1);

  expect(page.drafts).toEqual(['fix']);
});

it('lands the typing before a press runs its Operation, so the run takes what was typed', async () => {
  const page = new DraftPage();

  await page.type('fix login');
  await page.press();

  expect(page.drafts).toEqual(['fix login']);
  expect(page.runs).toEqual([
    {
      operation: 'create',
      args: { title: 'fix login' },
      projectId: 'argo',
      sessionId: 'session-1',
    },
  ]);
});

it('runs a press as drawn when nothing is waiting, for the tree’s Project and Session', async () => {
  const page = new DraftPage();

  await page.press();

  expect(page.runs).toEqual([
    {
      operation: 'create',
      args: { title: '' },
      projectId: 'argo',
      sessionId: 'session-1',
    },
  ]);
});

it('refuses a press whose control the newly drawn page no longer has', async () => {
  const page = new DraftPage();

  await page.type('gone');

  await expect(page.press()).rejects.toThrow(
    'That control is no longer on the page',
  );
  expect(page.runs).toEqual([]);
});

it('waits for typing that is already drawing before a press runs its Operation', async () => {
  const page = new DraftPage();
  const release = page.hold();

  await page.type('fix login');
  void page.clock.advance(pauseMs);

  const pressed = page.press();

  release();
  await pressed;

  expect(page.runs.map(({ args }) => args)).toEqual([{ title: 'fix login' }]);
});

it('shows the optimistic props while the Operation runs, and puts them back and says why when it fails', async () => {
  const page = new DraftPage();
  const answer = page.holdRun();
  const pressed = page.press();

  await turns();
  expect(page.shown().children[1]?.props.label).toBe('Creating');

  answer('GitHub refused the write');
  await pressed;

  expect(page.shown().children[1]?.props.label).toBe('Create');
  expect(page.failures).toEqual(['GitHub refused the write']);
});

it('refuses a Page state change on a tree that has no Page state', async () => {
  const page = new DraftPage(false);

  await page.type('fix');

  await expect(page.calls.land()).resolves.toBeUndefined();
  await expect(
    page.calls.call(
      { loadMore: true },
      {
        key: 'list',
        name: 'onLoadMore',
        schema: schemaOf('List', 'onLoadMore'),
      },
    ),
  ).rejects.toThrow('This Plugin tree has no Page state');
});

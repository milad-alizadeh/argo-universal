import type { PageRunAnswer } from '@repo/contracts/plugins/page-address';
import { PageCalls } from '@repo/contracts/plugins/page-calls';
import { expect, it, onTestFinished } from 'vitest';
import {
  cacheOverMemory,
  issues,
  onScreen,
  settled,
} from './page-addresses-fixtures';
import { pageCallsPorts } from './page-calls-ports';
import {
  draftPage,
  fieldLabelOf,
  labelOf,
  pressing,
  typing,
} from './page-calls-ports-fixtures';

it('puts back only what its press patched when the Operation fails, never an older tree a redraw has replaced', async () => {
  const cache = cacheOverMemory();
  const answer = Promise.withResolvers<PageRunAnswer>();

  cache.server.tree = draftPage;

  const screen = onScreen(cache, issues);

  const calls = new PageCalls(
    pageCallsPorts(cache.addresses, issues, {
      run: () => answer.promise,
      failed: () => {},
    }),
  );

  onTestFinished(() => {
    calls.close();
    screen.leave();
  });
  await settled();

  await calls.call({ pageState: { draft: 'fix login' } }, typing('fix login'));

  // The page is shown at the Page state the typing drew.
  await calls.land();

  const typed = onScreen(cache, issues);

  onTestFinished(typed.leave);

  const pressed = calls.call(
    {
      operation: 'create',
      args: { title: 'fix login' },
      optimistic: [{ key: 'create', props: { label: 'Creating' } }],
    },
    pressing,
  );

  await settled();
  expect(labelOf(cache.addresses.shown(issues))).toBe('Creating');

  // The Operation wrote, so a stale mark draws the page again while it is still running.
  cache.server.write();
  cache.addresses.markStale({ pluginId: 'tracker' });
  await settled();

  expect(fieldLabelOf(cache.addresses.shown(issues))).toBe('Title 1');

  answer.reject(new Error('The Issue was not created'));
  await pressed;

  expect(fieldLabelOf(cache.addresses.shown(issues))).toBe('Title 1');
});

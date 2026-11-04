import type { PageRunAnswer } from '@repo/contracts/plugins/page-address';
import { PageCalls, type ScopedRun } from '@repo/contracts/plugins/page-calls';
import { expect, it, onTestFinished } from 'vitest';
import {
  cacheOverMemory,
  issues,
  kept,
  onScreen,
  settled,
} from './page-addresses-fixtures';
import { pageCallsPorts } from './page-calls-ports';
import {
  draftPage,
  labelOf,
  pressing,
  typing,
} from './page-calls-ports-fixtures';

it('lands the typing through the Page address cache before a press runs, for the page’s Project, patching only its own tree', async () => {
  const cache = cacheOverMemory();
  const runs: (ScopedRun & { pluginId: string })[] = [];
  const answer = Promise.withResolvers<PageRunAnswer>();

  cache.server.tree = draftPage;

  const screen = onScreen(cache, issues);
  const other = onScreen(cache, { ...issues, projectId: 'site' });

  const calls = new PageCalls(
    pageCallsPorts(cache.addresses, issues, {
      run: (run) => {
        runs.push(run);

        return answer.promise;
      },
      failed: (error) => {
        throw error;
      },
    }),
  );

  onTestFinished(() => {
    calls.close();
    screen.leave();
    other.leave();
  });
  await settled();

  await calls.call({ pageState: { draft: 'fix login' } }, typing('fix login'));

  const pressed = calls.call(
    { operation: 'create', args: { title: '' } },
    pressing,
  );

  await settled();

  expect(runs).toEqual([
    {
      pluginId: 'tracker',
      operation: 'create',
      args: { title: 'fix login' },
      projectId: 'argo',
    },
  ]);
  expect(labelOf(cache.addresses.shown(issues))).toBe('Creating');
  expect(labelOf(kept(other.answer()).root)).toBe('Create');

  answer.resolve({ result: null });
  await pressed;
});

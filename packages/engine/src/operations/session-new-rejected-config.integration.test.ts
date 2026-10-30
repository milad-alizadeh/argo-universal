import { expect, it } from 'vitest';
import { emptySessionInput } from '#mocks/acp-engine';
import { operationCaller, runOperation } from '#mocks/operations';
import { startSessionJourney } from '#mocks/session-journey';

type Journey = Awaited<ReturnType<typeof startSessionJourney>>;

const readRows = (host: Journey, table: string): unknown[] =>
  host.database.$client.prepare(`SELECT id FROM ${table}`).all();

it('leaves no Session, Checkout or branch behind when the Agent refuses a first choice', async () => {
  const host = await startSessionJourney();
  const user = await operationCaller(host);
  const before = readRows(host, 'session');

  await expect(
    runOperation(user.operations, {
      wait: true,
      id: 'session.new',
      params: {
        ...emptySessionInput,
        checkout: { type: 'worktree', baseBranch: 'main' },
        configOptions: [{ configId: 'model', value: 'unavailable-model' }],
        prompt: [{ type: 'text', text: 'Delegated investigation' }],
      },
    }),
  ).rejects.toThrow('The Agent did not offer model=unavailable-model');

  await expect
    .poll(() => ({
      sessions: readRows(host, 'session'),
      turns: readRows(host, 'turn'),
      worktrees: host
        .git('worktree', 'list', '--porcelain')
        .match(/^worktree /gm)?.length,
      branches: host.git('branch', '--list', 'argo/*'),
    }))
    .toEqual({ sessions: before, turns: [], worktrees: 1, branches: '' });
  expect(await user.session.list.query({})).toEqual({
    sessions: [],
    nextCursor: null,
  });
});

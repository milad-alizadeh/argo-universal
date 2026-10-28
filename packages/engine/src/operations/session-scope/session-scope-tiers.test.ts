import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { expect, it } from 'vitest';
import {
  asks,
  operation,
  promptTo,
  runs,
  scoped,
  startIn,
  type ScopedOperation,
} from './scope-fixtures';

const get = (sessionId: string): ScopedOperation =>
  operation('session.get', { sessionId });

const branches = (projectId: string): ScopedOperation =>
  operation('project.listBranches', { projectId });

const list = (params: Json): ScopedOperation =>
  operation('session.list', params);

const cases: [ScopedOperation, string][] = [
  [operation('project.list', {}), runs],
  [operation('agent.list', {}), runs],
  [get('unrelated'), runs],
  [get('foreign'), asks],
  [get('missing'), 'NOT_FOUND'],
  [list({}), runs],
  [list({ projectId: 'p2' }), asks],
  [branches('p1'), runs],
  [branches('p2'), asks],
  [operation('session.archive', { sessionId: 'started' }), asks],
  [operation('agent.install', { id: 'mock' }), asks],
  [promptTo('started'), runs],
  [promptTo('caller'), asks],
  [promptTo('unrelated'), asks],
  [promptTo('foreign'), asks],
  [startIn('p1'), runs],
  [startIn('p2'), asks],
  [operation('session.cancel', { sessionId: 7 }), 'BAD_REQUEST'],
];

it.each(cases)('%j %s', async (scopedOperation, outcome) => {
  expect((await scoped(scopedOperation)).outcome).toBe(outcome);
});

it('runs with the params it parsed once, and lists its own Project by default', async () => {
  expect((await scoped(list({}))).invoked).toEqual([list({ projectId: 'p1' })]);
  expect(
    (await scoped(operation('session.cancel', { sessionId: 7 }))).invoked,
  ).toEqual([]);
});

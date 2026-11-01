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

const open = (destination: Json): ScopedOperation =>
  operation('app.open', { destination });

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
  [promptTo('unrelated'), runs],
  [promptTo('foreign'), asks],
  [startIn('p1'), runs],
  [startIn('p2'), asks],
  [operation('session.cancel', { sessionId: 7 }), 'BAD_REQUEST'],
  [open({ screen: 'session', sessionId: 'unrelated' }), runs],
  [open({ screen: 'session', sessionId: 'foreign' }), asks],
  [open({ screen: 'session', sessionId: 'missing' }), 'NOT_FOUND'],
  [open({ screen: 'project', projectId: 'p1' }), runs],
  [open({ screen: 'project', projectId: 'p2' }), asks],
  [open({ screen: 'sessions' }), asks],
  [open({ screen: 'agents' }), asks],
  [open({ screen: 'settings' }), asks],
  [open({ screen: 'plugin', pluginId: 'a', navId: 'b', page: [] }), asks],
  [open({ screen: 'route', href: '/settings' }), 'BAD_REQUEST'],
];

it.each(cases)('%j %s', async (scopedOperation, outcome) => {
  expect((await scoped(scopedOperation)).outcome).toBe(outcome);
});

it('runs a listing with the params it parsed once, in its own Project by default', async () => {
  expect((await scoped(list({}))).invoked).toEqual([list({ projectId: 'p1' })]);
});

it('never runs an Operation whose params fail to parse', async () => {
  expect(
    (await scoped(operation('session.cancel', { sessionId: 7 }))).invoked,
  ).toEqual([]);
});

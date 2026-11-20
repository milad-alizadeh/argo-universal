import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { expect, it } from 'vitest';
import {
  operation,
  promptTo,
  runs,
  scoped,
  startIn,
  type ScopedOperation,
} from './scope-fixtures';

const archiveOperation = 'session.archive';

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
  [get('foreign'), runs],
  [get('missing'), runs],
  [list({}), runs],
  [list({ projectId: 'p2' }), runs],
  [branches('p1'), runs],
  [branches('p2'), runs],
  [operation('project.update', { projectId: 'p1' }), runs],
  [operation(archiveOperation, { sessionId: 'caller' }), runs],
  [operation(archiveOperation, { sessionId: 'started' }), runs],
  [operation(archiveOperation, { sessionId: 'unrelated' }), runs],
  [operation(archiveOperation, { sessionId: 'foreign' }), runs],
  [operation('agent.install', { id: 'mock' }), runs],
  [promptTo('started'), runs],
  [promptTo('caller'), 'CONFLICT'],
  [promptTo('unrelated'), runs],
  [promptTo('foreign'), runs],
  [startIn('p1'), runs],
  [startIn('p2'), runs],
  [operation('session.cancel', { sessionId: 7 }), 'BAD_REQUEST'],
  [open({ screen: 'session', sessionId: 'unrelated' }), runs],
  [open({ screen: 'session', sessionId: 'foreign' }), runs],
  [open({ screen: 'session', sessionId: 'missing' }), runs],
  [open({ screen: 'project', projectId: 'p1' }), runs],
  [open({ screen: 'project', projectId: 'p2' }), runs],
  [open({ screen: 'sessions' }), runs],
  [open({ screen: 'agents' }), runs],
  [open({ screen: 'settings' }), runs],
  [open({ screen: 'plugin', pluginId: 'a', navId: 'b', page: [] }), runs],
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

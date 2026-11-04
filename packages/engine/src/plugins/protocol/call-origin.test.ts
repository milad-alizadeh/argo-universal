import { expect, it } from 'vitest';
import { CallScope, originOf, reachOf, type Delivered } from './call-origin';

const event = (value: Extract<Delivered, { type: 'event' }>['event']) =>
  ({ type: 'event', event: value }) as const;

it.each<[string, Delivered, ReturnType<typeof originOf>]>([
  [
    'a draw for its id',
    event({ type: 'draw', id: 4, path: '/', pageState: {}, pages: 1 }),
    { draw: 4 },
  ],
  [
    'a live draw stop for its draw',
    event({ type: 'stop', id: 4 }),
    { draw: 4 },
  ],
  [
    'an Operation for its run',
    event({
      type: 'operation',
      id: 7,
      name: 'merge',
      params: {},
      caller: {},
    }),
    { operation: 7 },
  ],
  [
    'a paged list page for the draw reading it',
    event({
      type: 'read',
      id: 1,
      name: 'argo:list',
      args: {},
      projectId: 'project',
      draw: 4,
    }),
    { draw: 4 },
  ],
  [
    'a named read for its Project alone, whichever draw asked',
    event({
      type: 'read',
      id: 1,
      name: 'overview',
      args: {},
      projectId: 'project',
      draw: 4,
    }),
    { projectId: 'project' },
  ],
  [
    'a named read with no Project for nothing',
    event({ type: 'read', id: 1, name: 'overview', args: {} }),
    {},
  ],
  [
    'a batched items call for nothing',
    event({
      type: 'slotItems',
      id: 1,
      input: { slotId: 'argo/project/details/v1', contexts: [] },
    }),
    {},
  ],
  [
    'a Hook for its Project',
    { type: 'hook', event: { projectId: 'project' } },
    { projectId: 'project' },
  ],
  ['a Hook with no Project for nothing', { type: 'hook', event: {} }, {}],
  ['an Account token ask for nothing', { type: 'accountToken' }, {}],
])('runs %s', (_name, delivered, origin) => {
  expect(originOf(delivered)).toEqual(origin);
});

it('keeps each delivery its own origin across awaits', async () => {
  const scope = new CallScope();

  const after = (): Promise<ReturnType<CallScope['current']>> =>
    new Promise((resolve) => setTimeout(() => resolve(scope.current()), 1));

  const seen = await Promise.all([
    scope.run({ draw: 1 }, after),
    scope.run({ operation: 2 }, after),
    after(),
  ]);

  expect(seen).toEqual([{ draw: 1 }, { operation: 2 }, {}]);
});

const drawn = { projectId: 'drawn', serverDevice: true, holder: 'address' };

const ran = { projectId: 'ran', serverDevice: true };

const waiting = {
  draw: (id: number): typeof drawn | undefined =>
    id === 1 ? drawn : undefined,
  run: (id: number): typeof ran | undefined => (id === 2 ? ran : undefined),
};

it.each([
  [
    'a waiting draw reaches its Project and Server Device',
    { draw: 1 },
    { projectId: 'drawn', serverDevice: true, drawn },
  ],
  [
    'a waiting run reaches its Project and Server Device',
    { operation: 2 },
    { projectId: 'ran', serverDevice: true },
  ],
  ['an answered draw reaches nothing', { draw: 9 }, { serverDevice: false }],
  [
    'an answered run reaches nothing',
    { operation: 9 },
    { serverDevice: false },
  ],
  [
    'a Project origin reaches the Project but never the Server Device',
    { projectId: 'hooked' },
    { projectId: 'hooked', serverDevice: false },
  ],
  ['no origin reaches nothing', {}, { serverDevice: false }],
])('%s', (_name, origin, reach) => {
  expect(reachOf(waiting, origin)).toEqual(reach);
});

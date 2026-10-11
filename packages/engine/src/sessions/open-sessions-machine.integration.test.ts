import { randomUUID } from 'node:crypto';
import { unwalkedTransitions } from '@repo/vitest/model-coverage';
import { afterAll, afterEach, expect, it } from 'vitest';
import {
  createActor,
  type EventFromLogic,
  type EventObject,
  type SnapshotFrom,
} from 'xstate';
import { TestModel } from 'xstate/graph';
import { openTestDatabase } from '#mocks/database';
import {
  createOpenSessionsModelMachine,
  openSessionsModelAdapter,
} from '#mocks/open-sessions';
import type { OpenSessionsInput } from './open-sessions-machine';
import { sessionMachine } from './session-machine';

const openSessionsModelMachine = createOpenSessionsModelMachine(false);
const openSessionsGraphMachine = createOpenSessionsModelMachine(true);
const { database, directory: runtimeDirectory, remove } = openTestDatabase();
afterAll(remove);
const input: OpenSessionsInput = {
  now: (): number => Date.now(),
  createId: randomUUID,
  database,
  runtimeDirectory,
  adapters: [openSessionsModelAdapter],
};
// Two ids exercise duplicate opens, removal with another Session left, and the last Session stopping.
type OpenSessionsEvent = EventFromLogic<typeof openSessionsModelMachine>;
const events: OpenSessionsEvent[] = [
  ...['one', 'two'].flatMap((sessionId): OpenSessionsEvent[] => [
    {
      type: 'sessions.create',
      sessionId,
      projectId: 'project-1',
      projectPath: '/project',
      agent: 'mock',
      checkout: { type: 'main' },
      configOptions: [],
      prompt: [{ type: 'text', text: 'Build it' }],
      turnId: `turn-${sessionId}`,
    },
    { type: 'sessions.open', sessionId, agent: 'mock' },
    {
      type: `xstate.done.actor.session:${sessionId}`,
      actorId: `session:${sessionId}`,
      output: { failure: null },
    },
    {
      type: `xstate.error.actor.session:${sessionId}`,
      actorId: `session:${sessionId}`,
      error: new Error('Session actor failed'),
    },
    {
      type: `xstate.snapshot.session:${sessionId}`,
      snapshot: createActor(sessionMachine, {
        input: {
          now: (): number => Date.now(),
          createId: randomUUID,
          kind: 'existing',
          database,
          runtimeDirectory,
          adapter: openSessionsModelAdapter,
          sessionId,
        },
      }).getSnapshot(),
    },
  ]),
  { type: 'sessions.stopAll' },
  {
    type: 'xstate.error.actor.agentProbe:mock',
    actorId: 'agentProbe:mock',
    error: new Error('Probe failed'),
  },
];
type OpenSessionsSnapshot = SnapshotFrom<typeof openSessionsModelMachine>;
const key = (snapshot: OpenSessionsSnapshot): string =>
  JSON.stringify({
    value: snapshot.value,
    sessions: Object.keys(snapshot.context.sessions).sort(),
  });
const model = new TestModel(openSessionsGraphMachine, {
  input,
  events,
  // One pair of Sessions covers the branches; repeating an id adds no new lifecycle behavior.
  filterEvents: (snapshot, event): boolean =>
    snapshot.status === 'active' &&
    snapshot.can(event) &&
    (!('actorId' in event) ||
      event.actorId.startsWith('agentProbe:') ||
      Object.values(snapshot.context.sessions).some(
        (session): boolean => session.id === event.actorId,
      )),
  serializeState: (snapshot, event, previous): string =>
    JSON.stringify({
      key: key(snapshot),
      via: event && `${previous && key(previous)} ${event.type}`,
    }),
});
const paths = model.getShortestPaths();
let openSessions: ReturnType<
  typeof createActor<typeof openSessionsModelMachine>
>;
afterEach((): typeof openSessions => openSessions?.stop());

it.each(
  paths.map(
    (path, index): readonly [number, typeof path] => [index, path] as const,
  ),
)('walks open Sessions model path %i', async (_, path): Promise<void> => {
  openSessions = createActor(openSessionsModelMachine, { input }).start();
  await path.test({
    events: Object.fromEntries(
      events.map(
        ({
          type,
        }): [
          OpenSessionsEvent['type'],
          (args: { event: EventObject }) => void,
        ] => [
          type,
          ({ event }): void => {
            const fixture = events.find(
              (candidate): boolean => candidate === event,
            );
            if (!fixture) throw new Error('Unknown open Sessions model event');
            openSessions.send(fixture);
          },
        ],
      ),
    ),
    states: {
      '*': (expected): void => {
        expect(key(openSessions.getSnapshot())).toBe(key(expected));
        expect(openSessions.getSnapshot().status).toBe(expected.status);
        for (const sessionId of Object.keys(expected.context.sessions))
          expect(openSessions.system.get(`session:${sessionId}`)).toBeDefined();
      },
    },
  });
});

it('the generated open Sessions paths walk every transition', (): void => {
  expect(
    unwalkedTransitions({
      models: [model],
      paths,
      stateKey: key,
      eventKey: (event): typeof event.type => event.type,
    }),
  ).toEqual([]);
});

it('removes a failed Session while keeping another Session available', (): void => {
  const errors: unknown[] = [];
  openSessions = createActor(openSessionsModelMachine, { input });
  openSessions.subscribe({ error: (error): number => errors.push(error) });
  openSessions.start();
  for (const sessionId of ['one', 'two'])
    openSessions.send({ type: 'sessions.open', sessionId, agent: 'mock' });
  openSessions.send({
    type: 'xstate.error.actor.session:one',
    actorId: 'session:one',
    error: new Error('Session actor failed'),
  });
  expect(openSessions.getSnapshot().status).toBe('active');
  expect(Object.keys(openSessions.getSnapshot().context.sessions)).toEqual([
    'two',
  ]);
  expect(openSessions.system.get('session:one')).toBeUndefined();
  expect(openSessions.system.get('session:two')).toBeDefined();
  expect(errors).toEqual([]);
});

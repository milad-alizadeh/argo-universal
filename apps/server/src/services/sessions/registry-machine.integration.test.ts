import { randomUUID } from 'node:crypto';
import { unwalkedTransitions } from '@repo/vitest/model-coverage';
import { afterAll, afterEach, expect, it } from 'vitest';
import {
  type AnyEventObject,
  createActor,
  type EventFromLogic,
  type SnapshotFrom,
} from 'xstate';
import { TestModel } from 'xstate/graph';
import { openTestDatabase } from '#mocks/database';
import {
  createRegistryModelMachine,
  registryModelAdapter,
} from '#mocks/registry';
import type { RegistryInput } from './registry-machine';
import { sessionMachine } from './session-machine';

const registryModelMachine = createRegistryModelMachine(false);
const registryGraphMachine = createRegistryModelMachine(true);
const { database, directory: runtimeDirectory, remove } = openTestDatabase();
afterAll(remove);
const input: RegistryInput = {
  now: (): number => Date.now(),
  createId: randomUUID,
  database,
  runtimeDirectory,
  adapters: [registryModelAdapter],
};
// Two ids exercise duplicate opens, removal with another Session left, and the last Session stopping.
type RegistryEvent = EventFromLogic<typeof registryModelMachine>;
const events: RegistryEvent[] = [
  ...['one', 'two'].flatMap((sessionId): RegistryEvent[] => [
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
          adapter: registryModelAdapter,
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
type RegistrySnapshot = SnapshotFrom<typeof registryModelMachine>;
const key = (snapshot: RegistrySnapshot): string =>
  JSON.stringify({
    value: snapshot.value,
    sessions: Object.keys(snapshot.context.sessions).sort(),
  });
const model = new TestModel(registryGraphMachine, {
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
let registry: ReturnType<typeof createActor<typeof registryModelMachine>>;
afterEach((): typeof registry => registry?.stop());

it.each(
  paths.map(
    (path, index): readonly [number, typeof path] => [index, path] as const,
  ),
)('walks registry model path %i', async (_, path): Promise<void> => {
  registry = createActor(registryModelMachine, { input }).start();
  await path.test({
    events: Object.fromEntries(
      events.map(
        ({
          type,
        }): [
          RegistryEvent['type'],
          (args: { event: AnyEventObject }) => void,
        ] => [
          type,
          ({ event }: { event: AnyEventObject }): void => {
            if ('actorId' in event && event.actorId.startsWith('session:')) {
              const session = registry.system.get(event.actorId);
              if (!session) throw new Error('No Session');
              session.send({
                type: event.type.startsWith('xstate.error.')
                  ? 'mock.fail'
                  : 'mock.finish',
              });
            } else registry.send(event as RegistryEvent);
          },
        ],
      ),
    ),
    states: {
      '*': (expected): void => {
        expect(key(registry.getSnapshot())).toBe(key(expected));
        expect(registry.getSnapshot().status).toBe(expected.status);
        for (const sessionId of Object.keys(expected.context.sessions))
          expect(registry.system.get(`session:${sessionId}`)).toBeDefined();
      },
    },
  });
});

it('the generated registry paths walk every transition', (): void => {
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
  registry = createActor(registryModelMachine, { input });
  registry.subscribe({ error: (error): number => errors.push(error) });
  registry.start();
  for (const sessionId of ['one', 'two'])
    registry.send({ type: 'sessions.open', sessionId, agent: 'mock' });
  registry.system.get('session:one').send({ type: 'mock.fail' });
  expect(registry.getSnapshot().status).toBe('active');
  expect(Object.keys(registry.getSnapshot().context.sessions)).toEqual(['two']);
  expect(registry.system.get('session:one')).toBeUndefined();
  expect(registry.system.get('session:two')).toBeDefined();
  expect(errors).toEqual([]);
});

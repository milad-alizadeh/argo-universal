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
const { database, remove } = openTestDatabase();
afterAll(remove);
const input: RegistryInput = {
  database,
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
      type: `xstate.snapshot.session:${sessionId}`,
      snapshot: createActor(sessionMachine, {
        input: {
          kind: 'existing',
          database,
          adapter: registryModelAdapter,
          sessionId,
        },
      }).getSnapshot(),
    },
  ]),
  { type: 'sessions.stopAll' },
];
type RegistrySnapshot = SnapshotFrom<typeof registryModelMachine>;
const key = (snapshot: RegistrySnapshot) =>
  JSON.stringify({
    value: snapshot.value,
    sessions: Object.keys(snapshot.context.sessions).sort(),
  });
const model = new TestModel(registryGraphMachine, {
  input,
  events,
  // One pair of Sessions covers the branches; repeating an id adds no new lifecycle behavior.
  filterEvents: (snapshot, event) =>
    snapshot.status === 'active' &&
    snapshot.can(event) &&
    (!('actorId' in event) ||
      Object.values(snapshot.context.sessions).some(
        (session) => session.id === event.actorId,
      )),
  serializeState: (snapshot, event, previous) =>
    JSON.stringify({
      key: key(snapshot),
      via: event && `${previous && key(previous)} ${event.type}`,
    }),
});
const paths = model.getShortestPaths();
let registry: ReturnType<typeof createActor<typeof registryModelMachine>>;
afterEach(() => registry?.stop());

it.each(paths.map((path, index) => [index, path] as const))(
  'walks registry model path %i',
  async (_, path) => {
    registry = createActor(registryModelMachine, { input }).start();
    await path.test({
      events: Object.fromEntries(
        events.map(({ type }) => [
          type,
          ({ event }: { event: AnyEventObject }) => {
            if ('actorId' in event) {
              const session = registry.system.get(event.actorId);
              if (!session) throw new Error('No Session');
              session.send({ type: 'mock.finish' });
            } else registry.send(event as RegistryEvent);
          },
        ]),
      ),
      states: {
        '*': (expected) => {
          expect(key(registry.getSnapshot())).toBe(key(expected));
          expect(registry.getSnapshot().status).toBe(expected.status);
          for (const sessionId of Object.keys(expected.context.sessions))
            expect(registry.system.get(`session:${sessionId}`)).toBeDefined();
        },
      },
    });
  },
);

it('the generated registry paths walk every transition', () => {
  expect(
    unwalkedTransitions({
      models: [model],
      paths,
      stateKey: key,
      eventKey: (event) => event.type,
    }),
  ).toEqual([]);
});

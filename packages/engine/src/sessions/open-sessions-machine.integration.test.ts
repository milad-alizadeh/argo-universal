import {
  type DelayEvent,
  describeModel,
  modelTest,
} from '@repo/vitest/model-test';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { type Actor, createActor } from 'xstate';
import {
  actorBelongsToModel,
  events,
  input,
  key,
  openSessionsGraphMachine,
  openSessionsModelMachine,
  remove,
  vertex,
  type OpenSessionsEvent,
  type OpenSessionsSnapshot,
} from './open-sessions-model.test.mocks';

afterAll(remove);

let openSessions: Actor<typeof openSessionsModelMachine>;

afterEach((): typeof openSessions => openSessions?.stop());

// The step's own fixture: both Sessions send events of the same type.
const fixtureOf = (event: OpenSessionsEvent | DelayEvent): OpenSessionsEvent =>
  events.find((fixture): boolean => fixture === event) ??
  expect.unreachable(`${event.type} is not a fixture`);

const send = ({ event }: { event: OpenSessionsEvent | DelayEvent }): void =>
  openSessions.send(fixtureOf(event));

// The actor is where the model is, with a Session actor for each open Session.
function expectOpenSessions(expected: OpenSessionsSnapshot): void {
  expect(key(openSessions.getSnapshot())).toBe(key(expected));
  expect(openSessions.getSnapshot().status).toBe(expected.status);

  for (const sessionId of Object.keys(expected.context.sessions))
    expect(openSessions.system.get(`session:${sessionId}`)).toBeDefined();
}

const model = modelTest(
  openSessionsGraphMachine,
  {
    input,
    fixtures: events,
    vertex,
    permits: actorBelongsToModel,
    stateKey: key,
    walks: [
      {
        name: 'shortest path',
        search: 'shortest',
        arrival: (_, event, previous): string =>
          `${key(previous)} ${event.type}`,
      },
    ],
  },
  {
    start: (): typeof openSessions => {
      openSessions = createActor(openSessionsModelMachine, { input }).start();

      return openSessions;
    },
    executors: Object.fromEntries(events.map(({ type }) => [type, send])),
    delays: {},
    always: expectOpenSessions,
    states: {},
  },
);

describe('open Sessions model', (): void => {
  describeModel(model);

  it('the generated paths walk every transition', (): void => {
    expect(model.unwalked()).toEqual([]);
  });
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

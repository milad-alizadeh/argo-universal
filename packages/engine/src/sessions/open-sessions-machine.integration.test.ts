import { unwalkedTransitions } from '@repo/vitest/model-coverage';
import { afterAll, afterEach, expect, it } from 'vitest';
import { createActor, type EventObject } from 'xstate';
import {
  events,
  input,
  key,
  model,
  openSessionsModelMachine,
  paths,
  remove,
  type OpenSessionsEvent,
} from './open-sessions-model.test.mocks';

afterAll(remove);

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

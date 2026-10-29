import {
  assertEvent,
  type EventFrom,
  assign,
  createActor,
  fromPromise,
  type SnapshotFrom,
} from 'xstate';
import {
  openSessionsMachine,
  createSessionActorInput,
  type SessionData,
  sessionMachine,
} from '../src/sessions';

type ModelContext = SnapshotFrom<typeof openSessionsMachine>['context'];

const session = sessionMachine.provide({
  actors: {
    createCheckout: fromPromise(
      (): Promise<SessionData> => new Promise(() => {}),
    ),
    loadSession: fromPromise((): Promise<SessionData> => new Promise(() => {})),
  },
});

const graphEvents = [
  'sessions.create',
  'sessions.open',
  'sessions.archive',
] as const;

export const createOpenSessionsModelMachine = (
  forGraph: boolean,
): typeof openSessionsMachine =>
  forGraph
    ? graphModel()
    : openSessionsMachine.provide({ actors: { session }, actions: {} });

const graphModel = (): typeof openSessionsMachine =>
  openSessionsMachine.provide({
    actors: { session },
    actions: {
      openSession: assign(({ context, event }): Partial<ModelContext> => {
        assertEvent(event, graphEvents);

        return openGraphSession(context, event);
      }),
    },
  });

type OpenEvent = Extract<
  EventFrom<typeof openSessionsMachine>,
  { type: 'sessions.create' | 'sessions.open' | 'sessions.archive' }
>;

const openGraphSession = (
  context: ModelContext,
  event: OpenEvent,
): Partial<ModelContext> => {
  if (context.sessions[event.sessionId]) return {};

  const actor = createActor(session, {
    id: `session:${event.sessionId}`,
    input: createSessionActorInput({ context, event }),
  });

  return { sessions: { ...context.sessions, [event.sessionId]: actor } };
};

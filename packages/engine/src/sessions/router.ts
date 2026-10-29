import {
  SessionAgentOptionsInput,
  AgentOptionsUpdate,
  SessionAnswerElicitationInput,
  SessionAnswerElicitationOutput,
  SessionAnswerPermissionInput,
  SessionAnswerPermissionOutput,
  SessionCounts,
  SessionListUpdate,
  SessionMarkSeenInput,
  SessionMarkSeenOutput,
  SessionOpenInput,
  SessionOpenOutput,
} from '@repo/contracts';
import {
  mergeRouters,
  publicProcedure,
  router,
  routerFactory,
  zAsyncIterable,
} from '../rpc';
import { agentOptionsUpdates } from './configuration';
import type { SessionList } from './list/session-list';
import type { OpenSessions } from './open-sessions';
import {
  answerSessionElicitation,
  answerSessionPermission,
} from './session-answers';
import { markSessionSeen } from './session-seen';

const createListUpdatesRouter = routerFactory((sessionList: SessionList) =>
  router({
    listUpdates: publicProcedure
      .output(zAsyncIterable({ yield: SessionListUpdate }))
      .subscription(async function* ({
        signal,
      }): AsyncGenerator<SessionListUpdate, void> {
        yield* sessionList.listUpdates(signal);
      }),
  }),
);

const createCountsRouter = routerFactory((sessionList: SessionList) =>
  router({
    counts: publicProcedure
      .output(zAsyncIterable({ yield: SessionCounts }))
      .subscription(async function* ({
        signal,
      }): AsyncGenerator<SessionCounts, void> {
        yield* sessionList.counts(signal);
      }),
  }),
);

const createSeenRouter = routerFactory((open: OpenSessions) =>
  router({
    markSeen: publicProcedure
      .input(SessionMarkSeenInput)
      .output(SessionMarkSeenOutput)
      .mutation(({ input }) => markSessionSeen(open, input)),
  }),
);

// Opens a Session, or waits for its open, without a Turn: Retry after a failed open never resends one.
const openSession = async (
  open: OpenSessions,
  { sessionId }: SessionOpenInput,
): Promise<SessionOpenOutput> => {
  await open.ready(sessionId, 'session.open');

  return {};
};

const createStartRouter = routerFactory((open: OpenSessions) =>
  router({
    open: publicProcedure
      .input(SessionOpenInput)
      .output(SessionOpenOutput)
      .mutation(({ input }) => openSession(open, input)),
    agentOptions: publicProcedure
      .input(SessionAgentOptionsInput)
      .output(zAsyncIterable({ yield: AgentOptionsUpdate }))
      .subscription(({ input, signal }) =>
        agentOptionsUpdates(open, input, signal),
      ),
  }),
);

const createAnswerRouter = routerFactory((open: OpenSessions) =>
  router({
    answerPermission: publicProcedure
      .input(SessionAnswerPermissionInput)
      .output(SessionAnswerPermissionOutput)
      .mutation(({ input }) => answerSessionPermission(open, input)),
    answerElicitation: publicProcedure
      .input(SessionAnswerElicitationInput)
      .output(SessionAnswerElicitationOutput)
      .mutation(({ input }) => answerSessionElicitation(open, input)),
  }),
);

// The Session procedures that are not Operations: the list's updates, seen marks, opening and answers.
export const createSessionRouter = routerFactory(
  ({ open, list }: { open: OpenSessions; list: SessionList }) =>
    mergeRouters(
      createListUpdatesRouter(list),
      createCountsRouter(list),
      createSeenRouter(open),
      createStartRouter(open),
      createAnswerRouter(open),
    ),
);

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
import type { SessionHandlerSources } from './session-sources';

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

const createSeenRouter = routerFactory((sources: SessionHandlerSources) =>
  router({
    markSeen: publicProcedure
      .input(SessionMarkSeenInput)
      .output(SessionMarkSeenOutput)
      .mutation(({ input }) => markSessionSeen(sources, input)),
  }),
);

// Opens a Session, or waits for its open, without a Turn: Retry after a failed open never resends one.
const openSession = async (
  open: Pick<OpenSessions, 'ready'>,
  { sessionId }: SessionOpenInput,
): Promise<SessionOpenOutput> => {
  await open.ready(sessionId, 'session.open');

  return {};
};

const createStartRouter = routerFactory((sources: SessionHandlerSources) =>
  router({
    open: publicProcedure
      .input(SessionOpenInput)
      .output(SessionOpenOutput)
      .mutation(({ input }) => openSession(sources.open, input)),
    agentOptions: publicProcedure
      .input(SessionAgentOptionsInput)
      .output(zAsyncIterable({ yield: AgentOptionsUpdate }))
      .subscription(({ input, signal }) =>
        agentOptionsUpdates(sources, input, signal),
      ),
  }),
);

const createAnswerRouter = routerFactory((sources: SessionHandlerSources) =>
  router({
    answerPermission: publicProcedure
      .input(SessionAnswerPermissionInput)
      .output(SessionAnswerPermissionOutput)
      .mutation(({ input }) => answerSessionPermission(sources, input)),
    answerElicitation: publicProcedure
      .input(SessionAnswerElicitationInput)
      .output(SessionAnswerElicitationOutput)
      .mutation(({ input }) => answerSessionElicitation(sources, input)),
  }),
);

// The Session procedures that are not Operations: the list's updates, seen marks, opening and answers.
export const createSessionRouter = routerFactory(
  ({ sources, list }: { sources: SessionHandlerSources; list: SessionList }) =>
    mergeRouters(
      createListUpdatesRouter(list),
      createCountsRouter(list),
      createSeenRouter(sources),
      createStartRouter(sources),
      createAnswerRouter(sources),
    ),
);

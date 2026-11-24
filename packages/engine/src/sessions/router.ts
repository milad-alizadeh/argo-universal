import {
  SessionAgentOptionsInput,
  AgentOptionsUpdate,
  DelegatedAttention,
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
import { operations } from '@repo/contracts/operations';
import {
  mergeRouters,
  authenticatedAppProcedure,
  publicProcedure,
  router,
  routerFactory,
  zAsyncIterable,
} from '../rpc';
import { agentOptionsUpdates } from './configuration';
import type { SessionList } from './list/session-list';
import { delegatedAttention } from './orchestration/input-requests';
import type { Schedules } from './schedules';
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

const createScheduleUpdatesRouter = routerFactory((schedules: Schedules) =>
  router({
    scheduleUpdates: publicProcedure
      .input(operations['session.listSchedules'].params)
      .output(
        zAsyncIterable({ yield: operations['session.listSchedules'].result }),
      )
      .subscription(({ input, signal }) =>
        schedules.updates(input.sessionId, signal),
      ),
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
  sources: Pick<SessionHandlerSources, 'open' | 'autoStartRuns'>,
  { sessionId }: SessionOpenInput,
): Promise<SessionOpenOutput> => {
  await sources.open.ready(sessionId, 'session.open');
  sources.autoStartRuns?.(sessionId);

  return {};
};

const createStartRouter = routerFactory((sources: SessionHandlerSources) =>
  router({
    delegatedAttention: authenticatedAppProcedure
      .input(SessionOpenInput)
      .output(zAsyncIterable({ yield: DelegatedAttention }))
      .subscription(({ input, ctx, signal }) =>
        delegatedAttention(
          sources,
          input.sessionId,
          AbortSignal.any([ctx.connection.signal, ...(signal ? [signal] : [])]),
        ),
      ),
    open: publicProcedure
      .input(SessionOpenInput)
      .output(SessionOpenOutput)
      .mutation(({ input }) => openSession(sources, input)),
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
    answerPermission: authenticatedAppProcedure
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
  ({
    sources,
    list,
    schedules,
  }: {
    sources: SessionHandlerSources;
    list: SessionList;
    schedules: Schedules;
  }) =>
    mergeRouters(
      createListUpdatesRouter(list),
      createScheduleUpdatesRouter(schedules),
      createCountsRouter(list),
      createSeenRouter(sources),
      createStartRouter(sources),
      createAnswerRouter(sources),
    ),
);

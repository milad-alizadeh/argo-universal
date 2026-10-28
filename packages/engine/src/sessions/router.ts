import {
  SessionAgentOptionsInput,
  AgentOptionsUpdate,
  SessionAnswerElicitationInput,
  SessionAnswerElicitationOutput,
  SessionAnswerPermissionInput,
  SessionAnswerPermissionOutput,
  SessionCancelInput,
  SessionCancelOutput,
  SessionCounts,
  SessionListUpdate,
  SessionMarkSeenInput,
  SessionMarkSeenOutput,
  SessionOpenInput,
  SessionOpenOutput,
  SessionPromptInput,
  SessionPromptOutput,
} from '@repo/contracts';
import {
  mergeRouters,
  publicProcedure,
  router,
  routerFactory,
  zAsyncIterable,
} from '../rpc';
import { agentOptionsUpdates } from './agent-options';
import { createArchiveRouter } from './archive/archive-router';
import type { SessionList } from './list/session-list';
import type { SessionRouterDeps } from './router-deps';
import {
  answerSessionElicitation,
  answerSessionPermission,
} from './session-answers';
import { cancelSession } from './session-closure';
import { openSession } from './session-opening';
import { promptSession } from './session-prompt';
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

const createSeenRouter = routerFactory((deps: SessionRouterDeps) =>
  router({
    markSeen: publicProcedure
      .input(SessionMarkSeenInput)
      .output(SessionMarkSeenOutput)
      .mutation(({ input }) => markSessionSeen(deps, input)),
  }),
);

const createStartRouter = routerFactory((deps: SessionRouterDeps) =>
  router({
    prompt: publicProcedure
      .input(SessionPromptInput)
      .output(SessionPromptOutput)
      .mutation(({ input }) => promptSession(deps, input)),
    open: publicProcedure
      .input(SessionOpenInput)
      .output(SessionOpenOutput)
      .mutation(({ input }) => openSession(deps, input)),
    agentOptions: publicProcedure
      .input(SessionAgentOptionsInput)
      .output(zAsyncIterable({ yield: AgentOptionsUpdate }))
      .subscription(({ input, signal }) =>
        agentOptionsUpdates(deps, input, signal),
      ),
  }),
);

const createStopRouter = routerFactory((deps: SessionRouterDeps) =>
  router({
    cancel: publicProcedure
      .input(SessionCancelInput)
      .output(SessionCancelOutput)
      .mutation(({ input }) => cancelSession(deps, input.sessionId)),
  }),
);

const createAnswerRouter = routerFactory((deps: SessionRouterDeps) =>
  router({
    answerPermission: publicProcedure
      .input(SessionAnswerPermissionInput)
      .output(SessionAnswerPermissionOutput)
      .mutation(({ input }) => answerSessionPermission(deps, input)),
    answerElicitation: publicProcedure
      .input(SessionAnswerElicitationInput)
      .output(SessionAnswerElicitationOutput)
      .mutation(({ input }) => answerSessionElicitation(deps, input)),
  }),
);

export const createSessionRouter = routerFactory(
  (deps: SessionRouterDeps & { sessionList: SessionList }) => {
    const { sessionList } = deps;

    return mergeRouters(
      createListUpdatesRouter(sessionList),
      createCountsRouter(sessionList),
      createSeenRouter(deps),
      createStartRouter(deps),
      createStopRouter(deps),
      createArchiveRouter(deps),
      createAnswerRouter(deps),
    );
  },
);

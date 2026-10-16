import {
  SessionAnswerElicitationInput,
  SessionAnswerElicitationOutput,
  SessionAnswerPermissionInput,
  SessionAnswerPermissionOutput,
  SessionCancelInput,
  SessionCancelOutput,
  SessionCloseInput,
  SessionCloseOutput,
  SessionCounts,
  SessionListInput,
  SessionListOutput,
  SessionListUpdate,
  SessionNewInput,
  SessionNewOutput,
  SessionPromptInput,
  SessionPromptOutput,
  SessionSetConfigOptionInput,
  SessionSetConfigOptionOutput,
  SessionSubagentsInput,
  SessionSubagentsOutput,
} from '@repo/contracts';
import {
  mergeRouters,
  publicProcedure,
  router,
  routerFactory,
  zAsyncIterable,
} from '../rpc';
import { createArchiveRouter } from './archive/archive-router';
import { createSessionList } from './list/session-list';
import { createSubagentsReader } from './list/subagents-reader';
import type { SessionRouterDeps } from './router-deps';
import {
  answerSessionElicitation,
  answerSessionPermission,
} from './session-answers';
import { cancelSession, closeSession } from './session-closure';
import { configureSession } from './session-configuration';
import { createSession } from './session-creation';
import { promptSession } from './session-prompt';
import { shellSessionRouter } from './shells/router';
import { unimplementedSessionRouter } from './unimplemented-router';

type SessionList = ReturnType<typeof createSessionList>;

const createListRouter = routerFactory((sessionList: SessionList) =>
  router({
    list: publicProcedure
      .input(SessionListInput)
      .output(SessionListOutput)
      .query(({ input }): Promise<SessionListOutput> =>
        sessionList.list(input),
      ),
  }),
);

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

const createStartRouter = routerFactory((deps: SessionRouterDeps) =>
  router({
    new: publicProcedure
      .input(SessionNewInput)
      .output(SessionNewOutput)
      .mutation(({ input }) => createSession(deps, input)),
    prompt: publicProcedure
      .input(SessionPromptInput)
      .output(SessionPromptOutput)
      .mutation(({ input }) => promptSession(deps, input)),
  }),
);

const createStopRouter = routerFactory((deps: SessionRouterDeps) =>
  router({
    close: publicProcedure
      .input(SessionCloseInput)
      .output(SessionCloseOutput)
      .mutation(({ input }) => closeSession(deps, input.sessionId)),
    cancel: publicProcedure
      .input(SessionCancelInput)
      .output(SessionCancelOutput)
      .mutation(({ input }) => cancelSession(deps, input.sessionId)),
  }),
);

const createConfigurationRouter = routerFactory((deps: SessionRouterDeps) =>
  router({
    setConfigOption: publicProcedure
      .input(SessionSetConfigOptionInput)
      .output(SessionSetConfigOptionOutput)
      .mutation(({ input }) => configureSession(deps, input)),
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

const createSubagentsRouter = routerFactory((deps: SessionRouterDeps) => {
  const readSubagents = createSubagentsReader(deps);

  return router({
    subagents: publicProcedure
      .input(SessionSubagentsInput)
      .output(SessionSubagentsOutput)
      .query(({ input }): SessionSubagentsOutput => {
        deps.readSession(input.sessionId);

        return readSubagents(input.sessionId);
      }),
  });
});

export const createSessionRouter = routerFactory((deps: SessionRouterDeps) => {
  const sessionList = createSessionList(deps);

  return mergeRouters(
    createListRouter(sessionList),
    createListUpdatesRouter(sessionList),
    createCountsRouter(sessionList),
    createStartRouter(deps),
    createStopRouter(deps),
    createArchiveRouter(deps),
    createConfigurationRouter(deps),
    createAnswerRouter(deps),
    createSubagentsRouter(deps),
    unimplementedSessionRouter,
    shellSessionRouter,
  );
});

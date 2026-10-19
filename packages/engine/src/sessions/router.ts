import {
  SessionAgentOptionsInput,
  AgentOptionsUpdate,
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
  SessionMarkSeenInput,
  SessionMarkSeenOutput,
  SessionNewInput,
  SessionNewOutput,
  SessionOpenInput,
  SessionOpenOutput,
  SessionPromptInput,
  SessionPromptOutput,
  SessionRenameInput,
  SessionRenameOutput,
  SessionSavePlanInput,
  SessionSavePlanOutput,
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
import { agentOptionsUpdates } from './agent-options';
import { createArchiveRouter } from './archive/archive-router';
import { createSessionList } from './list/session-list';
import type { SessionRouterDeps } from './router-deps';
import {
  answerSessionElicitation,
  answerSessionPermission,
} from './session-answers';
import { cancelSession, closeSession } from './session-closure';
import { configureSession } from './session-configuration';
import { createSession } from './session-creation';
import { openSession } from './session-opening';
import { promptSession } from './session-prompt';
import { renameSession } from './session-rename';
import { saveSessionPlan } from './session-save-plan';
import { markSessionSeen } from './session-seen';
import { createShellSessionRouter } from './shells/router';
import { createSubagentsReader } from './subagents';
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
    new: publicProcedure
      .input(SessionNewInput)
      .output(SessionNewOutput)
      .mutation(({ input }) => createSession(deps, input)),
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

const createRenameRouter = routerFactory((deps: SessionRouterDeps) =>
  router({
    rename: publicProcedure
      .input(SessionRenameInput)
      .output(SessionRenameOutput)
      .mutation(({ input }) => renameSession(deps, input)),
    savePlan: publicProcedure
      .input(SessionSavePlanInput)
      .output(SessionSavePlanOutput)
      .mutation(({ input }) => saveSessionPlan(deps, input)),
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
    createSeenRouter(deps),
    createStartRouter(deps),
    createStopRouter(deps),
    createArchiveRouter(deps),
    createConfigurationRouter(deps),
    createRenameRouter(deps),
    createAnswerRouter(deps),
    createSubagentsRouter(deps),
    unimplementedSessionRouter,
    createShellSessionRouter(deps),
  );
});

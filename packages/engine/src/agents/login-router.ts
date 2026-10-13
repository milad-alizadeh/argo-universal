import {
  AgentLoginTerminalRead,
  AgentLoginTerminalWrite,
  AgentLoginTerminalFrame,
  AgentLoginAnswer,
  AgentLoginChoose,
  AgentLoginOperation,
  AgentLoginSnapshot,
  AgentLoginStart,
} from '@repo/contracts';
import { mergeRouters, publicProcedure, router, routerFactory } from '../rpc';
import type { AgentLogins } from './login';

type LoginRouterDeps = {
  agentLogins: AgentLogins;
  sessionCommandSignal?: AbortSignal;
};

const mutation = (deps: LoginRouterDeps): typeof publicProcedure =>
  publicProcedure.use(({ next }) => {
    deps.sessionCommandSignal?.throwIfAborted();

    return next();
  });

const createStartRouter = routerFactory((deps: LoginRouterDeps) =>
  router({
    startLogin: mutation(deps)
      .input(AgentLoginStart)
      .output(AgentLoginSnapshot)
      .mutation(({ input }) => deps.agentLogins.start(input)),
    login: publicProcedure
      .input(AgentLoginOperation)
      .output(AgentLoginSnapshot)
      .query(({ input }) => deps.agentLogins.read(input)),
  }),
);

const createChooseRouter = routerFactory((deps: LoginRouterDeps) =>
  router({
    loginTerminal: publicProcedure
      .input(AgentLoginTerminalRead)
      .output(AgentLoginTerminalFrame)
      .query(({ input }) => deps.agentLogins.readTerminal(input)),
    inputLoginTerminal: mutation(deps)
      .input(AgentLoginTerminalWrite)
      .mutation(({ input }) => deps.agentLogins.inputTerminal(input)),
    chooseLoginMethod: mutation(deps)
      .input(AgentLoginChoose)
      .output(AgentLoginSnapshot)
      .mutation(({ input }) => deps.agentLogins.choose(input)),
  }),
);

const createAnswerRouter = routerFactory((deps: LoginRouterDeps) =>
  router({
    answerLogin: mutation(deps)
      .input(AgentLoginAnswer)
      .output(AgentLoginSnapshot)
      .mutation(({ input }) => deps.agentLogins.answer(input)),
    cancelLogin: mutation(deps)
      .input(AgentLoginOperation)
      .output(AgentLoginSnapshot)
      .mutation(({ input }) => deps.agentLogins.cancel(input)),
  }),
);

export const createLoginRouter = routerFactory((deps: LoginRouterDeps) =>
  mergeRouters(
    createStartRouter(deps),
    createChooseRouter(deps),
    createAnswerRouter(deps),
  ),
);

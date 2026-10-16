import {
  AgentAuthSubject,
  AgentAuthenticateInput,
  AgentAuthState,
  AgentAuthenticateOutput,
  AgentAuthTerminalRead,
  AgentAuthTerminalWrite,
  AgentAuthTerminalFrame,
} from '@repo/contracts';
import {
  mergeRouters,
  publicProcedure,
  router,
  routerFactory,
} from '../../rpc';
import type { AgentsRouterDeps } from '../router';
import {
  authentication,
  authenticate,
  cancelAuthentication,
  readAuthTerminal,
  writeAuthTerminal,
} from './auth-connection';

const stateRouter = routerFactory((deps: AgentsRouterDeps) =>
  router({
    authState: publicProcedure
      .input(AgentAuthSubject)
      .output(AgentAuthState)
      .query(async ({ input }) => (await authentication(deps, input)).state()),
    authenticate: publicProcedure
      .input(AgentAuthenticateInput)
      .output(AgentAuthenticateOutput)
      .mutation(({ input }) => authenticate(deps, input)),
    cancelAuthenticate: publicProcedure
      .input(AgentAuthSubject)
      .mutation(({ input }) => cancelAuthentication(deps, input)),
  }),
);

const terminalRouter = routerFactory((deps: AgentsRouterDeps) =>
  router({
    authTerminal: publicProcedure
      .input(AgentAuthTerminalRead)
      .output(AgentAuthTerminalFrame)
      .query(({ input }) => readAuthTerminal(deps, input, input.cursor)),
    authTerminalInput: publicProcedure
      .input(AgentAuthTerminalWrite)
      .mutation(({ input }) => writeAuthTerminal(deps, input, input.input)),
  }),
);

export const createAuthRouter = routerFactory((deps: AgentsRouterDeps) =>
  mergeRouters(stateRouter(deps), terminalRouter(deps)),
);

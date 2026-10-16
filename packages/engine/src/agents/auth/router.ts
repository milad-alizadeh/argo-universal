import {
  AgentAuthSubject,
  AgentAuthenticateInput,
  AgentAuthState,
  AgentAuthenticateOutput,
  AgentAuthTerminalRead,
  AgentAuthTerminalWrite,
  AgentAuthTerminalFrame,
} from '@repo/contracts';
import type { z } from 'zod';
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
  findAuthentication,
  existingAuthentication,
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

const readTerminal = async (
  deps: AgentsRouterDeps,
  input: z.infer<typeof AgentAuthTerminalRead>,
): Promise<AgentAuthTerminalFrame> =>
  (await findAuthentication(deps, input))?.readTerminal(input.cursor) ?? {
    cursor: 0,
    output: '',
    closed: true,
  };

const terminalRouter = routerFactory((deps: AgentsRouterDeps) =>
  router({
    authTerminal: publicProcedure
      .input(AgentAuthTerminalRead)
      .output(AgentAuthTerminalFrame)
      .query(({ input }) => readTerminal(deps, input)),
    authTerminalInput: publicProcedure
      .input(AgentAuthTerminalWrite)
      .mutation(async ({ input }) =>
        (await existingAuthentication(deps, input)).inputTerminal(input.input),
      ),
  }),
);

export const createAuthRouter = routerFactory((deps: AgentsRouterDeps) =>
  mergeRouters(stateRouter(deps), terminalRouter(deps)),
);

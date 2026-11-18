import { AgentAuthSubject, AgentUsageLimits } from '@repo/contracts';
import {
  mergeRouters,
  publicProcedure,
  router,
  routerFactory,
} from '../../rpc';
import type { AgentsRouterDeps } from '../router';

const readRouter = routerFactory((deps: AgentsRouterDeps) =>
  router({
    usageLimits: publicProcedure
      .input(AgentAuthSubject)
      .output(AgentUsageLimits)
      .query(({ input }) =>
        deps.sessionConnections.acpResources().usageLimits.read(input),
      ),
  }),
);

const changesRouter = routerFactory((deps: AgentsRouterDeps) =>
  router({
    usageLimitsChanges: publicProcedure
      .input(AgentAuthSubject)
      .subscription(({ input, signal }) => {
        if (!signal)
          throw new Error('Usage limits subscription signal is missing');

        return deps.sessionConnections
          .acpResources()
          .usageLimits.watch(input, signal);
      }),
  }),
);

export const createUsageLimitsRouter = routerFactory((deps: AgentsRouterDeps) =>
  mergeRouters(readRouter(deps), changesRouter(deps)),
);

import { UsageLimitsSubject, AgentUsageLimits } from '@repo/contracts';
import {
  mergeRouters,
  publicProcedure,
  router,
  routerFactory,
} from '../../rpc';
import type { AgentsRouterDeps } from '../router';
import type { UsageLimits } from './usage-limits';

const usageLimitsOf = (
  deps: AgentsRouterDeps,
): Pick<UsageLimits, 'read' | 'watch'> =>
  deps.sessionConnections.acpResources().usageLimits;

const readRouter = routerFactory((deps: AgentsRouterDeps) =>
  router({
    usageLimits: publicProcedure
      .input(UsageLimitsSubject)
      .output(AgentUsageLimits)
      .query(({ input }) => usageLimitsOf(deps).read(input)),
  }),
);

const changesRouter = routerFactory((deps: AgentsRouterDeps) =>
  router({
    usageLimitsChanges: publicProcedure
      .input(UsageLimitsSubject)
      .subscription(({ input, signal }) => {
        if (!signal)
          throw new Error('Usage limits subscription signal is missing');

        return usageLimitsOf(deps).watch(input, signal);
      }),
  }),
);

export const createUsageLimitsRouter = routerFactory((deps: AgentsRouterDeps) =>
  mergeRouters(readRouter(deps), changesRouter(deps)),
);

import { z } from 'zod';
import { publicProcedure, router, routerFactory } from '../rpc';
import type { LocalNetworkAccess } from './local-network-access';

export interface NetworkAccessDeps {
  localNetworkAccess: LocalNetworkAccess;
}

const State = z.object({ enabled: z.boolean() });

// Server-Device-only (ADR-0022, ADR-0045). The App hides the switch from a paired Device; the Server's own refusal is `serverDeviceProcedure` in #1497, which swaps in here.
export const createNetworkRouter = routerFactory((deps: NetworkAccessDeps) =>
  router({
    localAccess: publicProcedure
      .output(State)
      .query(() => ({ enabled: deps.localNetworkAccess.enabled })),
    setLocalAccess: publicProcedure
      .input(State)
      .output(State)
      .mutation(async ({ input }) => {
        await deps.localNetworkAccess.set(input.enabled);

        return { enabled: deps.localNetworkAccess.enabled };
      }),
  }),
);

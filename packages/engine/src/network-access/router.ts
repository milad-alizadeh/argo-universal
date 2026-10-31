import { z } from 'zod';
import { router, routerFactory, serverDeviceProcedure } from '../rpc';
import type { LocalNetworkAccess } from './local-network-access';

export interface NetworkAccessDeps {
  localNetworkAccess: LocalNetworkAccess;
}

const State = z.object({ enabled: z.boolean() });

// Server-Device-only (ADR-0022, ADR-0045): deciding who may reach the Server is the owner's alone, so `serverDeviceProcedure` refuses a Paired Device here and the App's hidden switch is not the check.
export const createNetworkRouter = routerFactory((deps: NetworkAccessDeps) =>
  router({
    localAccess: serverDeviceProcedure
      .output(State)
      .query(() => ({ enabled: deps.localNetworkAccess.enabled })),
    setLocalAccess: serverDeviceProcedure
      .input(State)
      .output(State)
      .mutation(async ({ input }) => {
        await deps.localNetworkAccess.set(input.enabled);

        return { enabled: deps.localNetworkAccess.enabled };
      }),
  }),
);

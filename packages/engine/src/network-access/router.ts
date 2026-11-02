import { z } from 'zod';
import { router, routerFactory, serverDeviceProcedure } from '../rpc';
import type { LocalNetworkAccess } from './local-network-access';

export interface NetworkAccessDeps {
  localNetworkAccess: LocalNetworkAccess;
}

const State = z.object({ enabled: z.boolean() });

/*
 * Both halves of the switch are Server-Device-only. Deciding who may reach the Server is the owner's alone (ADR-0045), and ADR-0022's reason is the Server Device's configuration being no business of a Paired Device's, which reading it is as much as changing it.
 * So the Server refuses the question as well as the change, rather than leaving the App's hidden switch as the check. ADR-0045 names this setting and keep-running-after-quit as one pair, and `system.keepRunning` is gated the same way.
 */
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

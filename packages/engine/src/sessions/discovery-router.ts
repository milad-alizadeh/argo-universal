import {
  SessionDiscovery,
  SessionDiscoveryInput,
  SessionDiscoveryOutput,
} from '@repo/contracts';
import { publicProcedure, router, routerFactory } from '../rpc';
import {
  validateDiscoveryDestination,
  validateDiscoveryIdentity,
} from './discovery-admission';
import {
  discoveryKey,
  type DiscoveryCacheActor,
} from './discovery-cache-machine';

export const createDiscoveryRouter = routerFactory(
  (deps: { discovery: DiscoveryCacheActor }) =>
    router({
      discovery: publicProcedure
        .input(SessionDiscoveryInput)
        .output(SessionDiscoveryOutput)
        .query(async ({ input }) => {
          const snapshot = activeDiscovery(deps.discovery);
          await validateDiscoveryDestination(snapshot.context, input);
          validateDiscoveryIdentity(
            activeDiscovery(deps.discovery).context,
            input,
          );

          const result =
            activeDiscovery(deps.discovery).context.results[
              discoveryKey(input)
            ] ?? null;

          deps.discovery.send({ type: 'discovery.refresh', ...input });

          return result;
        }),
      refreshDiscovery: publicProcedure
        .input(SessionDiscoveryInput)
        .output(SessionDiscovery)
        .mutation(({ input }) => {
          validateDiscoveryIdentity(
            activeDiscovery(deps.discovery).context,
            input,
          );
          const completion = Promise.withResolvers<SessionDiscovery>();
          deps.discovery.send({
            type: 'discovery.refresh',
            ...input,
            completion,
          });

          return completion.promise;
        }),
    }),
);

function activeDiscovery(
  discovery: DiscoveryCacheActor,
): ReturnType<DiscoveryCacheActor['getSnapshot']> {
  const snapshot = discovery.getSnapshot();

  if (snapshot.status !== 'active') throw new Error('Discovery is unavailable');

  return snapshot;
}

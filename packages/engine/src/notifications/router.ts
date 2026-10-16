import {
  NotificationAcknowledgement,
  NotificationAttention,
  NotificationStreamEvent,
  NotificationSubscription,
} from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  mergeRouters,
  publicProcedure,
  router,
  routerFactory,
  zAsyncIterable,
  type RpcConnection,
} from '../rpc';
import type { Notifications } from './notifications';

export interface NotificationsDeps {
  notifications: Notifications;
}

function requireConnection(
  connection: RpcConnection | undefined,
): RpcConnection {
  if (!connection || connection.signal.aborted)
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Notifications require a live App Connection',
    });

  return connection;
}

const streamRouter = routerFactory((deps: NotificationsDeps) =>
  router({
    events: publicProcedure
      .input(NotificationSubscription)
      .output(zAsyncIterable({ yield: NotificationStreamEvent }))
      .subscription(async function* ({ input, ctx, signal }) {
        const connection = requireConnection(ctx.connection);
        yield* deps.notifications.events(
          connection,
          input.deliver,
          signal ?? connection.signal,
        );
      }),
  }),
);

const attentionRouter = routerFactory((deps: NotificationsDeps) =>
  router({
    attention: publicProcedure
      .input(NotificationAttention)
      .output(z.boolean())
      .mutation(({ input, ctx }) =>
        deps.notifications.report(
          requireConnection(ctx.connection),
          input.sessionId,
        ),
      ),
  }),
);

const acknowledgementRouter = routerFactory((deps: NotificationsDeps) =>
  router({
    acknowledge: publicProcedure
      .input(NotificationAcknowledgement)
      .output(z.boolean())
      .mutation(({ input, ctx }) =>
        deps.notifications.acknowledge(
          requireConnection(ctx.connection),
          input.id,
        ),
      ),
  }),
);

export const createNotificationsRouter = routerFactory(
  (deps: NotificationsDeps) =>
    mergeRouters(
      streamRouter(deps),
      attentionRouter(deps),
      acknowledgementRouter(deps),
    ),
);

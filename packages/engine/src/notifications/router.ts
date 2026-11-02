import {
  NotificationAcknowledgement,
  NotificationAttention,
  NotificationStreamEvent,
  NotificationSubscription,
} from '@repo/contracts';
import { z } from 'zod';
import {
  liveConnection,
  mergeRouters,
  publicProcedure,
  router,
  routerFactory,
  zAsyncIterable,
  type RpcConnection,
  type RpcContext,
} from '../rpc';
import type { Notifications } from './notifications';

export interface NotificationsDeps {
  notifications: Notifications;
}

const liveNotifications = (ctx: RpcContext): RpcConnection =>
  liveConnection(ctx.connection, 'Notifications require a live App Connection');

const streamRouter = routerFactory((deps: NotificationsDeps) =>
  router({
    events: publicProcedure
      .input(NotificationSubscription)
      .output(zAsyncIterable({ yield: NotificationStreamEvent }))
      .subscription(async function* ({ input, ctx, signal }) {
        const connection = liveNotifications(ctx);
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
        deps.notifications.report(liveNotifications(ctx), input.sessionId),
      ),
  }),
);

const acknowledgementRouter = routerFactory((deps: NotificationsDeps) =>
  router({
    acknowledge: publicProcedure
      .input(NotificationAcknowledgement)
      .output(z.boolean())
      .mutation(({ input, ctx }) =>
        deps.notifications.acknowledge(liveNotifications(ctx), input.id),
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

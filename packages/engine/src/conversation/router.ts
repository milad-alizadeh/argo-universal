import {
  ConversationDeviceReport,
  ConversationDeviceRequest,
  ConversationStatus,
} from '@repo/contracts';
import { publicProcedure, router, routerFactory, zAsyncIterable } from '../rpc';
import type { ConversationsPort } from './conversations';

export interface ConversationRouterDeps {
  conversation: Pick<ConversationsPort, 'watch' | 'devices'>;
}

// The App's stream of the Conversation's standing, which its Composer draws; the Operations start and end the call.
export const createConversationRouter = routerFactory(
  (deps: ConversationRouterDeps) =>
    router({
      watch: publicProcedure
        .output(zAsyncIterable({ yield: ConversationStatus }))
        .subscription(({ ctx, signal }) =>
          deps.conversation.watch(signal ?? ctx.connection.signal),
        ),
      // App plumbing: the App reports its microphones and speakers and hears which to use; it subscribes again when they change.
      devices: publicProcedure
        .input(ConversationDeviceReport)
        .output(zAsyncIterable({ yield: ConversationDeviceRequest }))
        .subscription(({ ctx, input }) =>
          deps.conversation.devices.listen(input, ctx.connection.signal),
        ),
    }),
);

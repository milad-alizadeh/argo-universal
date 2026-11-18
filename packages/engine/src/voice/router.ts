import { VoiceStatus } from '@repo/contracts';
import { publicProcedure, router, routerFactory, zAsyncIterable } from '../rpc';
import type { VoiceCallsPort } from './voice-calls';

export interface VoiceRouterDeps {
  voice: VoiceCallsPort;
}

// The App's stream of the Voice call's standing, which its Composer draws; the Operations start and end the call.
export const createVoiceRouter = routerFactory((deps: VoiceRouterDeps) =>
  router({
    watch: publicProcedure
      .output(zAsyncIterable({ yield: VoiceStatus }))
      .subscription(({ ctx, signal }) =>
        deps.voice.watch(signal ?? ctx.connection.signal),
      ),
  }),
);

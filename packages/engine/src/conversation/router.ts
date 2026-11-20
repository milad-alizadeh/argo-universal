import {
  VoiceDeviceReport,
  VoiceDeviceRequest,
  VoiceStatus,
} from '@repo/contracts';
import { publicProcedure, router, routerFactory, zAsyncIterable } from '../rpc';
import type { VoiceCallsPort } from './conversations';

export interface VoiceRouterDeps {
  voice: Pick<VoiceCallsPort, 'watch' | 'devices'>;
}

// The App's stream of the Voice call's standing, which its Composer draws; the Operations start and end the call.
export const createVoiceRouter = routerFactory((deps: VoiceRouterDeps) =>
  router({
    watch: publicProcedure
      .output(zAsyncIterable({ yield: VoiceStatus }))
      .subscription(({ ctx, signal }) =>
        deps.voice.watch(signal ?? ctx.connection.signal),
      ),
    // App plumbing: the App reports its microphones and speakers and hears which to use; it subscribes again when they change.
    devices: publicProcedure
      .input(VoiceDeviceReport)
      .output(zAsyncIterable({ yield: VoiceDeviceRequest }))
      .subscription(({ ctx, input }) =>
        deps.voice.devices.listen(input, ctx.connection.signal),
      ),
  }),
);

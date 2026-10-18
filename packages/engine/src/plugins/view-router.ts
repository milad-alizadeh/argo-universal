import type { PartVersions } from '@repo/contracts/plugins/kit';
import {
  PluginDispatchInput,
  PluginSlotInput,
  PluginViewInput,
} from '@repo/contracts/plugins/wire';
import { publicProcedure, router, routerFactory } from '../rpc';
import type { RpcContext } from '../rpc/connection';
import type { PluginService } from './service';

export function requireSignal(signal: AbortSignal | undefined): AbortSignal {
  if (!signal) throw new Error('Plugin subscription signal is missing');

  return signal;
}

type Subscriber<Input, Output> = (options: {
  input: Input;
  signal: AbortSignal | undefined;
  ctx: RpcContext;
}) => AsyncGenerator<Output>;

type Watch<Input, Output> = (
  input: Input,
  signal: AbortSignal,
  parts?: PartVersions,
) => AsyncGenerator<Output>;

function watched<Input, Output>(
  watch: Watch<Input, Output>,
): Subscriber<Input, Output> {
  return ({ input, signal, ctx }) =>
    watch(input, requireSignal(signal), ctx.connection?.surface?.parts);
}

// What Apps use to show a Plugin's page or Slot content and to send its taps back.
export const createPluginViewRouter = routerFactory((plugins: PluginService) =>
  router({
    view: publicProcedure
      .input(PluginViewInput)
      .subscription(watched(plugins.view.bind(plugins))),
    slot: publicProcedure
      .input(PluginSlotInput)
      .subscription(watched(plugins.slot.bind(plugins))),
    dispatch: publicProcedure
      .input(PluginDispatchInput)
      .mutation(({ input }) => plugins.dispatch(input)),
  }),
);

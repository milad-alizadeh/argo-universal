import {
  PluginDispatchInput,
  PluginSlotInput,
  PluginViewInput,
} from '@repo/contracts/plugins/wire';
import { publicProcedure, router, routerFactory } from '../rpc';
import type { PluginService } from './service';

export function requireSignal(signal: AbortSignal | undefined): AbortSignal {
  if (!signal) throw new Error('Plugin subscription signal is missing');

  return signal;
}

type Subscriber<Input, Output> = (options: {
  input: Input;
  signal: AbortSignal | undefined;
}) => AsyncGenerator<Output>;

// A subscription that ends when its signal aborts.
function watched<Input, Output>(
  watch: (input: Input, signal: AbortSignal) => AsyncGenerator<Output>,
): Subscriber<Input, Output> {
  return ({ input, signal }) => watch(input, requireSignal(signal));
}

// What Apps use to show a Plugin's page or Slot content and to send its taps back.
export const createPluginViewRouter = routerFactory((plugins: PluginService) =>
  router({
    view: publicProcedure
      .input(PluginViewInput)
      .subscription(watched((input, signal) => plugins.view(input, signal))),
    // Project details and later core pages: each declaring Plugin's contribution, streamed like a page.
    slot: publicProcedure
      .input(PluginSlotInput)
      .subscription(watched((input, signal) => plugins.slot(input, signal))),
    dispatch: publicProcedure
      .input(PluginDispatchInput)
      .mutation(({ input }) => plugins.dispatch(input)),
  }),
);

import {
  PluginDispatchInput,
  PluginViewInput,
} from '@repo/contracts/plugins/wire';
import { publicProcedure, router, routerFactory } from '../rpc';
import type { PluginService } from './service';

export function requireSignal(signal: AbortSignal | undefined): AbortSignal {
  if (!signal) throw new Error('Plugin subscription signal is missing');

  return signal;
}

// What Apps use to show a Plugin's page and to send its taps back.
export const createPluginViewRouter = routerFactory((plugins: PluginService) =>
  router({
    view: publicProcedure
      .input(PluginViewInput)
      .subscription(({ input, signal }) =>
        plugins.view(input, requireSignal(signal)),
      ),
    dispatch: publicProcedure
      .input(PluginDispatchInput)
      .mutation(({ input }) => plugins.dispatch(input)),
  }),
);

import { ShellOutput, ShellOutputInput } from '@repo/contracts';
import {
  publicProcedure,
  router,
  routerFactory,
  zAsyncIterable,
} from '../../rpc';
import { watchShellOutput } from './output';
import type { OutputStorage } from './output-reader';

export const createShellRouter = routerFactory((deps: OutputStorage) =>
  router({
    output: publicProcedure
      .input(ShellOutputInput)
      .output(zAsyncIterable({ yield: ShellOutput }))
      .subscription(({ input, signal }) =>
        watchShellOutput(deps, input, signal),
      ),
  }),
);

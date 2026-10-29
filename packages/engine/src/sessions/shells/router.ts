import { ShellOutput, ShellOutputInput } from '@repo/contracts';
import {
  publicProcedure,
  router,
  routerFactory,
  zAsyncIterable,
} from '../../rpc';
import type { SessionRouterDeps } from '../router-deps';
import { watchShellOutput } from './output';

export const createShellRouter = routerFactory(
  (deps: SessionRouterDeps & { blobsFolder: string }) =>
    router({
      output: publicProcedure
        .input(ShellOutputInput)
        .output(zAsyncIterable({ yield: ShellOutput }))
        .subscription(({ input, signal }) =>
          watchShellOutput(deps, input, signal),
        ),
    }),
);

import {
  DeclaredItems,
  DeclaredItemsInput,
} from '@repo/contracts/plugins/declared-slots';
import { PageRun, PageRunAnswer } from '@repo/contracts/plugins/page-address';
import { DrawRequest } from '@repo/contracts/plugins/page-draw';
import {
  ReplaceableAnswer,
  ReplaceableInput,
  RenderFailureInput,
} from '@repo/contracts/plugins/replaceable';
import {
  PluginDispatchInput,
  PluginViewInput,
  SlotItemsInput,
} from '@repo/contracts/plugins/wire';
import { z } from 'zod';
import {
  mergeRouters,
  liveConnection,
  publicProcedure,
  router,
  routerFactory,
  type RpcConnection,
} from '../rpc';
import type { RpcContext } from '../rpc/connection';
import type { PluginAccounts } from './accounts/plugin-accounts';
import { accountsRouter } from './accounts/router';
import type { PluginListChanges } from './list-changes';
import type { PluginOperationService } from './operations';
import type { LoaderPages } from './pages';
import type { PluginService } from './service';

function requireSignal(signal: AbortSignal | undefined): AbortSignal {
  if (!signal) throw new Error('Plugin subscription signal is missing');

  return signal;
}

const viewConnection = (ctx: RpcContext): RpcConnection =>
  liveConnection(ctx.connection, 'Plugin views require a live App Connection');

// A view lives while both the App Connection and its subscription are open.
function connectionOf({
  ctx,
  signal,
}: {
  ctx: RpcContext;
  signal?: AbortSignal;
}): RpcConnection {
  const live = viewConnection(ctx);

  return {
    ...live,
    signal: signal ? AbortSignal.any([live.signal, signal]) : live.signal,
  };
}

const createLifecycleRouter = routerFactory((plugins: PluginService) =>
  router({
    failures: publicProcedure.subscription(({ signal }) =>
      plugins.failures(requireSignal(signal)),
    ),
    badges: publicProcedure.subscription(({ signal }) =>
      plugins.badges(requireSignal(signal)),
    ),
  }),
);

// The connected Server's Plugin list changed: the App reads it again, so its rail and its open pages follow.
const createListRouter = routerFactory((listChanges: PluginListChanges) =>
  router({
    listChanges: publicProcedure.subscription(({ signal }) =>
      listChanges.watch(requireSignal(signal)),
    ),
  }),
);

/*
 * A Plugin's view streams to one live App Connection; a Replaceable Slot is asked once, for that
 * Connection's App, and asked again when its props change (ADR-0050).
 */
const createViewsRouter = routerFactory((plugins: PluginService) =>
  router({
    view: publicProcedure
      .input(PluginViewInput)
      .subscription((call) => plugins.view(call.input, connectionOf(call))),
    render: publicProcedure
      .input(ReplaceableInput)
      .output(ReplaceableAnswer)
      .query(({ input, ctx }) => plugins.render(input, viewConnection(ctx))),
  }),
);

/*
 * One batched call per list: each context's Plugin items, by its key (ADR-0035). A declared Slot's items come from the
 * manifests, so no Plugin starts to answer them (ADR-0025).
 */
const createSlotItemsRouter = routerFactory((plugins: PluginService) =>
  router({
    slotItems: publicProcedure
      .input(SlotItemsInput)
      .subscription((call) =>
        plugins.slotItems(call.input, connectionOf(call)),
      ),
    declared: publicProcedure
      .input(DeclaredItemsInput)
      .output(DeclaredItems)
      .query(({ input }) => plugins.declared(input)),
  }),
);

// What an App sends back about a view it draws.
const createViewEventsRouter = routerFactory((plugins: PluginService) =>
  router({
    dispatch: publicProcedure
      .input(PluginDispatchInput)
      .mutation(async ({ input, ctx }) => {
        await plugins.dispatch(viewConnection(ctx), input);

        return { ok: true as const };
      }),
    renderFailed: publicProcedure
      .input(RenderFailureInput)
      .mutation(({ input }) => {
        plugins.renderFailed(input);

        return { ok: true as const };
      }),
  }),
);

/*
 * Loader pages (ADR-0050): a draw is a plain query the App caches by Page address, and an Operation a
 * page's Component event runs answers the patterns to draw again. The App's tap runs as the user.
 */
const createLoaderPagesRouter = routerFactory((pages: LoaderPages) =>
  router({
    draw: publicProcedure
      .input(DrawRequest)
      .query(({ input }) => pages.draw(input)),
    loaderPages: publicProcedure
      .input(z.strictObject({ pluginId: z.string().min(1) }))
      .query(({ input }) => pages.patterns(input.pluginId)),
    run: publicProcedure
      .input(PageRun)
      .output(PageRunAnswer)
      .mutation(({ input }) => pages.run(input)),
  }),
);

// After any Operation of a Plugin, its Loader pages are stale on every connected App.
const createStaleRouter = routerFactory((pages: LoaderPages) =>
  router({
    stale: publicProcedure.subscription(({ signal }) =>
      pages.stale(requireSignal(signal)),
    ),
  }),
);

export type PluginsRouterDeps = {
  plugins: PluginService;
  accounts: PluginAccounts;
  listChanges: PluginListChanges;
  operations: PluginOperationService;
  pages: LoaderPages;
};

export const createPluginsRouter = routerFactory(
  ({ plugins, accounts, listChanges, pages }: PluginsRouterDeps) =>
    mergeRouters(
      router({ accounts: accountsRouter(accounts) }),
      createLifecycleRouter(plugins),
      createListRouter(listChanges),
      createViewsRouter(plugins),
      createSlotItemsRouter(plugins),
      createViewEventsRouter(plugins),
      createLoaderPagesRouter(pages),
      createStaleRouter(pages),
    ),
);

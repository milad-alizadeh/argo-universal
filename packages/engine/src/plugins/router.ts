import {
  DeclaredItems,
  DeclaredItemsInput,
} from '@repo/contracts/plugins/declared-slots';
import { PageRun, PageRunAnswer } from '@repo/contracts/plugins/page-address';
import { DrawRequest } from '@repo/contracts/plugins/page-draw';
import { LiveRequest } from '@repo/contracts/plugins/page-live';
import {
  ReplaceableAnswer,
  ReplaceableInput,
  RenderFailureInput,
} from '@repo/contracts/plugins/replaceable';
import { SlotItemsInput } from '@repo/contracts/plugins/wire';
import { mergeRouters, publicProcedure, router, routerFactory } from '../rpc';
import type { PluginAccounts } from './accounts/plugin-accounts';
import { accountsRouter } from './accounts/router';
import type { PluginListChanges } from './list-changes';
import type { PluginOperationService } from './operations';
import type { LoaderPages } from './pages';
import type { PluginService } from './service';
import {
  connectionOf,
  requireSignal,
  appConnection,
} from './subscription-connection';

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

// A Replaceable Slot is asked once, for the Connection's App, and asked again when its props change (ADR-0050).
const createRenderRouter = routerFactory((plugins: PluginService) =>
  router({
    render: publicProcedure
      .input(ReplaceableInput)
      .output(ReplaceableAnswer)
      .query(({ input, ctx }) => plugins.render(input, appConnection(ctx))),
    renderFailed: publicProcedure
      .input(RenderFailureInput)
      .mutation(({ input }) => {
        plugins.renderFailed(input);

        return { ok: true as const };
      }),
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

/*
 * Loader pages (ADR-0050): a draw is a plain query the App caches by Page address, and an Operation a
 * page's Component event runs answers its result; the pages it changed hear of it from the stale mark. The
 * App's tap runs as the user.
 */
const createLoaderPagesRouter = routerFactory((pages: LoaderPages) =>
  router({
    draw: publicProcedure
      .input(DrawRequest)
      .query(({ input, ctx }) => pages.draw(input, ctx.connection)),
    run: publicProcedure
      .input(PageRun)
      .output(PageRunAnswer)
      .mutation(({ input, ctx }) => pages.run(input, ctx.connection)),
  }),
);

/*
 * After any Operation of a Plugin, its Loader pages are stale on every connected App; a live page streams to
 * one live App Connection while it subscribes.
 */
const createPageStreamsRouter = routerFactory((pages: LoaderPages) =>
  router({
    stale: publicProcedure.subscription(({ signal }) =>
      pages.stale(requireSignal(signal)),
    ),
    live: publicProcedure
      .input(LiveRequest)
      .subscription((call) => pages.live(call.input, connectionOf(call))),
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
      createRenderRouter(plugins),
      createSlotItemsRouter(plugins),
      createLoaderPagesRouter(pages),
      createPageStreamsRouter(pages),
    ),
);

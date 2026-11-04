import type { PageRunAnswer } from '@repo/contracts/plugins/page-address';
import type {
  PageCallsPorts,
  PageStatePort,
  ScopedRun,
} from '@repo/contracts/plugins/page-calls';
import type { PageAddresses, PageOpening } from './page-addresses';

/*
 * The App's one run of an Operation, tRPC in the App and a function in tests, and how it says one failed: a
 * toast in the App.
 */
export type OperationRunner = {
  run: (run: ScopedRun & { pluginId: string }) => Promise<PageRunAnswer>;
  failed: PageCallsPorts['failed'];
};

// The opening's Page state, as the Page address cache draws it again.
const pageStateOf = (
  addresses: PageAddresses,
  opening: PageOpening,
): PageStatePort => ({
  change: (change) => addresses.change(opening, change),
  loadMore: () => addresses.loadMore(opening),
});

/*
 * What a Loader page's calls reach in the App: the trees its Page address cache keeps for the opening, and
 * the Server's Operation run, which says when it failed. An Operation belongs to the Plugin, not to the page
 * it was called from; its settled trees come from the Server's stale mark (useStaleMarks), which also
 * reaches the other Apps.
 */
export const pageCallsPorts = (
  addresses: PageAddresses,
  opening: PageOpening,
  { run, failed }: OperationRunner,
): PageCallsPorts => ({
  scope: opening,
  shown: () => addresses.shown(opening),
  patch: (patch) => addresses.patch(opening, patch),
  run: async (scoped) => {
    await run({ pluginId: opening.pluginId, ...scoped });
  },
  failed,
  pageState: pageStateOf(addresses, opening),
});

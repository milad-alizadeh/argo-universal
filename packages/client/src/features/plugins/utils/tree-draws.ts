import type { PageAddress } from '@repo/contracts/plugins/page-address';
import type {
  DrawAnswer,
  DrawRequest,
} from '@repo/contracts/plugins/page-draw';
import { hashKey, type QueryClient } from '@tanstack/react-query';
import type { DrawTracking } from './draw-tracking';
import {
  keptAfter,
  keptOf,
  shownOf,
  type Kept,
  type KeptPage,
} from './page-answer';
import { treeKey } from './page-keys';

// The one call the cache makes: a draw of an address, naming what it keeps. tRPC in the App, a function in tests.
export type DrawPage = (request: DrawRequest) => Promise<DrawAnswer>;

export type HowDrawn = { pages?: number; pull?: true };

const requestOf = (
  address: PageAddress,
  kept: Kept | undefined,
  how: HowDrawn,
): DrawRequest => ({
  ...address,
  known: kept?.hash,
  ...how,
  pages: how.pages ?? shownOf(kept),
});

// The draws of the Page addresses' trees, those the query makes and those a load more or pull makes beside it.
export class TreeDraws {
  public constructor(
    private readonly client: QueryClient,
    private readonly draw: DrawPage,
    private readonly tracking: DrawTracking,
  ) {}

  /*
   * The query's own draw of an address. A load more that landed while it drew has more pages than it read for,
   * so the tree kept stands instead of the shorter one this draw would shrink it to.
   */
  public async refreshed(address: PageAddress): Promise<KeptPage> {
    const key = hashKey(treeKey(address));
    const epoch = this.tracking.epochOf(key);
    const answer = await this.redraw(address);

    return this.tracking.epochOf(key) === epoch
      ? answer
      : (this.client.getQueryData<KeptPage>(treeKey(address)) ?? answer);
  }

  /*
   * A load more or a pull: drawn outside the query's own fetch, so the cache tracks it. A mark that arrives
   * while it draws marks the tree again when it lands, and an optimistic patch made meanwhile is not painted over.
   */
  public async pages(address: PageAddress, how: HowDrawn): Promise<void> {
    const queryKey = treeKey(address);
    const key = hashKey(queryKey);

    this.tracking.begin(key);

    try {
      await this.paint(address, how);
    } finally {
      this.tracking.end(key);
    }

    if (this.tracking.takeMarked(key))
      void this.client.invalidateQueries(
        { queryKey, exact: true },
        { cancelRefetch: false },
      );
  }

  // The tree drawn, unless an optimistic patch or other pages landed meanwhile.
  private async paint(address: PageAddress, how: HowDrawn): Promise<void> {
    const queryKey = treeKey(address);
    const key = hashKey(queryKey);
    const epoch = this.tracking.epochOf(key);
    const answer = await this.redraw(address, how);

    if (this.tracking.epochOf(key) !== epoch) return;

    this.client.setQueryData(queryKey, answer);
    this.tracking.touch(key);
  }

  // The address drawn again, showing `pages` pages, or as many as it shows now; a pull reads the first page again.
  private async redraw(
    address: PageAddress,
    how: HowDrawn = {},
  ): Promise<KeptPage> {
    const before = this.client.getQueryData<KeptPage>(treeKey(address));
    const answer = await this.draw(requestOf(address, keptOf(before), how));

    return keptAfter(before, answer);
  }
}

import type { TreePatch } from '@repo/contracts/plugins/optimistic-tree';
import type {
  PageAddress,
  PageState,
  StaleMark,
} from '@repo/contracts/plugins/page-address';
import type { WireNode } from '@repo/contracts/plugins/wire';
import {
  hashKey,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import { AskedStates } from './asked-states';
import { DrawTracking } from './draw-tracking';
import { LiveBackoff } from './live-backoff';
import { followLive, type FollowPage } from './live-follow';
import { patchedAnswer, patchedAt, unpatchedAt } from './optimistic-patch';
import { keptOf, treePacing, type KeptPage, type Kept } from './page-answer';
import { stateKey, treeKey, type PageOpening } from './page-keys';
import { StaleMarker } from './stale-marker';
import { TreeDraws, type DrawPage } from './tree-draws';

export type { KeptPage } from './page-answer';

export type { PageOpening } from './page-keys';

type QueryOptions<Data> = { queryKey: QueryKey; queryFn: () => Promise<Data> };

type TreeOptions = QueryOptions<KeptPage> & typeof treePacing;

// Page state is never asked for: it is what the cache last remembered, or none.
type StateOptions = QueryOptions<PageState> & {
  initialData: () => PageState;
  staleTime: number;
};

const noState: PageState = {};

/*
 * Everything the App knows about its Page addresses (ADR-0050), kept in TanStack Query: each address's tree, hash
 * and page count, each page's Page state, and the draws in flight. A hook subscribes to an opening's Page state and
 * tree through it; a Page state change, a load more, a stale mark and an optimistic patch all go through it, so no
 * caller builds an address or a query key.
 */
export class PageAddresses {
  // How long each live page waits to be drawn again after its subscription failed.
  private readonly backoff = new LiveBackoff();
  private readonly asked = new AskedStates();
  private readonly tracking = new DrawTracking();
  private readonly draws: TreeDraws;
  private readonly marker: StaleMarker;

  public constructor(
    private readonly client: QueryClient,
    draw: DrawPage,
    private readonly follow: FollowPage,
  ) {
    this.draws = new TreeDraws(client, draw, this.tracking);
    this.marker = new StaleMarker(client, this.tracking);
  }

  // The Page state the opening shows, as a query only this cache writes.
  public state(opening: PageOpening): StateOptions {
    return {
      queryKey: stateKey(opening),
      queryFn: () => Promise.resolve(this.stateOf(opening)),
      initialData: () => this.stateOf(opening),
      staleTime: Number.POSITIVE_INFINITY,
    };
  }

  /*
   * The opening's tree at the Page state its caller read from `state`: a kept tree draws at once, a draw names the
   * hash and pages kept, and the tree draws again on its interval while subscribed. The Page state is an argument,
   * not read from the cache here, so options a render keeps change with the address.
   */
  public tree(opening: PageOpening, pageState: PageState): TreeOptions {
    return {
      ...this.treeAt(this.addressOf(opening, pageState)),
      ...treePacing,
    };
  }

  /*
   * The opening's live subscription, naming the tree kept, so its first answer may be `unchanged`; `again` is
   * asked when it must start over from a whole tree. The answer unsubscribes.
   */
  public followLive(opening: PageOpening, again: () => void): () => void {
    const address = this.addressOf(opening);

    return followLive({
      client: this.client,
      follow: this.follow,
      address,
      known: this.keptAt(address)?.hash,
      again,
      backoff: this.backoff,
    });
  }

  /*
   * The opening drawn at its next Page state, which it shows once drawn; an empty change is a pull, which reads the
   * first page again and keeps the pages already loaded.
   */
  public change(opening: PageOpening, change: PageState): Promise<void> {
    return Object.keys(change).length === 0
      ? this.draws.pages(this.addressOf(opening), { pull: true })
      : this.changeState(opening, change);
  }

  private async changeState(
    opening: PageOpening,
    change: PageState,
  ): Promise<void> {
    const key = hashKey(stateKey(opening));
    const next = this.asked.next(key, this.stateOf(opening), change);

    await this.fetchedAt(opening, key, next);

    // Only the Page state asked last is shown, whichever draw lands last.
    if (this.asked.landed(key, next))
      this.client.setQueryData(stateKey(opening), next);
  }

  // A draw that fails is no longer asked for, so the one asked before it can still be shown.
  private async fetchedAt(
    opening: PageOpening,
    key: string,
    next: PageState,
  ): Promise<void> {
    try {
      await this.client.fetchQuery(this.treeAt(this.addressOf(opening, next)));
    } catch (error) {
      this.asked.landed(key, next);

      throw error;
    }
  }

  // The tree the opening shows now, at its Page state, if one has drawn.
  public shown(opening: PageOpening): WireNode | undefined {
    return this.keptAt(this.addressOf(opening))?.root;
  }

  // One more page of the opening's paged list, appended to the tree kept.
  public async loadMore(opening: PageOpening): Promise<void> {
    const address = this.addressOf(opening);
    const kept = this.keptAt(address);

    if (kept) await this.draws.pages(address, { pages: kept.pages + 1 });
  }

  /*
   * The tree the opening shows now, patched at once, as an Operation call's optimistic props are; no other address
   * changes, since two never share a tree. Its draws in flight are cancelled first, so an answer read before the
   * Operation cannot paint over the patch.
   */
  public patch(opening: PageOpening, patch: TreePatch): Promise<void> {
    this.tracking.touch(treeKey(this.addressOf(opening)));

    return patchedAt(this.treeCache(opening), patchedAnswer(patch));
  }

  // The tree the opening shows now, with a patch of its own taken back off it; draws in flight are left to land.
  public unpatch(opening: PageOpening, patch: TreePatch): void {
    unpatchedAt(this.treeCache(opening), patchedAnswer(patch));
  }

  // The kept addresses a stale mark names are marked stale, or every one of the Plugin's when it names none.
  public markStale(mark: StaleMark): void {
    this.marker.mark(mark);
  }

  private treeCache(opening: PageOpening): TreeCache {
    return {
      client: this.client,
      queryKey: treeKey(this.addressOf(opening)),
    };
  }

  private stateOf(opening: PageOpening): PageState {
    return this.client.getQueryData<PageState>(stateKey(opening)) ?? noState;
  }

  private addressOf(
    opening: PageOpening,
    pageState = this.stateOf(opening),
  ): PageAddress {
    return { ...opening, pageState };
  }

  private keptAt(address: PageAddress): Kept | undefined {
    return keptOf(this.client.getQueryData<KeptPage>(treeKey(address)));
  }

  private treeAt(address: PageAddress): QueryOptions<KeptPage> {
    return {
      queryKey: treeKey(address),
      queryFn: () => this.draws.refreshed(address),
    };
  }
}

// A tree's place in the query cache.
type TreeCache = { client: QueryClient; queryKey: QueryKey };

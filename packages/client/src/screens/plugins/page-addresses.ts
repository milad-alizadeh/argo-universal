import type { TreePatch } from '@repo/contracts/plugins/optimistic-tree';
import type {
  PageAddress,
  PageState,
  StaleMark,
} from '@repo/contracts/plugins/page-address';
import type {
  DrawAnswer,
  DrawRequest,
} from '@repo/contracts/plugins/page-draw';
import type { WireNode } from '@repo/contracts/plugins/wire';
import {
  hashKey,
  type Query,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import { followLive, type FollowPage } from './live-follow';
import { patchedAnswer, patchedAt, unpatchedAt } from './optimistic-patch';
import {
  keptAfter,
  keptOf,
  shownOf,
  treePacing,
  type Answer,
  type Kept,
} from './page-answer';
import { staleFilters, stateKey, treeKey, type PageOpening } from './page-keys';

export type { Answer } from './page-answer';

export type { PageOpening } from './page-keys';

// The one call the cache makes: a draw of an address, naming what it keeps. tRPC in the App, a function in tests.
export type DrawPage = (request: DrawRequest) => Promise<DrawAnswer>;

type QueryOptions<Data> = { queryKey: QueryKey; queryFn: () => Promise<Data> };

type TreeOptions = QueryOptions<Answer> & typeof treePacing;

// Page state is never asked for: it is what the cache last remembered, or none.
type StateOptions = QueryOptions<PageState> & {
  initialData: () => PageState;
  staleTime: number;
};

const noState: PageState = {};

type HowDrawn = { pages?: number; pull?: true };

/*
 * Everything the App knows about its Page addresses (ADR-0050), kept in TanStack Query: each address's tree, hash
 * and page count, each page's Page state, and the draws in flight. A hook subscribes to an opening's Page state and
 * tree through it; a Page state change, a load more, a stale mark and an optimistic patch all go through it, so no
 * caller builds an address or a query key.
 */
export class PageAddresses {
  // The Page state last asked for each opening, which a change merges into and the last one asked leaves on landing.
  private readonly asked = new Map<string, PageState>();
  // The load mores and pulls drawing now, by tree: outside the query's own fetch, so the cache tracks them.
  private readonly drawing = new Set<string>();
  // The trees a stale mark named while they drew, to be marked again once the draw lands.
  private readonly marked = new Set<string>();
  // How often each tree was patched or had pages land, so a draw that began before cannot paint over either.
  private readonly epochs = new Map<string, number>();

  public constructor(
    private readonly client: QueryClient,
    private readonly draw: DrawPage,
    private readonly follow: FollowPage,
  ) {}

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
    });
  }

  /*
   * The opening drawn at its next Page state, which it shows once drawn; an empty change is a pull, which reads the
   * first page again and keeps the pages already loaded.
   */
  public async change(opening: PageOpening, change: PageState): Promise<void> {
    if (Object.keys(change).length === 0)
      return this.drawPages(this.addressOf(opening), { pull: true });

    const key = hashKey(stateKey(opening));
    const next = {
      ...(this.asked.get(key) ?? this.stateOf(opening)),
      ...change,
    };

    this.asked.set(key, next);

    try {
      await this.client.fetchQuery(this.treeAt(this.addressOf(opening, next)));
    } catch (error) {
      if (this.asked.get(key) === next) this.asked.delete(key);

      throw error;
    }

    // Only the Page state asked last is shown, whichever draw lands last.
    if (this.asked.get(key) !== next) return;

    this.asked.delete(key);
    this.client.setQueryData(stateKey(opening), next);
  }

  // The tree the opening shows now, at its Page state, if one has drawn.
  public shown(opening: PageOpening): WireNode | undefined {
    return this.keptAt(this.addressOf(opening))?.root;
  }

  // One more page of the opening's paged list, appended to the tree kept.
  public async loadMore(opening: PageOpening): Promise<void> {
    const address = this.addressOf(opening);
    const kept = this.keptAt(address);

    if (kept) await this.drawPages(address, { pages: kept.pages + 1 });
  }

  /*
   * The tree the opening shows now, patched at once, as an Operation call's optimistic props are; no other address
   * changes, since two never share a tree. Its draws in flight are cancelled first, so an answer read before the
   * Operation cannot paint over the patch.
   */
  public patch(opening: PageOpening, patch: TreePatch): Promise<void> {
    this.touch(treeKey(this.addressOf(opening)));

    return patchedAt(this.treeCache(opening), patchedAnswer(patch));
  }

  // The tree the opening shows now, with a patch of its own taken back off it; draws in flight are left to land.
  public unpatch(opening: PageOpening, patch: TreePatch): void {
    unpatchedAt(this.treeCache(opening), patchedAnswer(patch));
  }

  /*
   * The kept addresses a stale mark names are marked stale, or every one of the Plugin's when it names none; those
   * subscribed, on a focused screen, draw again now, the rest when they come back. A draw already running read
   * before the change, so it is left to finish and then marked again.
   */
  public markStale(mark: StaleMark): void {
    for (const filter of staleFilters(mark)) {
      for (const query of this.client.getQueryCache().findAll(filter))
        this.markWhenLanded(query);

      // A load more or pull drawing now read before the change; it is marked again when it lands.
      void this.client.invalidateQueries(
        {
          ...filter,
          predicate: ({ queryHash }) => !this.drawing.has(queryHash),
        },
        { cancelRefetch: false },
      );
    }
  }

  private markWhenLanded({ queryKey, promise, state, queryHash }: Query): void {
    if (this.drawing.has(queryHash)) this.marked.add(queryHash);

    if (state.fetchStatus !== 'fetching') return;

    const again = (): void =>
      void this.client.invalidateQueries(
        { queryKey, exact: true },
        { cancelRefetch: false },
      );

    void promise?.then(again, again);
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
    return keptOf(this.client.getQueryData<Answer>(treeKey(address)));
  }

  private treeAt(address: PageAddress): QueryOptions<Answer> {
    return {
      queryKey: treeKey(address),
      queryFn: () => this.refreshed(address),
    };
  }

  /*
   * The query's own draw of an address. A load more that landed while it drew has more pages than it read for,
   * so the tree kept stands instead of the shorter one this draw would shrink it to.
   */
  private async refreshed(address: PageAddress): Promise<Answer> {
    const key = hashKey(treeKey(address));
    const epoch = this.epochOf(key);
    const answer = await this.redraw(address);

    return this.epochOf(key) === epoch
      ? answer
      : (this.client.getQueryData<Answer>(treeKey(address)) ?? answer);
  }

  /*
   * A load more or a pull: drawn outside the query's own fetch, so the cache tracks it. A mark that arrives
   * while it draws marks the tree again when it lands, and an optimistic patch made meanwhile is not painted over.
   */
  private async drawPages(address: PageAddress, how: HowDrawn): Promise<void> {
    const queryKey = treeKey(address);
    const key = hashKey(queryKey);
    const epoch = this.epochOf(key);

    this.drawing.add(key);

    try {
      const answer = await this.redraw(address, how);

      if (this.epochOf(key) === epoch) {
        this.client.setQueryData(queryKey, answer);
        this.touch(key);
      }
    } finally {
      this.drawing.delete(key);
    }

    if (this.marked.delete(key))
      void this.client.invalidateQueries(
        { queryKey, exact: true },
        { cancelRefetch: false },
      );
  }

  private epochOf(key: string): number {
    return this.epochs.get(key) ?? 0;
  }

  private touch(key: string | QueryKey): void {
    const hashed = typeof key === 'string' ? key : hashKey(key);

    this.epochs.set(hashed, this.epochOf(hashed) + 1);
  }

  // The address drawn again, showing `pages` pages, or as many as it shows now; a pull reads the first page again.
  private async redraw(
    address: PageAddress,
    how: HowDrawn = {},
  ): Promise<Answer> {
    const before = this.client.getQueryData<Answer>(treeKey(address));
    const answer = await this.draw(requestOf(address, keptOf(before), how));

    return keptAfter(before, answer);
  }
}

// A tree's place in the query cache.
type TreeCache = { client: QueryClient; queryKey: QueryKey };

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

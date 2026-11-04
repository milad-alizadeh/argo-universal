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
import type { Query, QueryClient, QueryKey } from '@tanstack/react-query';
import { followLive, type FollowPage } from './live-follow';
import { patchedAnswer } from './optimistic-patch';
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

/*
 * Everything the App knows about its Page addresses (ADR-0050), kept in TanStack Query: each address's tree, hash
 * and page count, each page's Page state, and the draws in flight. A hook subscribes to an opening's Page state and
 * tree through it; a Page state change, a load more, a stale mark and an optimistic patch all go through it, so no
 * caller builds an address or a query key.
 */
export class PageAddresses {
  constructor(
    private readonly client: QueryClient,
    private readonly draw: DrawPage,
    private readonly follow: FollowPage,
  ) {}

  // The Page state the opening shows, as a query only this cache writes.
  state(opening: PageOpening): StateOptions {
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
  tree(opening: PageOpening, pageState: PageState): TreeOptions {
    return {
      ...this.treeAt(this.addressOf(opening, pageState)),
      ...treePacing,
    };
  }

  /*
   * The opening's live subscription, naming the tree kept, so its first answer may be `unchanged`; `again` is
   * asked when it must start over from a whole tree. The answer unsubscribes.
   */
  followLive(opening: PageOpening, again: () => void): () => void {
    const address = this.addressOf(opening);

    return followLive({
      client: this.client,
      follow: this.follow,
      address,
      known: this.keptAt(address)?.hash,
      again,
    });
  }

  // The opening drawn at its next Page state, which it shows once drawn; an empty change draws it again from page one.
  async change(opening: PageOpening, change: PageState): Promise<void> {
    if (Object.keys(change).length === 0)
      return this.drawPages(this.addressOf(opening), 1);

    const next = { ...this.stateOf(opening), ...change };

    await this.client.fetchQuery(this.treeAt(this.addressOf(opening, next)));
    this.client.setQueryData(stateKey(opening), next);
  }

  // The tree the opening shows now, at its Page state, if one has drawn.
  shown(opening: PageOpening): WireNode | undefined {
    return this.keptAt(this.addressOf(opening))?.root;
  }

  // One more page of the opening's paged list, appended to the tree kept.
  async loadMore(opening: PageOpening): Promise<void> {
    const address = this.addressOf(opening);
    const kept = this.keptAt(address);

    if (kept) await this.drawPages(address, kept.pages + 1);
  }

  /*
   * The tree the opening shows now, patched at once, as an Operation call's optimistic props are; no other address
   * changes, since two never share a tree. Its draws in flight are cancelled first, so an answer read before the
   * Operation cannot paint over the patch; the answer puts the tree back as it was.
   */
  async patch(
    opening: PageOpening,
    patch: (root: WireNode) => WireNode,
  ): Promise<() => void> {
    const queryKey = treeKey(this.addressOf(opening));

    await this.client.cancelQueries({ queryKey, exact: true });

    const before = this.client.getQueryData<Answer>(queryKey);

    this.client.setQueryData<Answer>(queryKey, patchedAnswer(patch));

    return () => this.client.setQueryData(queryKey, before);
  }

  /*
   * The kept addresses a stale mark names are marked stale, or every one of the Plugin's when it names none; those
   * subscribed, on a focused screen, draw again now, the rest when they come back. A draw already running read
   * before the change, so it is left to finish and then marked again.
   */
  markStale(mark: StaleMark): void {
    for (const filter of staleFilters(mark)) {
      for (const query of this.client.getQueryCache().findAll(filter))
        this.markWhenLanded(query);

      void this.client.invalidateQueries(filter, { cancelRefetch: false });
    }
  }

  private markWhenLanded({ queryKey, promise, state }: Query): void {
    if (state.fetchStatus !== 'fetching') return;

    const again = (): void =>
      void this.client.invalidateQueries(
        { queryKey, exact: true },
        { cancelRefetch: false },
      );

    void promise?.then(again, again);
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
    return { queryKey: treeKey(address), queryFn: () => this.drawn(address) };
  }

  private async drawPages(address: PageAddress, pages: number): Promise<void> {
    this.client.setQueryData(
      treeKey(address),
      await this.drawn(address, pages),
    );
  }

  // The address drawn again, showing `pages` pages, or as many as it shows now.
  private async drawn(address: PageAddress, pages?: number): Promise<Answer> {
    const before = this.client.getQueryData<Answer>(treeKey(address));
    const kept = keptOf(before);

    const answer = await this.draw({
      ...address,
      pages: pages ?? shownOf(kept),
      known: kept?.hash,
    });

    return keptAfter(before, answer);
  }
}

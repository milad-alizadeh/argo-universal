import type { StaleMark } from '@repo/contracts/plugins/page-address';
import type { Query, QueryClient } from '@tanstack/react-query';
import type { DrawTracking } from './draw-tracking';
import { staleFilters } from './page-keys';

// Marks the kept trees a stale mark names, leaving the draws that read before the change to land first.
export class StaleMarker {
  public constructor(
    private readonly client: QueryClient,
    private readonly tracking: DrawTracking,
  ) {}

  /*
   * The kept addresses a stale mark names are marked stale, or every one of the Plugin's when it names none; those
   * subscribed, on a focused screen, draw again now, the rest when they come back. A draw already running read
   * before the change, so it is left to finish and then marked again.
   */
  public mark(mark: StaleMark): void {
    for (const filter of staleFilters(mark)) {
      for (const query of this.client.getQueryCache().findAll(filter))
        this.markWhenLanded(query);

      // A load more or pull drawing now read before the change; it is marked again when it lands.
      void this.client.invalidateQueries(
        {
          ...filter,
          predicate: ({ queryHash }) => !this.tracking.isDrawing(queryHash),
        },
        { cancelRefetch: false },
      );
    }
  }

  private markWhenLanded(query: Query): void {
    this.tracking.markIfDrawing(query.queryHash);

    if (query.state.fetchStatus === 'fetching') this.invalidateAfter(query);
  }

  // A draw running read before the mark, so its tree is drawn again once it settles.
  private invalidateAfter({ queryKey, promise }: Query): void {
    const again = (): void =>
      void this.client.invalidateQueries(
        { queryKey, exact: true },
        { cancelRefetch: false },
      );

    void promise?.then(again, again);
  }
}

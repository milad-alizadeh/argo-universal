import type { PluginDataState } from '@repo/contracts/plugins/argo-calls';
import { PluginViewId } from '@repo/contracts/plugins/wire';
import type { QueryIntervals } from './query-intervals';
import {
  watchKey,
  type QueryOwner,
  type QueryPacing,
  type QueryServices,
  type QueryWatch,
} from './query-types';

type Registration = {
  viewId: PluginViewId;
  watchId: string;
  every?: number;
};

export class QueryWatchers {
  private readonly registrations = new Map<string, Registration>();

  constructor(
    private readonly owner: QueryOwner,
    private readonly services: Pick<QueryServices, 'send'>,
    private readonly intervals: QueryIntervals,
  ) {}

  add(request: QueryWatch): void {
    this.registrations.set(watchKey(request), {
      viewId: PluginViewId.parse(request.viewId),
      watchId: request.watchId,
      every: this.every(request.every),
    });
  }

  private every(every: number | undefined): number | undefined {
    if (this.owner.query.api === 'storage') return;

    return this.intervals.mounted(this.owner.pluginId, every);
  }

  remove(key: string): boolean {
    const removed = this.registrations.get(key);

    this.registrations.delete(key);

    return !this.active && untimed(removed);
  }

  has(key: string): boolean {
    return this.registrations.has(key);
  }

  keysForView(viewId: PluginViewId): string[] {
    return this.registrations
      .entries()
      .filter(([, value]) => value.viewId === viewId)
      .map(([key]) => key)
      .toArray();
  }

  get active(): boolean {
    return this.registrations.size > 0;
  }

  // Timing reads the three together, so it names one answer instead of reaching into the registrations.
  pacing(): QueryPacing {
    return {
      active: this.active,
      period: minimum(this.registrations.values().map(({ every }) => every)),
    };
  }

  publish(state: PluginDataState): void {
    for (const { viewId, watchId } of this.registrations.values())
      this.services.send(this.owner.pluginId, {
        type: 'data',
        viewId,
        watchId,
        state,
      });
  }

  close(): void {
    this.registrations.clear();
  }
}

function untimed(registration: Registration | undefined): boolean {
  if (!registration) return true;

  return registration.every === undefined;
}

function minimum(values: IteratorObject<number | undefined>): number {
  return Math.min(...values.filter((value) => value !== undefined));
}

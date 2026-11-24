import {
  readPlanContentRevision,
  type PlanUpdate,
  type SessionUpdate,
} from '@repo/contracts';
import { keepNewerRevisions } from './feed-revisions';
import type { FeedState } from './feed-state';

const isLater = (held: PlanUpdate, incoming: PlanUpdate): boolean =>
  held.id === incoming.id
    ? incoming.revision > held.revision
    : readPlanContentRevision(incoming) > readPlanContentRevision(held);

const asPlan = (row: SessionUpdate | undefined): PlanUpdate | null =>
  row?.sessionUpdate === 'plan_update' ? row : null;

const replaces = (held: PlanUpdate | null, incoming: PlanUpdate): boolean =>
  held === null || isLater(held, incoming);

// The Plan row to hold before the window: a newer revision of the same row, or another Plan with later content (ADR-0007).
export function laterPlan(
  held: PlanUpdate | null,
  incoming: SessionUpdate | undefined,
): PlanUpdate | null {
  const plan = asPlan(incoming);

  return plan && replaces(held, plan) ? plan : held;
}

// The rows the Feed view reads: the window, and the Plan held before it.
export function shownRows(
  feed: Pick<FeedState, 'rows' | 'plan'>,
): readonly SessionUpdate[] {
  return feed.plan ? keepNewerRevisions(feed.rows, [feed.plan]) : feed.rows;
}

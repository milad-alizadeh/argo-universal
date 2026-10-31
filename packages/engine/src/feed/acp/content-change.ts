import type { FeedChange, SessionUpdate } from '@repo/contracts';
import { applyFeedChange, type FeedChangeResult } from '../feed-change';
import { unfinishedTool } from '../turn-settlement';
import type { ContentAssemblyInput } from './assembly';

export const applyAcpContentChange = (
  input: ContentAssemblyInput,
  previous: SessionUpdate | undefined,
  change: FeedChange,
): FeedChangeResult =>
  applyFeedChange(
    input.feed,
    landsOutsideTurn(input, previous) ? settledChange(change) : change,
    input.turnId,
  );

const landsOutsideTurn = (
  input: ContentAssemblyInput,
  previous: SessionUpdate | undefined,
): boolean => (previous ? previous.turnId === null : input.turnId === null);

/*
 * ADR-0024 settles the rows of a Turn, so no Turn ending will ever settle a row that
 * belongs to none: content the Agent sends outside a Turn is written settled instead of
 * waiting for an ending that cannot come (#1669). A Tool call still running is left to
 * its own status, which settles the row when the Agent reports how it ended.
 */
const settledChange = (change: FeedChange): FeedChange =>
  change.type === 'upsert' && !unfinishedTool(change.update)
    ? { ...change, update: { ...change.update, state: 'settled' } }
    : change;

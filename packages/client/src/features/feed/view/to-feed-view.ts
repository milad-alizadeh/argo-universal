import {
  selectActivePlan,
  type SessionSnapshot,
  type SessionUpdate,
} from '@repo/contracts';
import type { FeedView, FeedViewItem } from './feed-view';
import { startsNewTurn } from './grouping-rules';
import { withoutRecordedAgentCalls } from './operation-pairs';
import { operationRecords, presentOperation } from './operation-records';
import { foldedPrompts } from './subagent-items';
import { translateTurn } from './translate-turn';

// What a Turn's items were drawn from, which says whether they are still right.
export interface TranslatedTurn {
  rows: readonly SessionUpdate[];
  // The Permission request the Turn's calls were told apart by.
  pendingToolCallId: string | undefined;
  subagents: SessionSnapshot['subagents'];
  // The Turn's Subagent prompts that were folded into their spawn.
  foldedIds: readonly string[];
  items: FeedViewItem[];
}

export interface TranslatedFeed {
  view: FeedView;
  // The Turns the view was translated from; a translator that draws every row each time has none.
  turns?: readonly TranslatedTurn[];
}

// A Turn's rows are a run of rows of one Turn: a Turn never groups with its neighbour (`startsNewTurn`).
function splitTurns(rows: readonly SessionUpdate[]): SessionUpdate[][] {
  const turns: SessionUpdate[][] = [];
  let previousTurnId: string | null | undefined;

  for (const row of rows) {
    if (startsNewTurn(row, previousTurnId) || !turns.length) turns.push([]);

    previousTurnId = row.turnId;
    turns.at(-1)?.push(row);
  }

  return turns;
}

const sameRows = (
  first: readonly SessionUpdate[],
  second: readonly SessionUpdate[],
): boolean =>
  first.length === second.length &&
  first.every((row, index) => row === second[index]);

const sameIds = (
  first: readonly string[],
  second: readonly string[],
): boolean =>
  first.length === second.length &&
  first.every((id, index) => id === second[index]);

function foldedIdsOf(
  rows: readonly SessionUpdate[],
  folded: ReadonlySet<string>,
): string[] {
  return folded.size
    ? rows.filter(({ id }) => folded.has(id)).map(({ id }) => id)
    : [];
}

function stillDrawn(
  previous: TranslatedTurn,
  next: Omit<TranslatedTurn, 'items'>,
): boolean {
  return (
    previous.pendingToolCallId === next.pendingToolCallId &&
    previous.subagents === next.subagents &&
    sameRows(previous.rows, next.rows) &&
    sameIds(previous.foldedIds, next.foldedIds)
  );
}

// An Operation call pairs with its record across the Turn's rows, even where another Turn's row stands between them, so it is read over every row; a row keeps its object unless its record changed it.
function presentedRows(
  rows: readonly SessionUpdate[],
  snapshot: SessionSnapshot,
): SessionUpdate[] {
  const paired = withoutRecordedAgentCalls(rows, snapshot);
  const records = operationRecords(paired);

  return paired.map((row) =>
    row.sessionUpdate === 'tool_call_update'
      ? presentOperation(row, records)
      : row,
  );
}

/*
 * The rows as the Feed draws them. A Turn whose rows, Permission request, Subagents and folded prompts are what the last draw held keeps that draw's items, so a streamed chunk translates the Turn it landed in, not the whole Feed. The reducer keeps every row it did not change as the same object.
 */
export function translateFeed(
  rows: readonly SessionUpdate[],
  snapshot: SessionSnapshot,
  previous: readonly TranslatedTurn[] = [],
): TranslatedFeed {
  const folded = foldedPrompts(rows);
  const shown = presentedRows(rows, snapshot);
  const held = new Map(previous.map((turn) => [turn.rows[0]?.id, turn]));

  const turns = splitTurns(shown).map((turnRows): TranslatedTurn => {
    const drawn = {
      rows: turnRows,
      pendingToolCallId: snapshot.pendingPermission?.toolCallId,
      subagents: snapshot.subagents,
      foldedIds: foldedIdsOf(turnRows, folded),
    };

    const kept = held.get(turnRows[0]?.id);

    if (kept && stillDrawn(kept, drawn)) return kept;

    return { ...drawn, items: translateTurn(turnRows, snapshot, folded) };
  });

  return {
    view: {
      items: turns.flatMap((turn) => turn.items),
      plan: selectActivePlan(rows),
    },
    turns,
  };
}

export const toFeedView = (
  rows: readonly SessionUpdate[],
  snapshot: SessionSnapshot,
): FeedView => translateFeed(rows, snapshot).view;

import type { SlotContextOf } from '@repo/contracts/plugins/wire';
import { sessionRowSlotId } from '@repo/contracts/plugins/wire';
import type { SlotItemsSnapshot } from '../hooks/use-slot-items';
import type { SentItems } from './slot-items';

// The Session row Slot's context names the Session a kept answer belongs to.
export type RowSnapshot = SlotItemsSnapshot<
  SlotContextOf<typeof sessionRowSlotId>
>;

// Each Session's last answer, kept while its row is out of the window the list asks about.
export type KeptAnswers = ReadonlyMap<string, SentItems>;

export const noKeptAnswers: KeptAnswers = new Map();

// A snapshot replaces the answers for the Sessions it was asked about, an unanswered one with none, and keeps the rest.
export function keptAnswers(
  kept: KeptAnswers,
  { contexts, items }: RowSnapshot,
): KeptAnswers {
  const next = new Map(kept);

  for (const { sessionId } of contexts) next.set(sessionId, items[sessionId]);

  return next;
}

// One row's content and the answers it was drawn from.
interface CachedRow<Row> {
  sent: string;
  row: Row | undefined;
}

export type RowCache<Row> = ReadonlyMap<string, CachedRow<Row>>;

export type DrawFromSent<Row> = (items: SentItems) => Row | undefined;

function cachedRow<Row>(
  previous: CachedRow<Row> | undefined,
  answer: SentItems,
  draw: DrawFromSent<Row>,
): CachedRow<Row> {
  // In an array, so no answer is kept as `null` rather than lost.
  const sent = JSON.stringify([answer]);

  if (previous?.sent === sent) return previous;

  return { sent, row: draw(answer) };
}

/*
 * Redraws only the rows whose answers changed: the others keep the very object they had, so a memoised row skips its
 * redraw when another Session's answer arrives.
 */
export function redrawnRows<Row>(
  previous: RowCache<Row>,
  kept: KeptAnswers,
  draw: DrawFromSent<Row>,
): RowCache<Row> {
  return new Map(
    [...kept].map(([id, answer]) => [
      id,
      cachedRow(previous.get(id), answer, draw),
    ]),
  );
}

// The rows with content, by Session id; a row with none stays Argo's own.
export const cachedRows = <Row>(
  cache: RowCache<Row>,
): ReadonlyMap<string, Row> =>
  new Map(
    [...cache].flatMap(([id, { row }]) =>
      row === undefined ? [] : [[id, row] as const],
    ),
  );

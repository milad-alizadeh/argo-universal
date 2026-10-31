import type { SlotContextOf } from '@repo/contracts/plugins/wire';
import { sessionRowSlotId } from '@repo/contracts/plugins/wire';
import type { SentItems } from './slot-items';
import type { SlotItemsSnapshot } from './use-slot-items';

// Both Session row Slots take the same context, so one Slot's names the Session a kept answer belongs to.
export type RowSnapshot = SlotItemsSnapshot<
  SlotContextOf<typeof sessionRowSlotId>
>;

// Each Session's last answer from one Slot, kept while its row is out of the window the list asks about.
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

// Both Slots' kept answers.
export interface KeptRowAnswers {
  items: KeptAnswers;
  lines: KeptAnswers;
}

// One row's content and the answers it was drawn from.
interface CachedRow<Row> {
  sent: string;
  row: Row | undefined;
}

export type RowCache<Row> = ReadonlyMap<string, CachedRow<Row>>;

export type DrawFromSent<Row> = (
  items: SentItems,
  lines: SentItems,
) => Row | undefined;

type SentPair = [items: SentItems, lines: SentItems];

const sentKey = (pair: SentPair): string =>
  JSON.stringify(pair.map((answer) => answer ?? null));

function cachedRow<Row>(
  previous: CachedRow<Row> | undefined,
  pair: SentPair,
  draw: DrawFromSent<Row>,
): CachedRow<Row> {
  const sent = sentKey(pair);

  if (previous?.sent === sent) return previous;

  return { sent, row: draw(...pair) };
}

const sentPair = (kept: KeptRowAnswers, id: string): SentPair => [
  kept.items.get(id),
  kept.lines.get(id),
];

/*
 * Redraws only the rows whose answers changed: the others keep the very object they had, so a memoised row skips its
 * redraw when another Session's answer arrives.
 */
export function redrawnRows<Row>(
  previous: RowCache<Row>,
  kept: KeptRowAnswers,
  draw: DrawFromSent<Row>,
): RowCache<Row> {
  const ids = new Set([...kept.items.keys(), ...kept.lines.keys()]);

  return new Map(
    [...ids].map((id) => [
      id,
      cachedRow(previous.get(id), sentPair(kept, id), draw),
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

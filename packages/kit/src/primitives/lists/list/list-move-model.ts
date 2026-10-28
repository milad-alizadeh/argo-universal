import type { ListMove } from '@repo/contracts/kit-moves';
import { z } from 'zod';
import { assertNever } from '#kit/assert-never';

const sectionKeys = z.string().brand<'ListSectionKey'>();

// A Section's place in the List as the List reads its children: kit-internal, and never the Section's `id`.
export type SectionKey = z.infer<typeof sectionKeys>;

export const sectionKey = (raw: string): SectionKey => sectionKeys.parse(raw);

const rowIds = z.string().brand<'ListRowId'>();

// A movable row's `id`, read from the row its owner wrote; the wire's ListMove carries it as a plain string.
export type RowId = z.infer<typeof rowIds>;

export const rowId = (raw: string): RowId => rowIds.parse(raw);

// A row's own `id`, as a ListItem or FieldGroup row takes it, read as a RowId.
export const rowIdOf = (raw: string | undefined): RowId | undefined =>
  raw === undefined ? undefined : rowId(raw);

const sectionIds = z.string().brand<'ListSectionId'>();

// A List.Section's `id`, read from the Section its owner wrote; never its place in the List (SectionKey).
export type SectionId = z.infer<typeof sectionIds>;

export const sectionId = (raw: string): SectionId => sectionIds.parse(raw);

// A List.Section's own `id`, as its owner writes it, read as a SectionId.
export const sectionIdOf = (raw: string | undefined): SectionId | undefined =>
  raw === undefined ? undefined : sectionId(raw);

// A move as the List makes it, its ids branded; the owner's `onMove` reads it as the wire's ListMove.
export interface RowMove extends ListMove {
  id: RowId;
  section?: SectionId;
}

/*
 * A List's movable rows, Section by Section, in the order it draws them. `key` is the Section's place in the List as
 * the List reads its children: rows, zones and lanes all name their Section by it. The rows outside any Section are one
 * Section of their own, without an id.
 */
export interface MoveSection {
  key: SectionKey;
  id?: SectionId;
  title?: string;
  rows: readonly RowId[];
}

export interface RowPlace {
  sectionKey: SectionKey;
  index: number;
}

// Where a row would go: before the row at `insertion` in the Section `sectionKey`, counted with the row still in place.
export interface DropPlace {
  sectionKey: SectionKey;
  insertion: number;
}

/*
 * What a menu entry, its shortcut, the Move to… picker or a drop asks of a row: a place up or down its Section, or a
 * place it is picked or dropped at. Each resolves against the order the List shows when it is made.
 */
export type MoveIntent =
  | { kind: 'step'; by: -1 | 1 }
  | { kind: 'place'; place: DropPlace };

// A move and what a screen reader hears once it is made.
export interface ResolvedMove {
  move: RowMove;
  notice: string;
}

// Where a row sits: its Section's position and the Section itself, and its index there.
export interface HeldPlace extends RowPlace {
  own: MoveSection;
}

interface Landing {
  target: MoveSection;
  index: number;
}

type Lander = (
  sections: readonly MoveSection[],
  place: HeldPlace,
) => Landing | undefined;

// Every row's place, read once for each order rather than searched for each row.
const placesBy = new WeakMap<readonly MoveSection[], Map<RowId, HeldPlace>>();

function placesOf(sections: readonly MoveSection[]): Map<RowId, HeldPlace> {
  const places = new Map<RowId, HeldPlace>();

  for (const own of sections)
    for (const [index, id] of own.rows.entries())
      places.set(id, { sectionKey: own.key, index, own });

  placesBy.set(sections, places);

  return places;
}

export const placeOf = (
  sections: readonly MoveSection[],
  id: RowId,
): HeldPlace | undefined =>
  (placesBy.get(sections) ?? placesOf(sections)).get(id);

const sectionAt = (
  sections: readonly MoveSection[],
  key: SectionKey,
): MoveSection | undefined => sections.find((section) => section.key === key);

const stepped =
  (by: -1 | 1): Lander =>
  (_sections, { own, index }) => {
    const next = index + by;

    return next >= 0 && next < own.rows.length
      ? { target: own, index: next }
      : undefined;
  };

const shifted = ({ index }: RowPlace, insertion: number): number =>
  insertion > index ? insertion - 1 : insertion;

// Leaving its slot moves every later row of its own Section up by one; landing back on that slot moves nothing.
function dropIndex(place: RowPlace, drop: DropPlace): number | undefined {
  if (place.sectionKey !== drop.sectionKey) return drop.insertion;

  const index = shifted(place, drop.insertion);

  return index === place.index ? undefined : index;
}

const placed =
  (drop: DropPlace): Lander =>
  (sections, place) => {
    const target = sectionAt(sections, drop.sectionKey);
    const index = dropIndex(place, drop);

    return target && index !== undefined
      ? { target, index: Math.min(index, target.rows.length) }
      : undefined;
  };

function landerOf(intent: MoveIntent): Lander {
  switch (intent.kind) {
    case 'step':
      return stepped(intent.by);
    case 'place':
      return placed(intent.place);
    default:
      return assertNever(intent);
  }
}

const moveIn = ({ target, index }: Landing, id: RowId): RowMove =>
  target.id === undefined ? { id, index } : { id, section: target.id, index };

// Where the row landed: its Section, by title, and its position there, counted from one.
function noticeOf({ target, index }: Landing): string {
  const position = `position ${index + 1}`;

  return target.title
    ? `Moved to ${target.title}, ${position}`
    : `Moved to ${position}`;
}

// The move an intent makes in `sections`, or none when the row is not there or would not move.
export function resolveMove(
  sections: readonly MoveSection[],
  id: RowId,
  intent: MoveIntent,
): ResolvedMove | undefined {
  const place = placeOf(sections, id);
  const landing = place && landerOf(intent)(sections, place);

  return landing && { move: moveIn(landing, id), notice: noticeOf(landing) };
}

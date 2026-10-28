import type { ReactNode } from 'react';
import type { Measured } from './list-drag-measure';
import { slideOffset, type Slide } from './list-drag-rules';
import {
  aimAt,
  type DropAim,
  type InsertionLine,
  type MoveLayout,
} from './list-drop-aim';
import type { Point, Rect } from './list-geometry';
import type { DropPlace } from './list-move-model';

// A lifted row, in the drag layer's own coordinates, and where it would land.
export interface DragFrame {
  id: string;
  ghost: ReactNode;
  source: Rect;
  line?: InsertionLine;
  place?: DropPlace;
  // How far each row and each Section header moves aside, where rows slide apart.
  rowSlides: ReadonlyMap<string, number>;
  zoneSlides: ReadonlyMap<string, number>;
}

export interface LiftedRow {
  id: string;
  ghost: ReactNode;
  // Where the pointer holds the row, from its top left.
  grab: Point;
}

export interface FrameInput {
  lift: LiftedRow;
  measured: Measured;
  layout: MoveLayout;
  point: Point;
  // The rows slide apart: only then does a frame say how far each one moves.
  slides: boolean;
}

const shifted = <At extends Point>(at: At, by: Point): At => ({
  ...at,
  x: at.x - by.x,
  y: at.y - by.y,
});

// Where the pointer holds a row it took at `start`, from the row's top left.
export const grabOf = (start: Point, source: Rect): Point =>
  shifted(start, source);

// Where the lifted copy draws in the drag layer, so the pointer keeps its hold on it.
export const ghostPoint = (
  point: Point,
  { grab }: LiftedRow,
  layer: Rect,
): Point => shifted(shifted(point, grab), layer);

const aimed = (
  aim: DropAim | undefined,
  layer: Rect,
): Pick<DragFrame, 'line' | 'place'> =>
  aim ? { place: aim.place, line: shifted(aim.line, layer) } : {};

const slideFor = (source: Rect, aim: DropAim | undefined): Slide => ({
  sourceTop: source.y,
  height: source.height,
  lineY: aim?.line.y,
});

// How far each item moves aside, by the key it is drawn under.
const offsetsOf = <Item extends { rect: Rect }>(
  items: readonly Item[],
  keyOf: (item: Item) => string,
  slide: Slide,
): Map<string, number> =>
  new Map(items.map((item) => [keyOf(item), slideOffset(slide, item.rect.y)]));

const still: Pick<DragFrame, 'rowSlides' | 'zoneSlides'> = {
  rowSlides: new Map(),
  zoneSlides: new Map(),
};

const slides = (
  { rows, zones }: Measured,
  slide: Slide,
): Pick<DragFrame, 'rowSlides' | 'zoneSlides'> => ({
  rowSlides: offsetsOf(rows, (row) => row.id, slide),
  zoneSlides: offsetsOf(zones, (zone) => zone.sectionKey, slide),
});

const slidesFor = (
  input: FrameInput,
  aim: DropAim | undefined,
): Pick<DragFrame, 'rowSlides' | 'zoneSlides'> =>
  input.slides
    ? slides(input.measured, slideFor(input.measured.source, aim))
    : still;

// What a drag draws for the pointer at `point`: the lifted row, its insertion line, and the rows moved aside.
export function dragFrame(input: FrameInput): DragFrame {
  const { lift, measured } = input;
  const { source, layer } = measured;
  const aim = aimAt({ ...input.layout, ...measured, point: input.point });

  return {
    id: lift.id,
    ghost: lift.ghost,
    source: shifted(source, layer),
    ...aimed(aim, layer),
    ...slidesFor(input, aim),
  };
}

const placeKeys: readonly (keyof DropPlace)[] = ['sectionKey', 'insertion'];

const lineKeys: readonly (keyof InsertionLine)[] = ['x', 'y', 'width'];

const frameKeys: readonly (keyof DragFrame)[] = ['id'];

// Two values agree on every one of `keys`; two missing values agree too.
const sameFields = <Value extends object>(
  a: Value | undefined,
  b: Value | undefined,
  keys: readonly (keyof Value)[],
): boolean => keys.every((key) => a?.[key] === b?.[key]);

const sameParts = (a: DragFrame, b: DragFrame): boolean =>
  [
    sameFields(a, b, frameKeys),
    sameFields(a.place, b.place, placeKeys),
    sameFields(a.line, b.line, lineKeys),
  ].every(Boolean);

// The same lifted row aiming at the same place draws the same frame.
export const sameFrame = (a: DragFrame | undefined, b: DragFrame): boolean =>
  a !== undefined && sameParts(a, b);

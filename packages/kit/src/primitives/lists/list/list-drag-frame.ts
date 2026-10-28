import type { ReactNode } from 'react';
import type { Measured } from './list-drag-measure';
import { slideOffset, type Slide } from './list-drag-rules';
import {
  aimAt,
  type DropAim,
  type InsertionLine,
  type Point,
  type Rect,
} from './list-drop-aim';
import type { DropPlace, MoveSection } from './list-move-model';

// A lifted row, in the drag layer's own coordinates, and where it would land.
export interface DragFrame {
  id: string;
  ghost: ReactNode;
  source: Rect;
  line?: InsertionLine;
  place?: DropPlace;
  // How far each row and each Section header moves aside, where rows slide apart.
  rowSlides: ReadonlyMap<string, number>;
  zoneSlides: ReadonlyMap<number, number>;
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
  sections: readonly MoveSection[];
  lanes: boolean;
  point: Point;
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

function slides(
  { rows, zones }: Measured,
  slide: Slide,
): Pick<DragFrame, 'rowSlides' | 'zoneSlides'> {
  return {
    rowSlides: new Map(
      rows.map(({ id, rect }) => [id, slideOffset(slide, rect.y)]),
    ),
    zoneSlides: new Map(
      zones.map(({ section, rect }) => [section, slideOffset(slide, rect.y)]),
    ),
  };
}

// What a drag draws for the pointer at `point`: the lifted row, its insertion line, and the rows moved aside.
export function dragFrame({
  lift,
  measured,
  ...aiming
}: FrameInput): DragFrame {
  const { source, layer } = measured;
  const aim = aimAt({ ...aiming, ...measured });

  return {
    id: lift.id,
    ghost: lift.ghost,
    source: shifted(source, layer),
    ...aimed(aim, layer),
    ...slides(measured, slideFor(source, aim)),
  };
}

const frameKey = (frame: DragFrame): string =>
  JSON.stringify([frame.id, frame.place, frame.line]);

// The same lifted row aiming at the same place draws the same frame.
export const sameFrame = (a: DragFrame | undefined, b: DragFrame): boolean =>
  a !== undefined && frameKey(a) === frameKey(b);

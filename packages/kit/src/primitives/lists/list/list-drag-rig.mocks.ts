import type { ListMove } from '@repo/contracts/kit-moves';
import { vi, type Mock } from 'vitest';
import { ListDrag } from './list-drag-controller';
import type { DragFrame } from './list-drag-frame';
import type { Point, Rect } from './list-geometry';
import {
  sectionKey,
  type DropPlace,
  type MoveSection,
  type SectionKey,
} from './list-move-model';
import type { Schedule } from './list-next-frame';

export const todoKey = sectionKey('todo-lane');

export const doingKey = sectionKey('doing-lane');

export const doneKey = sectionKey('done-lane');

export const board: MoveSection[] = [
  { key: todoKey, id: 'todo', title: 'To do', rows: ['login', 'docs'] },
  { key: doingKey, id: 'doing', title: 'Doing', rows: ['search'] },
  { key: doneKey, id: 'done', title: 'Done', rows: [] },
];

// The drag layer sits at (10, 20); everything the drag draws is relative to it.
export const layer: Rect = { x: 10, y: 20, width: 700, height: 600 };

export interface Rig {
  drag: ListDrag;
  move: Mock<(move: ListMove) => void>;
  ghost: Point[];
  frames: (() => void)[];
}

// Queues each frame the drag asks for, for a test to run.
const queued =
  (frames: (() => void)[]): Schedule =>
  (step) => {
    frames.push(step);

    return (): void => {};
  };

export function rigFor(sections: readonly MoveSection[], lanes: boolean): Rig {
  const ghost: Point[] = [];
  const frames: (() => void)[] = [];
  const move = vi.fn<(move: ListMove) => void>();

  const drag = new ListDrag(
    async () => layer,
    { sections, lanes, move: (resolved): void => move(resolved.move) },
    {
      ghostAt: (point): number => ghost.push(point),
      slides: true,
      schedule: queued(frames),
    },
  );

  return { drag, move, ghost, frames };
}

// Three lanes 200 wide, 20 apart; rows 50 tall, 10 apart, from y 60.
const laneRect = (lane: number): Rect => ({
  x: 10 + lane * 220,
  y: 20,
  width: 200,
  height: 600,
});

export const cardRect = (lane: number, index: number): Rect => ({
  x: 10 + lane * 220,
  y: 60 + index * 60,
  width: 200,
  height: 50,
});

export function boardRig(): Rig {
  const rig = rigFor(board, true);

  for (const [lane, section] of board.entries()) {
    rig.drag.registry.registerZone(section.key, async () => ({
      rect: laneRect(lane),
      start: 60,
    }));

    for (const [index, id] of section.rows.entries())
      rig.drag.registry.registerRow(id, async () => cardRect(lane, index));
  }

  return rig;
}

// One column: To do's header at y 20, its rows at 50 and 110; Doing's header at 170, its row at 200.
const columnRows: [string, number][] = [
  ['login', 50],
  ['docs', 110],
  ['search', 200],
];

const headers: [SectionKey, number][] = [
  [todoKey, 20],
  [doingKey, 170],
];

const across = (y: number, height: number): Rect => ({
  x: 10,
  y,
  width: 300,
  height,
});

export function columnRig(): Rig {
  const rig = rigFor(board.slice(0, 2), false);

  for (const [key, y] of headers)
    rig.drag.registry.registerZone(key, async () => ({
      rect: across(y, 30),
      start: y + 30,
    }));

  for (const [id, y] of columnRows)
    rig.drag.registry.registerRow(id, async () => across(y, 50));

  return rig;
}

export const settle = (): Promise<void> =>
  new Promise((done) => setTimeout(done));

// Where the pointer takes the first card, To do's Login: 20 in and 10 down.
export const fromLogin: Point = { x: 30, y: 70 };

export async function lifted(
  rig: Rig,
  id: string,
  start: Point,
): Promise<ListDrag> {
  rig.drag.begin(id, null, start);
  await settle();

  return rig.drag;
}

// Where the lifted row would land, as the drag last drew it.
export const placeIn = (drag: ListDrag): DropPlace | undefined =>
  drag.current()?.place;

const noSlides: Pick<DragFrame, 'rowSlides' | 'zoneSlides'> = {
  rowSlides: new Map(),
  zoneSlides: new Map(),
};

// How far each row and Section header moves aside, as the drag last drew it.
export const slidesIn = (
  drag: ListDrag,
): Pick<DragFrame, 'rowSlides' | 'zoneSlides'> => drag.current() ?? noSlides;

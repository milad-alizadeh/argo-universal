import { expect, it, vi } from 'vitest';
import { ListDrag, type DragScroller } from './list-drag-controller';
import type { Point, Rect } from './list-drop-aim';
import type { MoveSection } from './list-move-model';

const board: MoveSection[] = [
  { id: 'todo', title: 'To do', rows: ['login', 'docs'] },
  { id: 'doing', title: 'Doing', rows: ['search'] },
  { id: 'done', title: 'Done', rows: [] },
];

// Three lanes 200 wide, 20 apart, inside a layer at (10, 20); rows 50 tall, 10 apart, from y 60.
const layer: Rect = { x: 10, y: 20, width: 700, height: 600 };
const laneRect = (section: number): Rect => ({
  x: 10 + section * 220,
  y: 20,
  width: 200,
  height: 600,
});
const cardRect = (section: number, index: number): Rect => ({
  x: 10 + section * 220,
  y: 60 + index * 60,
  width: 200,
  height: 50,
});

interface Rig {
  drag: ListDrag;
  move: ReturnType<typeof vi.fn>;
  ghost: Point[];
  frames: (() => void)[];
}

function rig(): Rig {
  const ghost: Point[] = [];
  const frames: (() => void)[] = [];
  const drag = new ListDrag(
    async () => layer,
    (point) => ghost.push(point),
    (step) => {
      frames.push(step);

      return () => {};
    },
  );
  const move = vi.fn();

  drag.configure({ sections: board, lanes: true, move });

  for (const [section, lane] of board.entries()) {
    drag.registerZone(section, async () => ({
      rect: laneRect(section),
      start: 60,
    }));

    for (const [index, id] of lane.rows.entries())
      drag.registerRow(id, async () => cardRect(section, index));
  }

  return { drag, move, ghost, frames };
}

const settle = (): Promise<void> => new Promise((done) => setTimeout(done));

it('reports a row dropped in another lane where it lands', async () => {
  const { drag, move } = rig();

  drag.begin('login', null, { x: 30, y: 70 });
  await settle();
  drag.follow({ x: 500, y: 100 });
  drag.finish();

  expect(move).toHaveBeenCalledWith({ id: 'login', section: 'done', index: 0 });
});

it('draws the insertion line and the lifted row in the layer while it is dragged', async () => {
  const { drag, ghost } = rig();

  drag.begin('login', null, { x: 30, y: 70 });
  await settle();
  drag.follow({ x: 260, y: 200 });

  // The grab sat 20 in and 10 down the card, so the card's corner follows the pointer at that distance.
  expect(ghost.at(-1)).toEqual({ x: 260 - 20 - 10, y: 200 - 10 - 20 });
  expect(drag.current()).toMatchObject({
    id: 'login',
    place: { section: 1, insertion: 1 },
    line: { x: 220, y: 90, width: 200 },
  });
});

it('reports nothing when a row is dropped back on its slot, or the drag is cancelled', async () => {
  const { drag, move } = rig();

  drag.begin('docs', null, { x: 30, y: 130 });
  await settle();
  drag.follow({ x: 30, y: 135 });
  drag.finish();

  drag.begin('docs', null, { x: 30, y: 130 });
  await settle();
  drag.follow({ x: 500, y: 100 });
  drag.cancel();

  expect(move).not.toHaveBeenCalled();
  expect(drag.current()).toBeUndefined();
});

it('drops a row released before its List is measured once it is', async () => {
  const { drag, move } = rig();

  drag.begin('login', null, { x: 30, y: 70 });
  drag.follow({ x: 500, y: 100 });
  drag.finish();

  expect(move).not.toHaveBeenCalled();
  await settle();
  expect(move).toHaveBeenCalledWith({ id: 'login', section: 'done', index: 0 });
  expect(drag.current()).toBeUndefined();
});

it('reports nothing for a drag cancelled before its List is measured', async () => {
  const { drag, move } = rig();

  drag.begin('login', null, { x: 30, y: 70 });
  drag.follow({ x: 500, y: 100 });
  drag.cancel();
  await settle();

  expect(move).not.toHaveBeenCalled();
  expect(drag.current()).toBeUndefined();
});

it('scrolls a scroller while the pointer holds near its edge', async () => {
  const { drag, frames } = rig();
  const scrollBy = vi.fn();
  const board: DragScroller = {
    axis: 'x',
    measure: async () => layer,
    scrollBy,
  };

  drag.registerScroller(board);
  drag.begin('login', null, { x: 30, y: 70 });
  await settle();
  drag.follow({ x: 700, y: 300 });
  frames.at(-1)?.();

  expect(scrollBy).toHaveBeenCalledWith(expect.any(Number));
  expect(scrollBy.mock.calls[0]?.[0]).toBeGreaterThan(0);

  drag.follow({ x: 300, y: 300 });
  scrollBy.mockClear();
  frames.at(-1)?.();

  expect(scrollBy).not.toHaveBeenCalled();
});

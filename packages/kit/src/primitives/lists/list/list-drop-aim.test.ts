import { expect, it } from 'vitest';
import { aimAt, type MeasuredRow, type MeasuredZone } from './list-drop-aim';
import type { MoveSection } from './list-move-model';

const board: MoveSection[] = [
  { id: 'todo', title: 'To do', rows: ['login', 'docs'] },
  { id: 'doing', title: 'Doing', rows: ['search'] },
  { id: 'done', title: 'Done', rows: [] },
];

// Three lanes, 200 wide and 20 apart; each lane's rows start at y 40 and are 50 tall, 10 apart.
const lane = (section: number): MeasuredZone => ({
  section,
  rect: { x: section * 220, y: 40, width: 200, height: 500 },
  start: 40,
});

const card = (id: string, section: number, index: number): MeasuredRow => ({
  id,
  rect: { x: section * 220, y: 40 + index * 60, width: 200, height: 50 },
});

const lanes = {
  sections: board,
  lanes: true,
  zones: [lane(0), lane(1), lane(2)],
  rows: [card('login', 0, 0), card('docs', 0, 1), card('search', 1, 0)],
};

it('aims at the lane under the pointer and the row whose middle is below it', () => {
  expect(aimAt({ ...lanes, point: { x: 250, y: 50 } })).toEqual({
    place: { section: 1, insertion: 0 },
    line: { x: 220, y: 40, width: 200 },
  });
});

it('aims after the last row of a lane when the pointer is below its rows', () => {
  expect(aimAt({ ...lanes, point: { x: 10, y: 400 } })).toEqual({
    place: { section: 0, insertion: 2 },
    line: { x: 0, y: 150, width: 200 },
  });
});

it('aims between two rows halfway across the gap', () => {
  expect(aimAt({ ...lanes, point: { x: 10, y: 80 } })?.line.y).toBe(95);
});

it('aims at the top of an empty lane', () => {
  expect(aimAt({ ...lanes, point: { x: 500, y: 300 } })).toEqual({
    place: { section: 2, insertion: 0 },
    line: { x: 440, y: 40, width: 200 },
  });
});

it('aims at the nearest lane when the pointer is between or past the lanes', () => {
  expect(aimAt({ ...lanes, point: { x: 900, y: 50 } })?.place.section).toBe(2);
});

// One column: To do's header at y 0, its rows at 30 and 90; Doing's header at 150, its row at 180.
const column = {
  sections: board.slice(0, 2),
  lanes: false,
  zones: [
    { section: 0, rect: { x: 0, y: 0, width: 300, height: 30 }, start: 30 },
    { section: 1, rect: { x: 0, y: 150, width: 300, height: 30 }, start: 180 },
  ],
  rows: [
    { id: 'login', rect: { x: 0, y: 30, width: 300, height: 50 } },
    { id: 'docs', rect: { x: 0, y: 90, width: 300, height: 50 } },
    { id: 'search', rect: { x: 0, y: 180, width: 300, height: 50 } },
  ],
};

it('aims at the end of a Section when the pointer is past its last row but above the next header', () => {
  expect(aimAt({ ...column, point: { x: 10, y: 145 } })?.place).toEqual({
    section: 0,
    insertion: 2,
  });
});

it('aims at the top of a Section when the pointer is over its header', () => {
  expect(aimAt({ ...column, point: { x: 10, y: 160 } })).toEqual({
    place: { section: 1, insertion: 0 },
    line: { x: 0, y: 180, width: 300 },
  });
});

it('aims at the first Section when the pointer is above everything', () => {
  expect(aimAt({ ...column, point: { x: 10, y: -40 } })?.place).toEqual({
    section: 0,
    insertion: 0,
  });
});

it('aims nowhere when nothing is measured', () => {
  expect(
    aimAt({ ...column, zones: [], rows: [], point: { x: 0, y: 0 } }),
  ).toBeUndefined();
});

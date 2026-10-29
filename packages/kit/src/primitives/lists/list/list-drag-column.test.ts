import { describe, expect, it } from 'vitest';
import {
  columnRig,
  doingKey,
  fromLogin,
  lifted,
  placeIn,
  slidesIn,
  todoKey,
} from './list-drag-rig.mocks';
import type { Point } from './list-geometry';

const fromSearch: Point = { x: 30, y: 210 };

const pastToDo: Point = { x: 30, y: 165 };

const aboveAll: Point = { x: 30, y: -20 };

describe('dragging a row in one column', () => {
  it('aims at the end of a Section when the pointer is past its last row but above the next header', async () => {
    const drag = await lifted(columnRig(), 'login', fromLogin);

    drag.follow(pastToDo);

    expect(placeIn(drag)).toEqual({ sectionKey: todoKey, insertion: 2 });
  });

  it('aims at the top of a Section when the pointer is over its header', async () => {
    const drag = await lifted(columnRig(), 'login', fromLogin);

    drag.follow({ x: 30, y: 180 });

    expect(drag.current()).toMatchObject({
      place: { sectionKey: doingKey, insertion: 0 },
      line: { x: 0, y: 180, width: 300 },
    });
  });

  it('aims at the first Section when the pointer is above everything', async () => {
    const drag = await lifted(columnRig(), 'search', fromSearch);

    drag.follow(aboveAll);

    expect(placeIn(drag)).toEqual({ sectionKey: todoKey, insertion: 0 });
  });

  it('slides the rows between the lifted row and a lower drop up into its slot', async () => {
    const drag = await lifted(columnRig(), 'login', fromLogin);

    drag.follow(pastToDo);

    const { rowSlides, zoneSlides } = slidesIn(drag);

    expect([rowSlides.get('docs'), rowSlides.get('search')]).toEqual([-50, 0]);
    expect(zoneSlides.get(doingKey)).toBe(0);
  });

  it('slides the rows and headers between a higher drop and the lifted row down to open a slot', async () => {
    const drag = await lifted(columnRig(), 'search', fromSearch);

    drag.follow(aboveAll);

    const { rowSlides, zoneSlides } = slidesIn(drag);

    expect(rowSlides.get('login')).toBe(50);
    expect(zoneSlides.get(doingKey)).toBe(50);
  });
});

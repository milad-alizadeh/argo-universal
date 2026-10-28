import { describe, expect, it } from 'vitest';
import {
  board,
  boardRig,
  cardRect,
  doingKey,
  doneKey,
  fromLogin,
  lifted,
  placeIn,
  rigFor,
  settle,
  todoKey,
} from './list-drag-rig.mocks';

const toDone = { id: 'login', section: 'done', index: 0 };

describe('dragging a row on a board', () => {
  it('reports a row dropped in another lane where it lands', async () => {
    const rig = boardRig();
    const drag = await lifted(rig, 'login', fromLogin);

    drag.follow({ x: 500, y: 100 });
    drag.finish();

    expect(rig.move).toHaveBeenCalledWith(toDone);
  });

  it('draws the lifted row in the layer where the pointer holds it', async () => {
    const rig = boardRig();
    const drag = await lifted(rig, 'login', fromLogin);

    drag.follow({ x: 260, y: 70 });

    // The grab sat 20 in and 10 down the card, so the card's corner follows the pointer at that distance.
    expect(rig.ghost.at(-1)).toEqual({ x: 260 - 20 - 10, y: 70 - 10 - 20 });
  });

  it('aims before the row whose middle is below the pointer, and draws its line in the layer', async () => {
    const drag = await lifted(boardRig(), 'login', fromLogin);

    drag.follow({ x: 260, y: 70 });

    expect(drag.current()).toMatchObject({
      place: { sectionKey: doingKey, insertion: 0 },
      line: { x: 220, y: 40, width: 200 },
    });
  });

  it('aims after the last row of a lane when the pointer is below its rows', async () => {
    const drag = await lifted(boardRig(), 'login', fromLogin);

    drag.follow({ x: 30, y: 400 });

    expect(drag.current()).toMatchObject({
      place: { sectionKey: todoKey, insertion: 2 },
      line: { x: 0, y: 150, width: 200 },
    });
  });

  it('draws the line halfway across the gap between two rows', async () => {
    const drag = await lifted(boardRig(), 'login', fromLogin);

    drag.follow({ x: 30, y: 100 });

    expect(drag.current()).toMatchObject({ line: { y: 95 } });
  });

  it('aims at the top of an empty lane', async () => {
    const drag = await lifted(boardRig(), 'login', fromLogin);

    drag.follow({ x: 500, y: 300 });

    expect(drag.current()).toMatchObject({
      place: { sectionKey: doneKey, insertion: 0 },
      line: { x: 440, y: 40, width: 200 },
    });
  });

  it('aims at the nearest lane when the pointer is past the lanes', async () => {
    const drag = await lifted(boardRig(), 'login', fromLogin);

    drag.follow({ x: 900, y: 70 });

    expect(placeIn(drag)).toEqual({ sectionKey: doneKey, insertion: 0 });
  });

  it('reports nothing when a row is dropped back on its slot', async () => {
    const rig = boardRig();
    const drag = await lifted(rig, 'docs', { x: 30, y: 130 });

    drag.follow({ x: 30, y: 135 });
    drag.finish();

    expect(rig.move).not.toHaveBeenCalled();
  });

  it('reports nothing for a cancelled drag, and draws nothing after it', async () => {
    const rig = boardRig();
    const drag = await lifted(rig, 'docs', { x: 30, y: 130 });

    drag.follow({ x: 500, y: 100 });
    drag.cancel();

    expect(rig.move).not.toHaveBeenCalled();
    expect(drag.current()).toBeUndefined();
  });

  it('drops nothing where no Section is measured', async () => {
    const rig = rigFor(board, true);

    rig.drag.registry.registerRow('login', async () => cardRect(0, 0));
    const drag = await lifted(rig, 'login', fromLogin);

    drag.follow({ x: 500, y: 100 });
    drag.finish();

    expect(rig.move).not.toHaveBeenCalled();
  });
});

describe('a drag before its List is measured', () => {
  it('drops a row released before its List is measured once it is', async () => {
    const { drag, move } = boardRig();

    drag.begin('login', null, fromLogin);
    drag.follow({ x: 500, y: 100 });
    drag.finish();
    await settle();

    expect(move).toHaveBeenCalledWith(toDone);
  });

  it('draws a row lifted from a measured press from its first move', async () => {
    const { drag, ghost } = boardRig();

    drag.prepare('login');
    await settle();
    drag.begin('login', null, fromLogin);
    drag.follow({ x: 260, y: 200 });

    expect(ghost.at(-1)).toEqual({ x: 260 - 20 - 10, y: 200 - 10 - 20 });
  });

  it('reports nothing for a drag cancelled before its List is measured', async () => {
    const { drag, move } = boardRig();

    drag.begin('login', null, fromLogin);
    drag.follow({ x: 500, y: 100 });
    drag.cancel();
    await settle();

    expect(move).not.toHaveBeenCalled();
  });
});

import { describe, expect, it } from 'vitest';
import type { DragScroller } from './list-drag-measure';
import {
  boardRig,
  fromLogin,
  layer,
  lifted,
  type Rig,
} from './list-drag-rig.mocks';

// The scroll loop's latest step, as the next animation frame runs it.
const nextFrame = (frames: readonly (() => void)[]): void => frames.at(-1)?.();

interface Scrolling {
  rig: Rig;
  deltas: number[];
}

// A board with one scroller across the layer, recording each step it scrolls.
function scrolling(): Scrolling {
  const rig = boardRig();
  const deltas: number[] = [];

  const scroller: DragScroller = {
    axis: 'x',
    measure: async () => layer,
    scrollBy: (delta) => deltas.push(delta),
  };

  rig.drag.registerScroller(scroller);

  return { rig, deltas };
}

const nearEnd = { x: 700, y: 300 };

describe('scrolling while a row is dragged', () => {
  it('scrolls a scroller toward the edge the pointer holds near', async () => {
    const { rig, deltas } = scrolling();
    const drag = await lifted(rig, 'login', fromLogin);

    drag.follow(nearEnd);
    nextFrame(rig.frames);

    expect(Math.min(...deltas)).toBeGreaterThan(0);
  });

  it('stops scrolling once the pointer leaves the edge', async () => {
    const { rig, deltas } = scrolling();
    const drag = await lifted(rig, 'login', fromLogin);

    drag.follow(nearEnd);
    nextFrame(rig.frames);
    drag.follow({ x: 300, y: 300 });
    deltas.splice(0);
    nextFrame(rig.frames);

    expect(deltas).toEqual([]);
  });
});

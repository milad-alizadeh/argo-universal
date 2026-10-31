import { nextFrames } from '#mocks/next-frames';

export interface VirtualWall {
  // The scroller the wall is drawn in.
  scroller: HTMLElement;
  // The tiles drawn so far, and the charts drawn in them.
  tiles: () => Element[];
  charts: () => Element[];
  // The most charts the wall draws at once, which stops short of a chart on every tile.
  budget: number;
}

/*
 * The story-test driver for a virtualised wall's first draw, to await before reading its charts with a synchronous
 * query. A virtualised list draws no tiles until it has measured its scroller, then fills the window it measured and
 * draws a chart in each tile that shows: how long that takes depends on how busy the runner is, so a read with a clock
 * of its own can come first. The wall is drawn once every tile in view has its chart, up to the budget, which is the
 * state the reader needs, and the story's own deadline bounds the wait.
 */
export async function settleVirtualWall(wall: VirtualWall): Promise<void> {
  while (!isDrawn(wall)) await nextFrames();
}

/*
 * Scrolls a virtualised wall to its end and waits until it has drawn there. Tiles measure as they are drawn, so the
 * wall's length can still change after a scroll, and each frame scrolls to the end it has now. `ready` names what the reader goes on to read, so a chart still handed over after the scroll is waited for.
 */
export async function settleVirtualWallAtEnd(
  wall: VirtualWall,
  ready: () => boolean,
): Promise<void> {
  while (!(await scrolledAndDrawn(wall, ready))) continue;
}

async function scrolledAndDrawn(
  wall: VirtualWall,
  ready: () => boolean,
): Promise<boolean> {
  wall.scroller.scrollTo({ top: wall.scroller.scrollHeight });
  await nextFrames();

  return atEnd(wall.scroller) && isDrawn(wall) && ready();
}

function isDrawn(wall: VirtualWall): boolean {
  const view = inView(wall.scroller);
  const tiles = wall.tiles().filter(view).length;

  return (
    tiles > 0 &&
    wall.charts().filter(view).length >= Math.min(wall.budget, tiles)
  );
}

function inView(scroller: HTMLElement): (element: Element) => boolean {
  const { top, bottom } = scroller.getBoundingClientRect();

  return (element) => {
    const rect = element.getBoundingClientRect();

    return rect.top < bottom && rect.bottom > top;
  };
}

function atEnd(scroller: HTMLElement): boolean {
  return (
    scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1
  );
}

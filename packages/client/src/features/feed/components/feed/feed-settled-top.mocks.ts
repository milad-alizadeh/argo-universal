import { canPointAt, centreOf } from '@repo/kit/mocks/point-hit';
import { waitFor } from 'storybook/test';
import { afterTwoFrames, settleWait } from './feed-reader.mocks';
import { rememberReadings, settleFailure } from './settle-failure';

// The pill that says earlier rows are loading floats centred over the first row, so a row is pointed at near its leading edge, clear of it.
const leadingInset = 8;

// Where an element's top settles once it shows at its leading edge, unclipped, and holds still for two frames.
export function settledTopOf(findElement: () => HTMLElement): Promise<number> {
  const remember = rememberReadings();

  return waitFor(async () => {
    await afterTwoFrames();
    const box = findElement().getBoundingClientRect();
    const point = { ...centreOf(box), x: box.left + leadingInset };
    const pointable = canPointAt(findElement(), point);
    const lastTop = remember(box.top);

    if (!pointable || box.top !== lastTop)
      throw new Error(settleFailure(pointable, box.top, lastTop));

    return box.top;
  }, settleWait);
}

import type { LegendListRef } from '@legendapp/list/react-native';
import type { FeedAnchor } from './feed-scroll-memory';

const maxFrames = 120;

const stableFrames = 20;

const offsetTolerance = 2;

const nextFrame = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => resolve()));

function scrollToAnchor(
  list: LegendListRef,
  anchor: FeedAnchor,
): Promise<void> {
  return list.scrollToKey({
    key: anchor.key,
    viewPosition: 0,
    viewOffset: -anchor.offset,
    animated: false,
  });
}

const offsetMatches = (list: LegendListRef, anchor: FeedAnchor): boolean => {
  const current = list.anchorVisibleContent({ key: anchor.key, hold: false });

  return (
    current !== undefined &&
    Math.abs(current.offset - anchor.offset) <= offsetTolerance
  );
};

interface Measurement {
  stable: number;
  signal: AbortSignal;
}

async function measureOnce(
  list: LegendListRef,
  anchor: FeedAnchor,
  measurement: Measurement,
): Promise<number> {
  if (measurement.signal.aborted) return stableFrames;

  if (offsetMatches(list, anchor)) return measurement.stable + 1;

  await scrollToAnchor(list, anchor);

  return 0;
}

const shouldStop = (signal: AbortSignal, stable: number): boolean =>
  signal.aborted || stable >= stableFrames;

function holdIfActive(
  list: LegendListRef,
  anchor: FeedAnchor,
  signal: AbortSignal,
): void {
  if (!signal.aborted) list.anchorVisibleContent({ key: anchor.key });
}

async function followMeasurements(
  list: LegendListRef,
  anchor: FeedAnchor,
  signal: AbortSignal,
): Promise<void> {
  let stable = 0;

  for (let frame = 0; frame < maxFrames; frame += 1) {
    await nextFrame();

    stable = await measureOnce(list, anchor, { stable, signal });

    if (shouldStop(signal, stable)) break;
  }

  holdIfActive(list, anchor, signal);
}

// Legend List reports when its target can be measured; keep correcting until its offset settles.
export async function restoreFeedAnchor(
  list: LegendListRef,
  anchor: FeedAnchor,
  signal: AbortSignal,
): Promise<void> {
  await scrollToAnchor(list, anchor);

  if (!signal.aborted) await followMeasurements(list, anchor, signal);
}

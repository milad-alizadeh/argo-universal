// Runs inside the page: marks the row at the middle of the Feed's view, then reports how far it moves as older history lands.
import type {
  AnchorOptions,
  AnchorReading,
  AnchorWatch,
  Mark,
} from './anchor-types.mts';

export type { AnchorOptions, AnchorReading } from './anchor-types.mts';

function anchorFrame(): Promise<number> {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

function anchorFeed(testId: string): HTMLElement {
  const feed = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);

  if (!feed) throw new Error(`No ${testId}`);

  return feed;
}

function anchorMark(feed: HTMLElement): Mark {
  const box = feed.getBoundingClientRect();

  const element = document.elementFromPoint(
    box.left + box.width / 2,
    box.top + box.height / 2,
  );

  if (!element) throw new Error('Nothing is in the middle of the Feed');

  return { element, top: element.getBoundingClientRect().top };
}

function anchorSame(first: Mark, second: Mark): boolean {
  return first.element === second.element && first.top === second.top;
}

// Rows in view have stopped measuring once the same element holds the same place two frames apart.
async function anchorSettled(
  feed: HTMLElement,
  last: Mark,
  attempts: number,
): Promise<Mark> {
  await anchorFrame();
  await anchorFrame();
  const next = anchorMark(feed);

  if (anchorSame(last, next)) return next;

  if (attempts <= 0)
    throw new Error('The rows in view never stopped measuring');

  return anchorSettled(feed, next, attempts - 1);
}

// Reads back as a reader does with the wheel, which stops the Feed following its end, to a screen below its oldest loaded row.
function anchorReadBack(feed: HTMLElement): void {
  feed.dispatchEvent(new WheelEvent('wheel', { deltaY: -feed.clientHeight }));
  feed.scrollTop = feed.clientHeight;
  feed.dispatchEvent(new Event('scroll'));
}

function anchorDrift(watch: AnchorWatch): number {
  return Math.abs(
    watch.marked.element.getBoundingClientRect().top - watch.marked.top,
  );
}

function anchorLoading(label: string): boolean {
  return (
    document.querySelector(`[role="progressbar"][aria-label="${label}"]`) !==
    null
  );
}

function anchorLanded(watch: AnchorWatch): boolean {
  return (
    watch.feed.scrollHeight > watch.heightBefore + 1 &&
    !anchorLoading(watch.loadingLabel)
  );
}

function anchorReading(watch: AnchorWatch): AnchorReading {
  const { feed } = watch;

  return {
    anchorKept: watch.marked.element.isConnected,
    maxDriftPx: watch.furthest,
    driftedFrames: watch.drifted,
    finalDriftPx: anchorDrift(watch),
    extentGrowthPx: feed.scrollHeight - watch.heightBefore,
    scrollTopShiftPx: feed.scrollTop - watch.scrollTopBefore,
    endReached: feed.scrollHeight - feed.scrollTop - feed.clientHeight < 2,
  };
}

function anchorRecord(watch: AnchorWatch, now: number): void {
  const drift = anchorDrift(watch);
  watch.furthest = Math.max(watch.furthest, drift);
  watch.drifted += Number(drift > watch.movedPx);
  watch.landedAt ??= anchorLanded(watch) ? now : undefined;
}

function anchorDone(watch: AnchorWatch, now: number): boolean {
  return watch.landedAt !== undefined && now - watch.landedAt >= watch.settleMs;
}

function anchorStep(watch: AnchorWatch, now: number): void {
  anchorRecord(watch, now);

  if (anchorDone(watch, now)) watch.result = anchorReading(watch);
  else requestAnimationFrame((next) => anchorStep(watch, next));
}

// Where the Feed stood before it was read back, and the row marked once it held still.
interface Start extends Mark {
  feed: HTMLElement;
  heightBefore: number;
}

function anchorStarted(options: AnchorOptions, start: Start): AnchorWatch {
  const { feed, heightBefore, ...marked } = start;

  return {
    ...options,
    feed,
    marked,
    heightBefore,
    scrollTopBefore: feed.scrollTop,
    furthest: 0,
    drifted: 0,
    landedAt: undefined,
  };
}

/*
 * Reads the Feed back, marks the row at the middle of the view once it holds still, and starts watching
 * it every frame. The older page is requested on arrival and lands some time after this returns; the
 * watch ends `settleMs` after it does, and `window.argoAnchor.result` is the reading.
 */
async function startAnchorWatch(options: AnchorOptions): Promise<void> {
  const feed = anchorFeed(options.testId);
  const heightBefore = feed.scrollHeight;

  anchorReadBack(feed);

  const marked = await anchorSettled(
    feed,
    anchorMark(feed),
    options.settleAttempts,
  );

  const watch = anchorStarted(options, { feed, heightBefore, ...marked });

  if (feed.scrollHeight > heightBefore + 1)
    throw new Error('The older page landed before the row was marked');

  window.argoAnchor = watch;

  requestAnimationFrame((now) => anchorStep(watch, now));
}

// Every function the page needs, then the entry point the harness calls.
export const anchorScript = [
  ...[
    anchorFrame,
    anchorFeed,
    anchorMark,
    anchorSame,
    anchorSettled,
    anchorReadBack,
    anchorDrift,
    anchorLoading,
    anchorLanded,
    anchorReading,
    anchorRecord,
    anchorDone,
    anchorStep,
    anchorStarted,
    startAnchorWatch,
  ].map(String),
  'window.startAnchorWatch = startAnchorWatch;',
].join('\n');

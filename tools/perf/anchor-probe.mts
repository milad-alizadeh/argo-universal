// Runs inside the page: marks the row at the middle of the Feed's view, then reports how far it moves as older history lands.

export interface AnchorProbe {
  // Set once an older page has landed and the Feed has been watched for the settle window.
  result?: AnchorReading;
}

export interface AnchorReading {
  // Whether the marked row is still in the document at the end.
  anchorKept: boolean;
  // The furthest the marked row's top moved from where it was marked, in px, from the mark to the end of the window.
  maxDriftPx: number;
  // How far it had moved when the window ended.
  finalDriftPx: number;
  // How much taller the Feed's scrollable extent became: the older page's rows.
  extentGrowthPx: number;
  // How far the Feed's scroll position moved between the mark and the end of the window.
  scrollTopShiftPx: number;
  // Whether the Feed ended at its newest row, where reading older rows never leaves it.
  endReached: boolean;
}

declare global {
  interface Window {
    argoAnchor?: AnchorProbe;
  }
}

export interface AnchorOptions {
  testId: string;
  // How long the Feed is watched after the older page lands, for a scroll nobody asked for: #1543's slide took about 1.5 s.
  settleMs: number;
  loadingLabel: string;
}

/*
 * Reads the Feed up to a screen below its oldest loaded row, as a reader does with the wheel, marks the
 * row at the middle of the view once it holds still, and starts watching it every frame. The older page
 * is requested on arrival and lands some time after this returns; the watch ends `settleMs` after it does.
 * `window.argoAnchor.result` is the reading.
 */
export async function startAnchorWatch(options: AnchorOptions): Promise<void> {
  const { testId, settleMs, loadingLabel } = options;

  const feed = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);

  if (!feed) throw new Error(`No ${testId}`);

  const frame = (): Promise<number> =>
    new Promise((resolve) => requestAnimationFrame(resolve));

  const middle = (): Element | null => {
    const box = feed.getBoundingClientRect();

    return document.elementFromPoint(
      box.left + box.width / 2,
      box.top + box.height / 2,
    );
  };

  const loading = (): boolean =>
    document.querySelector(
      `[role="progressbar"][aria-label="${loadingLabel}"]`,
    ) !== null;

  const heightBefore = feed.scrollHeight;
  feed.dispatchEvent(new WheelEvent('wheel', { deltaY: -feed.clientHeight }));
  feed.scrollTop = feed.clientHeight;
  feed.dispatchEvent(new Event('scroll'));

  // Rows in view have stopped measuring once the same element holds the same place two frames apart.
  let element = middle();
  let top = element?.getBoundingClientRect().top;
  let settled = false;

  for (let attempt = 0; attempt < 60 && !settled; attempt += 1) {
    await frame();
    await frame();
    const next = middle();
    const nextTop = next?.getBoundingClientRect().top;
    settled = next === element && nextTop === top;
    element = next;
    top = nextTop;
  }

  if (!element || top === undefined || !settled)
    throw new Error('The rows in view never stopped measuring');

  if (feed.scrollHeight > heightBefore + 1)
    throw new Error('The older page landed before the row was marked');

  const marked = { element, top, scrollTop: feed.scrollTop };
  const probe: AnchorProbe = {};
  window.argoAnchor = probe;
  let furthest = 0;
  let landedAt: number | undefined;

  const reading = (): AnchorReading => ({
    anchorKept: marked.element.isConnected,
    maxDriftPx: furthest,
    finalDriftPx: Math.abs(
      marked.element.getBoundingClientRect().top - marked.top,
    ),
    extentGrowthPx: feed.scrollHeight - heightBefore,
    scrollTopShiftPx: feed.scrollTop - marked.scrollTop,
    endReached: feed.scrollHeight - feed.scrollTop - feed.clientHeight < 2,
  });

  const watch = (now: number): void => {
    furthest = Math.max(
      furthest,
      Math.abs(marked.element.getBoundingClientRect().top - marked.top),
    );

    if (
      landedAt === undefined &&
      feed.scrollHeight > heightBefore + 1 &&
      !loading()
    )
      landedAt = now;

    if (landedAt !== undefined && now - landedAt >= settleMs)
      probe.result = reading();
    else requestAnimationFrame(watch);
  };

  requestAnimationFrame(watch);
}

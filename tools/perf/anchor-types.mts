// What the anchor probe reads inside the page, and the state it keeps while it watches.

export interface AnchorReading {
  // Whether the marked row is still in the document at the end.
  anchorKept: boolean;
  // The furthest the marked row's top moved from where it was marked, in px, from the mark to the end of the window.
  maxDriftPx: number;
  // How many frames it sat more than 2 px from where it was marked: one is a flicker, many is a slide.
  driftedFrames: number;
  // How far it had moved when the window ended.
  finalDriftPx: number;
  // How much taller the Feed's scrollable extent became: the older page's rows.
  extentGrowthPx: number;
  // How far the Feed's scroll position moved between the mark and the end of the window.
  scrollTopShiftPx: number;
  // Whether the Feed ended at its newest row, where reading older rows never leaves it.
  endReached: boolean;
}

export interface AnchorOptions {
  testId: string;
  // How long the Feed is watched after the older page lands, for a scroll nobody asked for: #1543's slide took about 1.5 s.
  settleMs: number;
  loadingLabel: string;
  // A row this far from its mark has moved, as a reader sees it.
  movedPx: number;
  // Pairs of frames the row in view gets to hold still in before it is marked.
  settleAttempts: number;
}

export interface Mark {
  element: Element;
  top: number;
}

// The watch's state; `result` is set once an older page has landed and the settle window has passed.
export interface AnchorWatch extends AnchorOptions {
  feed: HTMLElement;
  marked: Mark;
  heightBefore: number;
  scrollTopBefore: number;
  furthest: number;
  drifted: number;
  landedAt: number | undefined;
  result?: AnchorReading;
}

declare global {
  interface Window {
    argoAnchor?: AnchorWatch;
    startAnchorWatch: (options: AnchorOptions) => Promise<void>;
  }
}

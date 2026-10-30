// Helpers that run inside the page: `browserScript` injects their source, and the harness calls them through `window.perf`.

export interface Frames {
  intervals: number[];
  longTasks: number;
}

interface FrameState extends Frames {
  running: boolean;
  previous: number;
}

interface Motion {
  pixelsPerSecond: number;
  duration: number;
}

interface Flick extends Motion {
  target: HTMLElement;
  elapsed: number;
  previous: number;
  resolve: () => void;
}

interface PerfApi {
  startFrames: () => void;
  stopFrames: () => Frames;
  flick: (id: string, motion: Motion) => Promise<void>;
  jump: (id: string, top: boolean) => number;
}

declare global {
  interface Window {
    perf: PerfApi;
    perfFrames: FrameState;
  }
}

function perfElement(id: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(`[data-testid="${id}"]`);

  if (!element) throw new Error(`No ${id}`);

  return element;
}

// Moves the list `id` to its top or bottom, and returns its scroll height.
function perfJump(id: string, top: boolean): number {
  const element = perfElement(id);
  element.scrollTop = top ? 0 : element.scrollHeight;

  return element.scrollHeight;
}

function perfFlickStep(flick: Flick, now: number): void {
  const delta = Number.isNaN(flick.previous) ? 0 : now - flick.previous;
  flick.previous = now;
  flick.elapsed += delta;
  flick.target.scrollTop += (flick.pixelsPerSecond * delta) / 1000;

  if (flick.elapsed < flick.duration)
    requestAnimationFrame((next) => perfFlickStep(flick, next));
  else flick.resolve();
}

// Scrolls the list `id` each frame, as a steady flick would; up when `pixelsPerSecond` is negative.
function perfFlick(id: string, motion: Motion): Promise<void> {
  const start = {
    ...motion,
    target: perfElement(id),
    elapsed: 0,
    previous: Number.NaN,
  };

  return new Promise((resolve) => {
    requestAnimationFrame((now) => perfFlickStep({ ...start, resolve }, now));
  });
}

/*
 * One frame interval per animation frame, from the frame's own timestamp. The clock is the main
 * thread's: a main thread held for 500 ms is measured as one 500 ms interval (collector.perf.mts
 * proves it, including in headless Chromium, where the vsync is emulated at 60 Hz). What it cannot
 * see is jank that never reaches the main thread — raster, compositing, or a frame the compositor
 * drops while the page's own callbacks keep pace. Those are read from the compositor's own frame
 * reports instead, as `presentedFrames`, `partialFrames` and `compositorDropped`.
 */
function perfFrame(now: number): void {
  const state = window.perfFrames;

  if (!state.running) return;

  if (!Number.isNaN(state.previous)) state.intervals.push(now - state.previous);
  state.previous = now;
  requestAnimationFrame(perfFrame);
}

function perfResetFrames(running: boolean): void {
  window.perfFrames = {
    intervals: [],
    longTasks: 0,
    running,
    previous: Number.NaN,
  };
}

function perfStartFrames(): void {
  perfResetFrames(true);
  requestAnimationFrame(perfFrame);
}

function perfStopFrames(): Frames {
  const state = window.perfFrames;
  state.running = false;

  return { intervals: state.intervals, longTasks: state.longTasks };
}

// Counts long tasks from the start, so a window can count those that end inside it.
function perfInstall(): void {
  perfResetFrames(false);
  window.perf = {
    startFrames: perfStartFrames,
    stopFrames: perfStopFrames,
    flick: perfFlick,
    jump: perfJump,
  };
  new PerformanceObserver((list) => {
    if (window.perfFrames.running)
      window.perfFrames.longTasks += list.getEntries().length;
  }).observe({ type: 'longtask', buffered: false });
}

export const browserScript = [
  ...[
    perfElement,
    perfJump,
    perfFlickStep,
    perfFlick,
    perfFrame,
    perfResetFrames,
    perfStartFrames,
    perfStopFrames,
    perfInstall,
  ].map(String),
  'perfInstall();',
].join('\n');

export interface ScrollRestoration {
  viewport: (height: number) => void;
  content: (height: number) => void;
  boundary: () => void;
  restore: (
    ready: boolean | undefined,
    scrollTo: (offset: number) => void,
  ) => void;
  cancel: () => number;
  record: (offset: number) => boolean;
}

type Range = {
  pending: boolean;
  viewport: number;
  content: number;
  target: number;
  offset: number;
};

// The target survives loading events; final content may clamp it once, and user intent takes ownership.
export function createScrollRestoration(target: number): ScrollRestoration {
  const range: Range = {
    target,
    pending: target > 0,
    viewport: 0,
    content: 0,
    offset: 0,
  };

  return {
    ...measurements(range),
    cancel: () => cancel(range),
    record: (offset) => record(range, offset),
    restore: (ready, scrollTo) => restore(range, ready, scrollTo),
  };
}

function measurements(
  range: Range,
): Pick<ScrollRestoration, 'viewport' | 'content' | 'boundary'> {
  return {
    viewport: (height) => {
      range.viewport = height;
    },
    content: (height) => {
      range.content = height;
    },
    boundary: () => {
      range.content = 0;
    },
  };
}

function cancel(range: Range): number {
  range.pending = false;

  return range.offset;
}

function record(range: Range, offset: number): boolean {
  range.offset = offset;

  if (offset > 0) cancel(range);

  return !range.pending;
}

function restore(
  range: Range,
  ready: boolean | undefined,
  scrollTo: (offset: number) => void,
): void {
  if (!canRestore(range, ready)) return;

  range.pending = false;
  range.offset = Math.min(
    range.target,
    Math.max(0, range.content - range.viewport),
  );
  scrollTo(range.offset);
}

const measured = (range: Range): boolean =>
  range.viewport > 0 && range.content > 0;

const eligible = (range: Range, ready: boolean | undefined): boolean =>
  range.pending && ready !== false;

const reachable = (range: Range, ready: boolean | undefined): boolean =>
  ready === true || range.content - range.viewport >= range.target;

const canRestore = (range: Range, ready: boolean | undefined): boolean =>
  eligible(range, ready) && measured(range) && reachable(range, ready);

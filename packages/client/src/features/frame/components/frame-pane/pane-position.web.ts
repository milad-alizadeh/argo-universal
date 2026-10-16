import type { PaneGeometry } from './pane-geometry';

export interface PaneMode {
  animate: boolean;
  reflows: boolean;
}

export interface PaneElements {
  viewport: HTMLDivElement;
  frame: HTMLDivElement | null;
  slide: HTMLDivElement | null;
}

export interface PaneMotionInput extends PaneMode {
  panes: PaneElements;
  last: PaneGeometry;
  next: PaneGeometry;
}

export interface PanePosition {
  width: number;
  offset: number;
}

function translationOf(element: Element): number {
  return new DOMMatrixReadOnly(getComputedStyle(element).transform).m41;
}

function framePosition(
  last: PaneGeometry,
  { frame }: PaneElements,
): PanePosition | undefined {
  if (!frame) return undefined;
  const width = Number.parseFloat(getComputedStyle(frame).width);

  return { width, offset: last.offset + translationOf(frame) };
}

function slidePosition(
  last: PaneGeometry,
  { slide, viewport }: PaneElements,
): PanePosition | undefined {
  if (!slide) return undefined;

  return {
    width: last.contentWidth + translationOf(slide),
    offset: last.offset + translationOf(viewport),
  };
}

function measuredPosition({
  last,
  panes,
  reflows,
}: PaneMotionInput): PanePosition {
  const measured = reflows
    ? framePosition(last, panes)
    : slidePosition(last, panes);

  return measured ?? last;
}

export function startingPosition(
  input: PaneMotionInput,
  motion: readonly Animation[],
): PanePosition {
  const running = motion.some((animation) => animation.playState === 'running');

  return running ? measuredPosition(input) : input.last;
}

import type { FrameTiming } from '../../utils/frame-timing';
import type { PaneSpan } from '../../utils/pane-shift';
import type { PaneGeometry } from './pane-geometry';

export interface PaneMode {
  animate: boolean;
  reflows: boolean;
  timing: FrameTiming;
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

// Where the pane's moving part shows now: a sliding pane's edge and width, or a reflowing pane's content.
export interface PanePosition extends PaneSpan {
  opacity: number;
}

function translationOf(element: Element): number {
  return new DOMMatrixReadOnly(getComputedStyle(element).transform).m41;
}

const shownOpacity = (hidden: boolean): number => (hidden ? 0 : 1);

// A reflowing pane's content keeps the width it was laid out at; only its translation and opacity run.
function framePosition(
  last: PaneGeometry,
  { frame }: PaneElements,
): PanePosition | undefined {
  if (!frame) return undefined;

  return {
    width: last.contentWidth,
    offset: last.offset + translationOf(frame),
    opacity: Number(getComputedStyle(frame).opacity),
  };
}

function slidePosition(
  last: PaneGeometry,
  { slide, viewport }: PaneElements,
): PanePosition | undefined {
  if (!slide) return undefined;

  return {
    width: last.contentWidth + translationOf(slide),
    offset: last.offset + translationOf(viewport),
    opacity: shownOpacity(last.hidden),
  };
}

function measuredPosition({
  last,
  panes,
  reflows,
}: PaneMotionInput): PanePosition | undefined {
  return reflows ? framePosition(last, panes) : slidePosition(last, panes);
}

// Where a pane rests: a sliding pane by its own width, a reflowing pane by its content's.
export function restingPosition(
  geometry: PaneGeometry,
  reflows: boolean,
): PanePosition {
  return {
    offset: geometry.offset,
    width: reflows ? geometry.contentWidth : geometry.width,
    opacity: shownOpacity(geometry.hidden),
  };
}

export function startingPosition(
  input: PaneMotionInput,
  motion: readonly Animation[],
): PanePosition {
  const running = motion.some((animation) => animation.playState === 'running');
  const resting = restingPosition(input.last, input.reflows);

  return (running && measuredPosition(input)) || resting;
}

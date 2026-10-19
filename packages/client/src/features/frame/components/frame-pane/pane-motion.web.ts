import type { RefObject } from 'react';
import {
  type ElementFrame,
  cancelMotion,
  mayAnimate,
  playFrames,
} from '../../hooks/use-frame-transition.web';
import { paneShift } from '../../utils/pane-shift';
import type { PaneGeometry } from './pane-geometry';
import {
  type PaneElements,
  type PaneMode,
  type PaneMotionInput,
  type PanePosition,
  restingPosition,
  startingPosition,
} from './pane-position.web';
import { slideStyle } from './slide-style';

type PaneRef = RefObject<HTMLDivElement | null>;

export interface PaneRefs {
  viewportRef: PaneRef;
  frameRef: PaneRef;
  slideRef: PaneRef;
}

export interface PaneMotionRefs {
  refs: PaneRefs;
  previous: RefObject<PaneGeometry>;
  motion: RefObject<Animation[]>;
}

function travelled(start: PanePosition, end: PanePosition): boolean {
  return (
    start.width !== end.width ||
    start.offset !== end.offset ||
    start.opacity !== end.opacity
  );
}

function shouldMove(input: PaneMotionInput, start: PanePosition): boolean {
  const { last, next } = input;

  return (
    last.transitionKey !== next.transitionKey &&
    travelled(start, restingPosition(next, input.reflows)) &&
    mayAnimate(input.animate)
  );
}

function shiftFrames(translation: number): [Keyframe, Keyframe] {
  return [
    { transform: `translateX(${translation}px)` },
    { transform: 'translateX(0px)' },
  ];
}

// A pane appearing from nothing slides in by its whole width rather than from its centre.
const visibleStart = (start: PanePosition, end: PanePosition): PanePosition =>
  start.width > 0 ? start : { ...start, width: end.width };

/*
 * FLIP: the content already holds its final width, so the Feed lays out once; it slides from where it
 * showed by transform and fades out by opacity as it hides, so nothing reflows while it moves.
 */
function reflowFrames(
  frame: HTMLDivElement,
  start: PanePosition,
  next: PaneGeometry,
): readonly ElementFrame[] {
  const end = restingPosition(next, true);
  const [from, to] = shiftFrames(paneShift(visibleStart(start, end), end));

  // A pane showing is whole at once and slides in; one hiding fades as it goes.
  const keyframes = [
    { ...from, opacity: Math.max(start.opacity, end.opacity) },
    { ...to, opacity: end.opacity },
  ];

  return [[frame, keyframes]];
}

function slideFrames(
  { panes, next }: PaneMotionInput,
  start: PanePosition,
): readonly ElementFrame[] {
  const translation = start.offset - next.offset;

  const content: ElementFrame = [
    panes.slide,
    [
      slideStyle(start.width, next.contentWidth),
      slideStyle(next.width, next.contentWidth),
    ],
  ];

  if (translation === 0) return [content];

  return [content, [panes.viewport, shiftFrames(translation)]];
}

function paneFrames(
  input: PaneMotionInput,
  start: PanePosition,
): readonly ElementFrame[] {
  const { frame } = input.panes;

  return input.reflows && frame
    ? reflowFrames(frame, start, input.next)
    : slideFrames(input, start);
}

function restartMotion(
  input: PaneMotionInput,
  motion: readonly Animation[],
): Animation[] {
  const start = startingPosition(input, motion);
  cancelMotion(motion);

  return shouldMove(input, start)
    ? playFrames(paneFrames(input, start), input.timing)
    : [];
}

function readPanes({
  viewportRef,
  frameRef,
  slideRef,
}: PaneRefs): PaneElements | undefined {
  const viewport = viewportRef.current;

  if (!viewport) return undefined;

  return { viewport, frame: frameRef.current, slide: slideRef.current };
}

export function syncPaneMotion(
  { refs, previous, motion }: PaneMotionRefs,
  next: PaneGeometry,
  mode: PaneMode,
): void {
  const panes = readPanes(refs);

  if (!panes) return;
  const input = { ...mode, panes, last: previous.current, next };
  motion.current = restartMotion(input, motion.current);
  previous.current = next;
}

import type { RefObject } from 'react';
import {
  type ElementFrame,
  cancelMotion,
  mayAnimate,
  playFrames,
} from '../../hooks/use-shell-transition.web';
import type { PaneGeometry } from './pane-geometry';
import {
  type PaneElements,
  type PaneMode,
  type PaneMotionInput,
  type PanePosition,
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

function travelled(start: PanePosition, next: PaneGeometry): boolean {
  return start.width !== next.width || start.offset !== next.offset;
}

function shouldMove(input: PaneMotionInput, start: PanePosition): boolean {
  const { last, next } = input;

  return (
    last.transitionKey !== next.transitionKey &&
    travelled(start, next) &&
    mayAnimate(input.animate)
  );
}

function shiftFrames(translation: number): [Keyframe, Keyframe] {
  return [
    { transform: `translateX(${translation}px)` },
    { transform: 'translateX(0px)' },
  ];
}

function reflowFrames(
  frame: HTMLDivElement,
  start: PanePosition,
  next: PaneGeometry,
): readonly ElementFrame[] {
  const [from, to] = shiftFrames(start.offset - next.offset);
  const fromWidth = { ...from, width: `${start.width}px` };

  return [[frame, [fromWidth, { ...to, width: `${next.width}px` }]]];
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

  return shouldMove(input, start) ? playFrames(paneFrames(input, start)) : [];
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

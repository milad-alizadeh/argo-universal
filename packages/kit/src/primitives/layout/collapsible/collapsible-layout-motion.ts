import type { RefObject } from 'react';
import { Easing } from 'react-native-reanimated';
import { type CollapsibleLayoutSync, duration } from './collapsible-context';

const easeInOut = Easing.inOut(Easing.quad);

const longestDuration = 400;

// A taller row opens a little slower, up to the longest duration.
const durationPerPoint = 0.6;

const durationFor = (height: number): number =>
  Math.min(longestDuration, Math.max(duration, height * durationPerPoint));

// Whole points while moving, as the scroll offset steps, so a Feed held at its end does not shake the rows below.
export const drawnHeight = (height: number, progress: number): number =>
  progress === 1 ? height : Math.round(height * progress);

export interface LayoutMotion {
  from: number;
  target: number;
  // The content's height as last measured, which can still change while it opens.
  height: RefObject<number>;
  // The height last reported to the list, so each step reports only what it adds.
  drawn: { current: number };
  progress: RefObject<number>;
  setProgress: (progress: number) => void;
  layoutSync: CollapsibleLayoutSync;
}

function stepTo(motion: LayoutMotion, progress: number): void {
  const drawn = drawnHeight(motion.height.current, progress);

  motion.layoutSync.grow(drawn - motion.drawn.current);
  motion.drawn.current = drawn;
  motion.progress.current = progress;
  motion.setProgress(progress);
}

// A frame that began before the motion reads as its start, since the eased curve would move the content backwards.
const fractionAt = (elapsed: number, length: number): number =>
  Math.min(Math.max(elapsed / length, 0), 1);

const eased = (motion: LayoutMotion, fraction: number): number =>
  motion.from + (motion.target - motion.from) * easeInOut(fraction);

interface Frames {
  frame: number;
  moving: boolean;
}

function finish(frames: Frames, motion: LayoutMotion): void {
  frames.moving = false;
  motion.layoutSync.onMotionChange(false);
}

function stepper(
  motion: LayoutMotion,
  frames: Frames,
  length: number,
): (time: number) => void {
  const startedAt = performance.now();

  const step = (time: number): void => {
    const fraction = fractionAt(time - startedAt, length);

    stepTo(motion, eased(motion, fraction));

    if (fraction < 1) frames.frame = requestAnimationFrame(step);
    else finish(frames, motion);
  };

  return step;
}

function runFrames(motion: LayoutMotion, length: number): () => void {
  const frames: Frames = { frame: 0, moving: true };

  motion.layoutSync.onMotionChange(true);
  frames.frame = requestAnimationFrame(stepper(motion, frames, length));

  return () => {
    cancelAnimationFrame(frames.frame);

    if (frames.moving) finish(frames, motion);
  };
}

// Reduced motion takes the final height in one step, which the list still hears as a motion so it holds its rows.
function jump(motion: LayoutMotion): undefined {
  motion.layoutSync.onMotionChange(true);
  stepTo(motion, motion.target);
  motion.layoutSync.onMotionChange(false);
}

export function beginLayoutMotion(
  motion: LayoutMotion,
  reduced: boolean,
): (() => void) | undefined {
  const length =
    Math.abs(motion.target - motion.from) * durationFor(motion.height.current);

  if (!length) return undefined;

  return reduced ? jump(motion) : runFrames(motion, length);
}

import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { useReducedMotionNow } from '#kit/use-reduced-motion-now';
import {
  drawnHeight,
  durationFor,
  easeInOut,
  elapsedFraction,
  type CollapsibleLayoutSync,
} from './collapsible-context';

interface MotionOptions {
  open: boolean;
  measured: boolean;
  contentHeight: RefObject<number>;
  layoutSync: Pick<CollapsibleLayoutSync, 'grow' | 'onMotionChange'>;
}

interface FrameMotion {
  from: number;
  target: number;
  height: number;
  remainingDuration: number;
  // The content's height as last measured, which can still change while it opens.
  contentHeight: RefObject<number>;
  // The height last reported to the list, so each step reports only what it adds.
  latestDrawn: { current: number };
  latestProgress: RefObject<number>;
  setProgress: (progress: number) => void;
  grow: (height: number) => void;
  onMotionChange: (moving: boolean) => void;
}

type StepMotion = Omit<FrameMotion, 'remainingDuration'>;

function stepTo(motion: StepMotion, progress: number): void {
  const drawn = drawnHeight(motion.contentHeight.current, progress);
  motion.grow(drawn - motion.latestDrawn.current);
  motion.latestDrawn.current = drawn;
  motion.latestProgress.current = progress;
  motion.setProgress(progress);
}

function advanceProgress(motion: FrameMotion, elapsed: number): number {
  const fraction = elapsedFraction(elapsed, motion.remainingDuration);
  stepTo(
    motion,
    motion.from + (motion.target - motion.from) * easeInOut(fraction),
  );

  return fraction;
}

// Under reduced motion the content takes its final height in one step, which the list still hears as a motion, so it can hold its rows as it does for an animated one.
function jumpTo(motion: StepMotion): undefined {
  motion.onMotionChange(true);
  stepTo(motion, motion.target);
  motion.onMotionChange(false);
}

function stopFrames(frame: number, moving: boolean, motion: FrameMotion): void {
  cancelAnimationFrame(frame);

  if (moving) motion.onMotionChange(false);
}

function runFrames(motion: FrameMotion): () => void {
  motion.onMotionChange(true);
  let moving = true;
  const startedAt = performance.now();

  let frame = requestAnimationFrame(function step(time): void {
    const fraction = advanceProgress(motion, time - startedAt);

    if (fraction < 1) frame = requestAnimationFrame(step);
    else {
      moving = false;
      motion.onMotionChange(false);
    }
  });

  return () => stopFrames(frame, moving, motion);
}

function beginMotion(
  motion: StepMotion,
  reducedMotion: boolean,
): (() => void) | undefined {
  const remainingDuration =
    Math.abs(motion.target - motion.from) * durationFor(motion.height);

  if (!remainingDuration) return;

  if (reducedMotion) return jumpTo(motion);

  return runFrames({ ...motion, remainingDuration });
}

export function useLayoutMotion(options: MotionOptions): number {
  const reducedMotion = useReducedMotionNow();
  const [progress, setProgress] = useState(options.open ? 1 : 0);
  const latestProgress = useRef(progress);
  useLayoutEffect(() => {
    latestProgress.current = progress;
  }, [progress]);
  useMotionEffect({ ...options, reducedMotion, latestProgress, setProgress });

  return progress;
}

interface MotionEffectOptions extends MotionOptions {
  reducedMotion: boolean;
  latestProgress: RefObject<number>;
  setProgress: (progress: number) => void;
}

function motionOf(options: MotionEffectOptions): StepMotion {
  const { latestProgress, setProgress, layoutSync } = options;

  const height = options.contentHeight.current;

  return {
    from: latestProgress.current,
    target: options.open ? 1 : 0,
    height,
    contentHeight: options.contentHeight,
    latestDrawn: { current: drawnHeight(height, latestProgress.current) },
    latestProgress,
    setProgress,
    grow: layoutSync.grow,
    onMotionChange: layoutSync.onMotionChange,
  };
}

function startMotionEffect(
  options: MotionEffectOptions,
): (() => void) | undefined {
  // Content opening for the first time measures before it moves.
  if (options.open && !options.measured) return;

  return beginMotion(motionOf(options), options.reducedMotion);
}

function useMotionControls(
  options: MotionEffectOptions,
): Pick<MotionEffectOptions, 'open' | 'measured' | 'reducedMotion'> {
  const { open, measured, reducedMotion } = options;

  return useMemo(
    () => ({ open, measured, reducedMotion }),
    [open, measured, reducedMotion],
  );
}

function useMotionReferences(
  options: MotionEffectOptions,
): Pick<
  MotionEffectOptions,
  'contentHeight' | 'latestProgress' | 'setProgress'
> {
  const { contentHeight, latestProgress, setProgress } = options;

  return useMemo(
    () => ({ contentHeight, latestProgress, setProgress }),
    [contentHeight, latestProgress, setProgress],
  );
}

function useMotionCallbacks(
  options: MotionEffectOptions['layoutSync'],
): MotionEffectOptions['layoutSync'] {
  const { grow, onMotionChange } = options;

  return useMemo(() => ({ grow, onMotionChange }), [grow, onMotionChange]);
}

function useMotionEffect(options: MotionEffectOptions): void {
  const controls = useMotionControls(options);
  const references = useMotionReferences(options);
  const layoutSync = useMotionCallbacks(options.layoutSync);
  useLayoutEffect(
    () => startMotionEffect({ ...controls, ...references, layoutSync }),
    [controls, references, layoutSync],
  );
}

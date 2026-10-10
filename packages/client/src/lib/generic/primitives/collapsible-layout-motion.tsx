import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import {
  durationFor,
  easeInOut,
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
  latestProgress: RefObject<number>;
  setProgress: (progress: number) => void;
  grow: (height: number) => void;
  onMotionChange: (moving: boolean) => void;
}
function advanceProgress(motion: FrameMotion, fraction: number): void {
  const progress =
    motion.from + (motion.target - motion.from) * easeInOut(fraction);
  motion.grow(motion.height * (progress - motion.latestProgress.current));
  motion.latestProgress.current = progress;
  motion.setProgress(progress);
}
function stopFrames(frame: number, moving: boolean, motion: FrameMotion): void {
  cancelAnimationFrame(frame);
  if (moving) motion.onMotionChange(false);
}
function runFrames(motion: FrameMotion): () => void {
  motion.onMotionChange(true);
  let moving = true;
  const startTime = performance.now();
  let frame = requestAnimationFrame(function step(time): void {
    const fraction = Math.min((time - startTime) / motion.remainingDuration, 1);
    advanceProgress(motion, fraction);
    if (fraction < 1) frame = requestAnimationFrame(step);
    else {
      moving = false;
      motion.onMotionChange(false);
    }
  });
  return () => stopFrames(frame, moving, motion);
}
function beginMotion(
  motion: Omit<FrameMotion, 'remainingDuration'>,
): (() => void) | undefined {
  const remainingDuration =
    Math.abs(motion.target - motion.from) * durationFor(motion.height);
  if (!remainingDuration) return;
  return runFrames({ ...motion, remainingDuration });
}
function canAnimate(options: MotionEffectOptions): boolean {
  if (options.open && !options.measured) return false;
  return !options.reducedMotion;
}
function resolvedProgress(
  open: boolean,
  reducedMotion: boolean,
  animated: number,
): number {
  if (reducedMotion) return open ? 1 : 0;
  return animated;
}
export function useLayoutMotion(options: MotionOptions): number {
  const reducedMotion = useReducedMotion();
  const [animated, setProgress] = useState(options.open ? 1 : 0);
  const progress = resolvedProgress(options.open, reducedMotion, animated);
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
function startMotionEffect(
  options: MotionEffectOptions,
): (() => void) | undefined {
  if (!canAnimate(options)) return;
  const { latestProgress, setProgress, layoutSync } = options;
  return beginMotion({
    from: latestProgress.current,
    target: options.open ? 1 : 0,
    height: options.contentHeight.current,
    latestProgress,
    setProgress,
    grow: layoutSync.grow,
    onMotionChange: layoutSync.onMotionChange,
  });
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

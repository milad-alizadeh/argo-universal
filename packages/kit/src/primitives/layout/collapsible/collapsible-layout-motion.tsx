import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { useReducedMotionNow } from '#kit/use-reduced-motion-now';
import { drawnHeight, type CollapsibleLayoutSync } from './collapsible-context';
import { beginMotion, type StepMotion } from './collapsible-layout-frames';

interface MotionOptions {
  open: boolean;
  measured: boolean;
  contentHeight: RefObject<number>;
  layoutSync: Pick<CollapsibleLayoutSync, 'grow' | 'onMotionChange'>;
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

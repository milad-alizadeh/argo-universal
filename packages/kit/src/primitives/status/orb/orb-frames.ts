import type { SkImage } from '@shopify/react-native-skia';
import { useCallback, useEffect, useMemo } from 'react';
import {
  type FrameInfo,
  type SharedValue,
  useAnimatedReaction,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';
import { scheduleOnUI } from 'react-native-worklets';
import type { OrbFrame } from './orb-frame';

interface Frames {
  image: SharedValue<SkImage | null>;
  // How far into its animation the orb is. It only moves while running, so a stop holds the frame.
  elapsed: SharedValue<number>;
  frame: OrbFrame;
}

// The same image comes back each frame, so the update is forced.
function drawFrame({ image, elapsed, frame }: Frames): void {
  'worklet';

  image.modify((previous) => frame(elapsed.get(), previous), true);
}

function freeImage(image: SharedValue<SkImage | null>): void {
  'worklet';

  image.get()?.dispose();
  image.set(null);
}

// Draws every frame while running; stopped, nothing runs per frame.
function useTicker(frames: Frames, running: boolean): void {
  const tick = useCallback(
    ({ timeSincePreviousFrame }: FrameInfo) => {
      'worklet';

      frames.elapsed.set(frames.elapsed.get() + (timeSincePreviousFrame ?? 0));
      drawFrame(frames);
    },
    [frames],
  );

  const ticker = useFrameCallback(tick, false);

  useEffect(() => ticker.setActive(running), [running, ticker]);
}

// Stopped, the orb is drawn once, and again only when its drawing changes.
function useHeldFrame(frames: Frames, running: boolean): void {
  useAnimatedReaction(
    () => running,
    (isRunning) => {
      if (!isRunning) drawFrame(frames);
    },
    [frames, running],
  );
}

/*
 * Draws on the UI thread, so a frame costs no React render and no round trip through the JS thread.
 * The image is freed there too, when the orb unmounts.
 */
export function useOrbFrames(
  frame: OrbFrame,
  running: boolean,
): SharedValue<SkImage | null> {
  const image = useSharedValue<SkImage | null>(null);
  const elapsed = useSharedValue(0);

  const frames = useMemo(
    () => ({ image, elapsed, frame }),
    [elapsed, frame, image],
  );

  useTicker(frames, running);
  useHeldFrame(frames, running);
  useEffect(() => (): void => scheduleOnUI(freeImage, image), [image]);

  return image;
}

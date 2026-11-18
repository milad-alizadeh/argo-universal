import type * as React from 'react';
import { useEffect, useState } from 'react';
import { Easing, Text as Span } from 'react-native';
import { useReducedMotionNow } from '#kit/use-reduced-motion-now';
import type { ArrivingRunProps } from './arriving-run-props';
import { fadeMilliseconds } from './arriving-text';

type Paint = (now: number) => boolean;

const painting = new Set<Paint>();

// Match ease-streaming-text on web. A steady middle limits jumps after a late frame.
const { x1, y1, x2, y2 } = { x1: 0.3, y1: 0.12, x2: 0.7, y2: 0.88 };

const easedOpacity = Easing.bezier(x1, y1, x2, y2);

let frame: number | undefined;

function paintArrivals(): void {
  const now = performance.now();

  painting.forEach((paint) => {
    if (paint(now)) painting.delete(paint);
  });

  frame = painting.size ? requestAnimationFrame(paintArrivals) : undefined;
}

// All active runs share a frame callback. The run's start stays fixed while more text arrives.
function fade(setOpacity: (opacity: number) => void): () => void {
  const start = performance.now();

  const paint = (now: number): boolean => {
    const progress = Math.min(1, (now - start) / fadeMilliseconds);
    setOpacity(easedOpacity(progress));

    return progress === 1;
  };

  painting.add(paint);
  frame ??= requestAnimationFrame(paintArrivals);

  return (): void => {
    painting.delete(paint);
  };
}

function useShowImmediately(): boolean {
  const reduced = useReducedMotionNow();
  const [shown, setShown] = useState(reduced);

  if (reduced && !shown) setShown(true);

  return shown;
}

// Nested Text applies opacity to the glyphs inside their existing paragraph layout.
export function ArrivingRun({ children }: ArrivingRunProps): React.JSX.Element {
  const immediate = useShowImmediately();
  const [opacity, setOpacity] = useState(0);

  useEffect(() => (immediate ? undefined : fade(setOpacity)), [immediate]);

  return <Span style={{ opacity: immediate ? 1 : opacity }}>{children}</Span>;
}

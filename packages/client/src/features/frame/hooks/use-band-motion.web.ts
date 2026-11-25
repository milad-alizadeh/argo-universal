import { useLayoutEffect, useRef, useState } from 'react';
import type { FrameMotion } from '../utils/frame-timing';
import type { BandRef, BandRefs } from './band-motion-types';
import type { ViewElement } from './frame-slide-types';
import {
  type ElementFrame,
  cancelMotion,
  mayAnimate,
  playFrames,
  useCancelOnUnmount,
} from './use-frame-transition.web';

type Part = keyof BandRefs;

type Elements = Partial<Record<Part, HTMLElement>>;

type Positions = Partial<Record<Part, number>>;

interface BandElements {
  elements: Elements;
  refs: BandRefs;
}

function createBandElements(): BandElements {
  const elements: Elements = {};

  const ref =
    (part: Part): BandRef =>
    (node: ViewElement | null): void => {
      elements[part] = node instanceof HTMLElement ? node : undefined;
    };

  return { elements, refs: { title: ref('title'), moving: ref('moving') } };
}

const laidOut = (elements: Elements): Positions => ({
  title: elements.title?.offsetLeft,
  moving: elements.moving?.offsetLeft,
});

function partFrame(
  element: HTMLElement | undefined,
  from: number | undefined,
  to: number | undefined,
): ElementFrame[] {
  if (!element || from === undefined || to === undefined || from === to)
    return [];

  return [
    [
      element,
      [
        { transform: `translateX(${from - to}px)` },
        { transform: 'translateX(0px)' },
      ],
    ],
  ];
}

const bandFrames = (
  elements: Elements,
  from: Positions,
  to: Positions,
): ElementFrame[] => [
  ...partFrame(elements.title, from.title, to.title),
  ...partFrame(elements.moving, from.moving, to.moving),
];

/*
 * FLIP: the parts take their new place at once and play back from where they were laid out, by transform
 * alone, so the title bar lays out once per change and nothing reflows while the panes move. The pinned toggles never
 * move, so they need no motion.
 */
export function useBandMotion(motion: FrameMotion): BandRefs {
  const [band] = useState(createBandElements);
  const playing = useRef<Animation[]>([]);

  const last = useRef<{ key: string; positions: Positions }>({
    key: motion.transitionKey,
    positions: {},
  });

  useCancelOnUnmount(playing);
  useLayoutEffect(() => {
    const positions = laidOut(band.elements);
    const previous = last.current;
    last.current = { key: motion.transitionKey, positions };

    // A resize or an unrelated render moves the parts at once.
    if (previous.key === motion.transitionKey) return;

    cancelMotion(playing.current);
    playing.current = mayAnimate(motion.animate)
      ? playFrames(
          bandFrames(band.elements, previous.positions, positions),
          motion.timing,
        )
      : [];
  });

  return band.refs;
}

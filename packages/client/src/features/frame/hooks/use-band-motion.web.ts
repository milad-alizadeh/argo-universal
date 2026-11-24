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

// Where a part's box was laid out, ignoring any motion's transform.
interface Span {
  left: number;
  width: number;
}

type Elements = Partial<Record<Part, HTMLElement>>;

type Spans = Partial<Record<Part, Span>>;

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

const spanOf = (element: HTMLElement | undefined): Span | undefined =>
  element && { left: element.offsetLeft, width: element.offsetWidth };

const laidOut = (elements: Elements): Spans => ({
  title: spanOf(elements.title),
  moving: spanOf(elements.moving),
});

const slide = (from: Span, to: Span): Keyframe[] => [
  { transform: `translateX(${from.left - to.left}px)` },
  { transform: 'translateX(0px)' },
];

/*
 * The heading slides with its start; a heading that widens shows its new room as its end moves, by a clip that closes
 * on the same curve, and one that narrows truncates at once inside the room it ends in.
 */
function titleFrames(from: Span, to: Span): Keyframe[] {
  const [start, end] = slide(from, to);
  const hidden = Math.max(0, to.width - from.width);

  return [
    { ...start, clipPath: `inset(0px ${hidden}px 0px 0px)` },
    { ...end, clipPath: 'inset(0px 0px 0px 0px)' },
  ];
}

function partFrame(
  element: HTMLElement | undefined,
  [from, to]: readonly [Span | undefined, Span | undefined],
  frames: (from: Span, to: Span) => Keyframe[],
): ElementFrame[] {
  if (!element || !from || !to) return [];

  if (from.left === to.left && from.width === to.width) return [];

  return [[element, frames(from, to)]];
}

const bandFrames = (
  elements: Elements,
  from: Spans,
  to: Spans,
): ElementFrame[] => [
  ...partFrame(elements.title, [from.title, to.title], titleFrames),
  ...partFrame(elements.moving, [from.moving, to.moving], slide),
];

/*
 * FLIP: the parts take their new place at once and play back from where they were laid out, by transform and clip
 * alone, so the title bar lays out once per change and nothing reflows while the panes move. The pinned toggles never
 * move, so they need no motion.
 */
export function useBandMotion(motion: FrameMotion): BandRefs {
  const [band] = useState(createBandElements);
  const playing = useRef<Animation[]>([]);

  const last = useRef<{ key: string; spans: Spans }>({
    key: motion.transitionKey,
    spans: {},
  });

  useCancelOnUnmount(playing);
  useLayoutEffect(() => {
    const spans = laidOut(band.elements);
    const previous = last.current;
    last.current = { key: motion.transitionKey, spans };

    // A resize or an unrelated render moves the parts at once.
    if (previous.key === motion.transitionKey) return;

    cancelMotion(playing.current);
    playing.current = mayAnimate(motion.animate)
      ? playFrames(
          bandFrames(band.elements, previous.spans, spans),
          motion.timing,
        )
      : [];
  });

  return band.refs;
}

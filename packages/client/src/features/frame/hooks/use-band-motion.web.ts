import { useLayoutEffect, useRef, useState } from 'react';
import type {
  BandMotion,
  BandPlace,
  BandRef,
  BandRefs,
} from './band-motion-types';
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

// The groups that size to their buttons, whose width the row reads rather than computes.
type Group = 'leading' | 'trailing';

type Widths = Record<Group, number>;

const isGroup = (part: Part): part is Group =>
  part === 'leading' || part === 'trailing';

interface BandState {
  widths: Widths;
  place: BandPlace;
}

// The row's elements, and each group's width as last laid out, before the change that moves it.
interface BandElements {
  elements: Elements;
  laidOut: Widths;
  refs: BandRefs;
}

function groupWidths(read: (group: Group) => number): Widths {
  return { leading: read('leading'), trailing: read('trailing') };
}

const laidOutNow = (elements: Elements): Widths =>
  groupWidths((group) => elements[group]?.offsetWidth ?? 0);

function partRef(
  part: Part,
  band: Omit<BandElements, 'refs'>,
  observer: ResizeObserver,
): BandRef {
  return (node: ViewElement | null): void => {
    const element = node instanceof HTMLElement ? node : undefined;
    const last = band.elements[part];

    if (last && isGroup(part)) observer.unobserve(last);
    band.elements[part] = element;

    if (element && isGroup(part)) observer.observe(element);
  };
}

function createBandElements(): BandElements {
  const elements: Elements = {};
  const laidOut: Widths = { leading: 0, trailing: 0 };
  const observer = new ResizeObserver(() => {
    Object.assign(laidOut, laidOutNow(elements));
  });
  const ref = (part: Part): BandRef =>
    partRef(part, { elements, laidOut }, observer);

  return {
    elements,
    laidOut,
    refs: {
      leading: ref('leading'),
      title: ref('title'),
      trailing: ref('trailing'),
      leadingCapsule: ref('leadingCapsule'),
      trailingCapsule: ref('trailingCapsule'),
    },
  };
}

const pixels = (value: number): string => `${value}px`;

function widthFrame(
  element: HTMLElement | undefined,
  from: number,
  to: number,
): ElementFrame[] {
  if (!element || from === to) return [];

  return [[element, [{ width: pixels(from) }, { width: pixels(to) }]]];
}

const titleFrame = ({ titleStart, titleEnd }: BandPlace): Keyframe => ({
  paddingLeft: pixels(titleStart),
  paddingRight: pixels(titleEnd),
});

function titleFrames(
  element: HTMLElement | undefined,
  from: BandPlace,
  to: BandPlace,
): ElementFrame[] {
  if (!element) return [];

  return [[element, [titleFrame(from), titleFrame(to)]]];
}

function capsuleFrame(
  element: HTMLElement | undefined,
  from: boolean,
  to: boolean,
): ElementFrame[] {
  if (!element || from === to) return [];

  return [[element, [{ opacity: Number(from) }, { opacity: Number(to) }]]];
}

function bandFrames(
  elements: Elements,
  from: BandState,
  to: BandState,
): ElementFrame[] {
  return [
    ...widthFrame(elements.leading, from.widths.leading, to.widths.leading),
    ...widthFrame(elements.trailing, from.widths.trailing, to.widths.trailing),
    ...titleFrames(elements.title, from.place, to.place),
    ...capsuleFrame(
      elements.leadingCapsule,
      from.place.leadingCapsule,
      to.place.leadingCapsule,
    ),
    ...capsuleFrame(
      elements.trailingCapsule,
      from.place.trailingCapsule,
      to.place.trailingCapsule,
    ),
  ];
}

const running = (motion: readonly Animation[]): boolean =>
  motion.some((animation) => animation.playState === 'running');

const pixelsOf = (value: string): number => Number.parseFloat(value) || 0;

// Where a running motion has the title now, so a change mid-motion carries on from there.
function shownPlace(elements: Elements, last: BandPlace): BandPlace {
  const title = elements.title && getComputedStyle(elements.title);

  return {
    ...last,
    titleStart: title ? pixelsOf(title.paddingLeft) : last.titleStart,
    titleEnd: title ? pixelsOf(title.paddingRight) : last.titleEnd,
  };
}

// Where the row showed before this change: mid-motion as drawn now, at rest as last laid out.
function startingState(
  band: BandElements,
  motion: readonly Animation[],
  last: BandPlace,
): BandState {
  const { elements } = band;

  return running(motion)
    ? { widths: laidOutNow(elements), place: shownPlace(elements, last) }
    : { widths: { ...band.laidOut }, place: last };
}

/*
 * The row takes its new layout at once and plays back from where it showed, as the panes do: the groups' widths, the
 * title's ends and the capsules' pills move on the panes' timing, so each button rides its group's edge and the
 * toggles pinned to the row's ends stay still.
 */
export function useBandMotion(motion: BandMotion): BandRefs {
  const [band] = useState(createBandElements);
  const playing = useRef<Animation[]>([]);
  const previous = useRef(motion);
  useCancelOnUnmount(playing);
  useLayoutEffect(() => {
    const last = previous.current;
    previous.current = motion;

    // A resize moves immediately; an unrelated render leaves an ongoing motion alone.
    if (last.transitionKey === motion.transitionKey) return;

    const from = startingState(band, playing.current, last.place);
    cancelMotion(playing.current);
    const { elements } = band;
    const to = { widths: laidOutNow(elements), place: motion.place };
    playing.current = mayAnimate(motion.animate)
      ? playFrames(bandFrames(elements, from, to), motion.timing)
      : [];
  }, [band, motion]);

  return band.refs;
}

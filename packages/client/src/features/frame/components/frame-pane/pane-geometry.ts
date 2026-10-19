import { useState } from 'react';
import type { FramePaneProps } from './frame-pane';
import { stableContentWidth } from './stable-content-width';

export interface PaneGeometry {
  width: number;
  offset: number;
  contentWidth: number;
  transitionKey: string;
  frameWidth: number;
  hidden: boolean;
}

type PanePlacement = Pick<
  FramePaneProps,
  'width' | 'offset' | 'contentWidth' | 'transitionKey' | 'hidden'
>;

const placementKeys = [
  'width',
  'offset',
  'contentWidth',
  'transitionKey',
  'hidden',
] as const;

const frameKeys = ['transitionKey', 'width', 'contentWidth'] as const;

function matches(
  held: PaneGeometry,
  next: PaneGeometry,
  keys: readonly (keyof PaneGeometry)[],
): boolean {
  return keys.every((key) => held[key] === next[key]);
}

function initialGeometry({
  width,
  offset,
  contentWidth = width,
  transitionKey,
  hidden,
}: PanePlacement): PaneGeometry {
  const frameWidth = Math.max(width, contentWidth);

  return { width, offset, contentWidth, transitionKey, frameWidth, hidden };
}

function heldPlacement(
  held: PaneGeometry,
  placement: PanePlacement,
): PaneGeometry {
  const { width, offset, transitionKey, hidden } = placement;

  const contentWidth = stableContentWidth(
    placement.contentWidth,
    width,
    held.contentWidth,
  );

  return { ...held, width, offset, contentWidth, transitionKey, hidden };
}

// The frame keeps its width until the transition, width or content width changes, so a running slide stays inside it.
function nextGeometry(
  held: PaneGeometry,
  placement: PanePlacement,
): PaneGeometry {
  const next = heldPlacement(held, placement);

  if (matches(held, next, frameKeys)) return next;
  const frameWidth = Math.max(next.width, held.width, next.contentWidth);

  return { ...next, frameWidth };
}

export function usePaneGeometry(placement: PanePlacement): PaneGeometry {
  const [held, setHeld] = useState(() => initialGeometry(placement));
  const next = nextGeometry(held, placement);

  if (matches(held, next, placementKeys)) return held;
  setHeld(next);

  return next;
}

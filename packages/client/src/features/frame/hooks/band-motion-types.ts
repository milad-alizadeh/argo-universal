import type { ViewElement } from './frame-slide-types';

export type BandRef = ((node: ViewElement | null) => void) | undefined;

// The title bar's parts that move as the panes do: the heading, and the buttons that ride the Inspector's edge.
export interface BandRefs {
  title: BandRef;
  moving: BandRef;
}

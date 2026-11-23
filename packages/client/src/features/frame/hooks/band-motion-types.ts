import type { FrameMotion } from '../utils/frame-timing';
import type { ViewElement } from './frame-slide-types';

// Where the title bar's row puts the title between its leading and trailing groups, and which group floats on its capsule.
export interface BandPlace {
  titleStart: number;
  titleEnd: number;
  leadingCapsule: boolean;
  trailingCapsule: boolean;
}

export interface BandMotion extends FrameMotion {
  place: BandPlace;
}

export type BandRef = ((node: ViewElement | null) => void) | undefined;

// The row's parts that move as the sidebar and the Inspector open and close.
export interface BandRefs {
  leading: BandRef;
  title: BandRef;
  trailing: BandRef;
  leadingCapsule: BandRef;
  trailingCapsule: BandRef;
}

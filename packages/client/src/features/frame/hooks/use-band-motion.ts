import type { FrameMotion } from '../utils/frame-timing';
import type { BandRefs } from './band-motion-types';

const unmoved: BandRefs = { title: undefined, moving: undefined };

// A tablet's title bar takes its new place at once; the web's moves with the panes.
export function useBandMotion(_motion: FrameMotion): BandRefs {
  return unmoved;
}

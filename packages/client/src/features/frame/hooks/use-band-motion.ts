import type { BandMotion, BandRefs } from './band-motion-types';

const unmoved: BandRefs = {
  leading: undefined,
  title: undefined,
  trailing: undefined,
  leadingCapsule: undefined,
  trailingCapsule: undefined,
};

// A tablet's title bar takes its new place at once; the web's moves with the panes.
export function useBandMotion(_motion: BandMotion): BandRefs {
  return unmoved;
}

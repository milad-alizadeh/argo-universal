import type { ScrollFadeTracking } from './scroll-fade-options';

const noTracking: ScrollFadeTracking = {};

// The web's fade follows the scroll in CSS alone.
export function useScrollFadeTracking(): ScrollFadeTracking {
  return noTracking;
}

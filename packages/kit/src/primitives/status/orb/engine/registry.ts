// Mode key → frame painter. Kept separate from the presets so tree
// shaking can in principle drop unused modes in custom builds.

import { drawGlobe, drawRubik, drawWave } from './lattice';
import { drawMorph } from './morph';
import { drawOrbits } from './orbits';
import type { ModeKey } from './presets';
import { drawRibbon } from './ribbon';
import type { ModeDraw } from './types';

export const MODE_DRAWS: Record<ModeKey, ModeDraw> = {
  orbits: drawOrbits,
  globe: drawGlobe,
  rubik: drawRubik,
  wave: drawWave,
  ribbon: drawRibbon,
  morph: drawMorph,
};

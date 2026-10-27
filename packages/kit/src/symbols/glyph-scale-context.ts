import { createContext } from 'react';
import type { GlyphScale } from './glyph-sizing';

// The glyph scale a control holds its icons to, whatever the window; none leaves it to the window.
export const GlyphScaleContext = createContext<GlyphScale | undefined>(
  undefined,
);

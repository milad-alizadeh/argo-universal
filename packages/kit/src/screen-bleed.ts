import { createContext, use } from 'react';

/*
 * A Screen whose width is `bleed` runs its content to the edges with no margins; a canvas in it fills the body's
 * height as well as its width, rather than keeping its own aspect ratio.
 */
export const ScreenBleedContext = createContext(false);

export const useScreenBleed = (): boolean => use(ScreenBleedContext);

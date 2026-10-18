import type { GlassSurfaceProps } from './glass-surface';

/*
 * An Android tablet's rail and list sit flat on the window's content surface, as Paper's
 * "Android / Session open" does (#927): Material has no glass panel.
 */
export function GlassSurface(_props: GlassSurfaceProps): null {
  return null;
}

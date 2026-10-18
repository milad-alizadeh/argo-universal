export interface GlassSurfaceProps {
  // The panel's width now, and its width with the sidebar list shown.
  width: number;
  expandedWidth: number;
  transitionKey: string;
  animate: boolean;
}

/*
 * The glass panel behind the rail and the sidebar list is drawn on the web and desktop only. A tablet's rail and list
 * sit flat on the window's content surface, as Paper's "Android / Session open" does (#927).
 */
export function GlassSurface(_props: GlassSurfaceProps): null {
  return null;
}

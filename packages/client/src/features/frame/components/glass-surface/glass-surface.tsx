import type { FrameMotion } from '../../utils/frame-timing';

export interface GlassSurfaceProps extends FrameMotion {
  // The panel's width now, and its width with the sidebar list shown.
  width: number;
  expandedWidth: number;
  // The rail at the panel's left, tinted below the shared top bar.
  railWidth: number;
  // The shared top bar's height: the panel runs under it while the sidebar shows and starts below it once only the rail is left.
  barHeight: number;
  sidebarShown: boolean;
}

/*
 * The glass panel behind the rail and the sidebar list is drawn on the web and desktop only. A tablet's rail and list
 * sit flat on the window's content surface, as Paper's "Android / Session open" does (#927).
 */
export function GlassSurface(_props: GlassSurfaceProps): null {
  return null;
}

import type { FrameMotion } from '../../utils/frame-timing';

export interface GlassSurfaceProps extends FrameMotion {
  // The panel's width now, 0 once the sidebar closes.
  width: number;
  // The rail at the panel's left, tinted below the title bar.
  railWidth: number;
  // The title bar's row at the panel's top, which the rail's tint starts below; a panel with the rail alone starts below it.
  barHeight: number;
  sidebarShown: boolean;
  // Where the column starts in the window, which moves to its edge once the sidebar closes.
  origin: number;
  // The closed sidebar's capsule, in the window from the column's top: the panel's glass shrinks into it.
  pill?: GlassPill;
}

export interface GlassPill {
  x: number;
  y: number;
  width: number;
  height: number;
}

/*
 * The glass panel behind the rail and the sidebar list is drawn on the web and desktop only. A tablet's rail and list
 * sit flat on the window's content surface, as Paper's "Android / Session open" does (#927).
 */
export function GlassSurface(_props: GlassSurfaceProps): null {
  return null;
}

import { createContext } from 'react';
import type { LiquidGlassProps } from './liquid-glass-props';

export const LiquidGlassMaterial = createContext(false);

export const glassCornerClass = {
  container: 'rounded-2xl',
  sheet: 'rounded-sheet',
  pill: 'rounded-full',
} as const;

/*
 * The one glass material the web and desktop draw where there is no system Liquid Glass: the sidebar, the Composer,
 * the Workbench's cards and the pills and buttons floating over the Feed. Every glass surface takes its fill, edge and
 * frost from here rather than spelling out its own, so no two of them drift apart. The sidebar draws the parts on
 * separate layers, so they are exported apart as well as together.
 */
export const glassMaterial = {
  fill: 'web:bg-glass',
  edge: 'web:shadow-glass',
  frost: 'web:backdrop-blur-glass web:backdrop-saturate-180',
} as const;

// Where a platform has neither system glass nor the web's material (earlier iOS, Android), glass is a plain card.
export const plainGlassClass = 'bg-card shadow-card';

const unfrostedGlass = `${plainGlassClass} ${glassMaterial.fill} ${glassMaterial.edge}`;

const frostedGlass = `${unfrostedGlass} ${glassMaterial.frost}`;

/*
 * The whole material, frosted unless the caller says only a flat surface lies behind it: see LiquidGlass's
 * `frosted`. A surface that floats over content, as the Feed's pills do, keeps the frost.
 */
export const glassMaterialClass = (frosted = true): string =>
  frosted ? frostedGlass : unfrostedGlass;

// A caller's own fallback wins over the shared one.
export const fallbackSurfaceClass = (
  look: Pick<LiquidGlassProps, 'fallbackClassName' | 'frosted'>,
): string => look.fallbackClassName ?? glassMaterialClass(look.frosted);

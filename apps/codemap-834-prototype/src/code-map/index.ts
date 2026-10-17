/*
 * The Code Map module: ADR-0028's `CodeMap`, plus the palette and plate styles a page reuses for
 * its own plates. Everything else in this folder is internal to the Code Map.
 */
export { CodeMap, type CodeMapProps } from './code-map';

export { button, plate } from './map-styles';

export type { CodeMapFile, Palette, RendererInfo, View } from './model';

export { usePalette } from './palette';

export { supports3d } from './webgl';

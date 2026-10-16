import type { MapOverlay } from './map-overlay';

/** One file as ADR-0028's `CodeMap` takes it; folders come from the paths. */
export interface CodeMapFile {
  id: string;
  path: string;
  area: number;
  height?: number;
  tone: string;
}

export interface Tile extends CodeMapFile {
  x: number;
  y: number;
  w: number;
  h: number;
  elevation: number;
}

export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Palette {
  light: string;
  card: string;
  foreground: string;
  border: string;
  mutedForeground: string;
  warning: string;
  danger: string;
  muted: string;
}

export type View = '3d' | 'flat';

export interface RendererInfo {
  engine: string;
  dpr: number;
  files: number;
  renderer?: string;
}

/** What the Code Map hands its mounted renderer; every prop is stable between selections. */
export interface RendererProps {
  tiles: Tile[];
  palette: Palette;
  selected?: string;
  onSelect: (id: string) => void;
  overlay: MapOverlay;
}

export function tileColor(tile: CodeMapFile, palette: Palette): string {
  if (tile.tone === 'danger') return palette.danger;

  if (tile.tone === 'warning') return palette.warning;

  return palette.border;
}

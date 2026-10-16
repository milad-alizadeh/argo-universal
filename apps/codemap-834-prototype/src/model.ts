import dataset from './dataset.json';
import type { MapOverlay } from './map-overlay';

export { layout, mapExtent } from './treemap';

/** One file as ADR-0028's `CodeMap` takes it; folders come from the paths. */
export interface CodeMapFile {
  id: string;
  path: string;
  area: number;
  height?: number;
  tone: string;
}

/** A snapshot file; `branches` is the measure its tone came from. */
export interface FileEntry extends CodeMapFile {
  height: number;
  branches: number;
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

export interface PanResult {
  frames: number;
  elapsedMs: number;
  fps: number;
  p95FrameMs: number;
  metric: string;
  drawCalls?: number;
  triangles?: number;
}

/** What the Code Map hands its mounted renderer; every prop is stable between selections. */
export interface RendererProps {
  tiles: Tile[];
  palette: Palette;
  selected?: string;
  onSelect: (id: string) => void;
  overlay: MapOverlay;
}

export const source = dataset;

function replica(index: number): FileEntry {
  const file = dataset.files.at(index % dataset.files.length);

  if (!file) throw new Error('The CodeMap snapshot must contain files');
  const copy = Math.floor(index / dataset.files.length);

  if (!copy) return file;

  return {
    ...file,
    id: `stress-${copy}/${file.id}`,
    path: `stress-${copy}/${file.path}`,
  };
}

export function getFiles(count: number): FileEntry[] {
  if (!count) return dataset.files;

  return Array.from({ length: count }, (_, index) => replica(index));
}

export function tileColor(tile: CodeMapFile, palette: Palette): string {
  if (tile.tone === 'danger') return palette.danger;

  if (tile.tone === 'warning') return palette.warning;

  return palette.border;
}

import type { RefObject } from 'react';
import dataset from './dataset.json';

export { layout } from './treemap';

export { cullLabels } from './labels';

export interface FileEntry {
  id: string;
  path: string;
  area: number;
  height: number;
  branches: number;
  tone: string;
}

export interface Tile extends FileEntry {
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

export interface Label {
  id: string;
  text: string;
  x: number;
  y: number;
}

export type View = '3d' | 'flat';

export type CameraAction = 'fit' | 'in' | 'out';

export interface CameraCommand {
  action: CameraAction;
  key: number;
}

export interface FlatCameraControls {
  run: (action: CameraAction) => void;
}

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

export interface MapProps {
  tiles: Tile[];
  palette: Palette;
  selected?: string;
  command: CameraCommand;
  cameraRef: RefObject<FlatCameraControls | null>;
  onSelect: (id: string) => void;
  onLabels: (labels: Label[]) => void;
  onReady: (info: RendererInfo) => void;
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

export function tileColor(tile: FileEntry, palette: Palette): string {
  if (tile.tone === 'danger') return palette.danger;

  if (tile.tone === 'warning') return palette.warning;

  return palette.border;
}

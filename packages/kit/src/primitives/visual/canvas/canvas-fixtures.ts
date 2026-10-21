import type { CanvasProps } from './canvas-props';

// The selection is state the scene holds, so a fixture leaves it out.
type CanvasFixture = Omit<CanvasProps, 'children' | 'selectedKey'>;

export const heatmapCanvas = {
  label: 'Build activity',
  width: 360,
  height: 216,
  camera: 'pan-zoom',
} satisfies CanvasFixture;

export const filesCanvas = {
  label: 'Files',
  width: 360,
  height: 216,
  camera: 'pan-zoom',
} satisfies CanvasFixture;

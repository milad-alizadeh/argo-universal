import type { Bounds, Camera } from './canvas-props';
import type { SceneEntry } from './canvas-scene-types';

export interface LabelsProps {
  entries: SceneEntry[];
  view: Camera;
  frame: Bounds;
  onBounds: (key: string, bounds?: Bounds) => void;
}

export interface LabelProps {
  entry: SceneEntry;
  box: Bounds;
  angle: number;
  onBounds: LabelsProps['onBounds'];
}

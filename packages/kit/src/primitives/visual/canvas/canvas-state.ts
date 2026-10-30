import { useCallback, useState } from 'react';
import { initialCamera } from './canvas-camera';
import { updateLabelBounds } from './canvas-label-bounds';
import type { Bounds, CanvasProps, Camera } from './canvas-props';
import type { SceneEntry } from './canvas-scene-types';

export interface CanvasControls {
  camera: Camera;
  onCamera: (camera: Camera) => void;
  selected?: string;
  onSelect: (entry: SceneEntry) => void;
  hover?: string;
  setHover: (key?: string) => void;
  labelHits: Map<string, Bounds>;
  onBounds: (key: string, bounds?: Bounds) => void;
}

interface Selection {
  source?: string;
  key?: string;
}

function useSelection(
  selectedKey?: string,
): Pick<CanvasControls, 'selected' | 'onSelect'> {
  const initial = { source: selectedKey, key: selectedKey };
  const [selection, set] = useState<Selection>(initial);

  if (selection.source !== selectedKey) set(initial);

  /*
   * Reading the source from the state it sets leaves the handler holding nothing from the render
   * that made it, so it stays the same function: every shape's accessible row takes this handler,
   * and a new one on each render would redraw them all.
   */
  const onSelect = useCallback<CanvasControls['onSelect']>((entry) => {
    set((previous) => ({ source: previous.source, key: entry.address }));
    entry.onPress?.();
  }, []);

  return { selected: selection.key, onSelect };
}

function useLabelHits(): Pick<CanvasControls, 'labelHits' | 'onBounds'> {
  const [labelHits, setLabelHits] = useState(() => new Map<string, Bounds>());

  const onBounds = useCallback((key: string, bounds?: Bounds): void => {
    setLabelHits((previous) => updateLabelBounds(previous, key, bounds));
  }, []);

  return { labelHits, onBounds };
}

export function useCanvasControls(props: CanvasProps): CanvasControls {
  const [camera, onCamera] = useState(initialCamera);
  const selection = useSelection(props.selectedKey);
  const [hover, setHover] = useState<string>();
  const labels = useLabelHits();

  return { camera, onCamera, ...selection, hover, setHover, ...labels };
}

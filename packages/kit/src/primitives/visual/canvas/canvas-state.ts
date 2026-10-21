import { useCallback, useState, useMemo } from 'react';
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

function selectionHandler(
  source: string | undefined,
  set: React.Dispatch<React.SetStateAction<Selection>>,
): CanvasControls['onSelect'] {
  return (entry) => {
    set({ source, key: entry.address });
    entry.onPress?.();
  };
}

function useSelection(
  selectedKey?: string,
): Pick<CanvasControls, 'selected' | 'onSelect'> {
  const initial = { source: selectedKey, key: selectedKey };
  const [selection, set] = useState<Selection>(initial);

  if (selection.source !== selectedKey) set(initial);

  const onSelect = useMemo(
    () => selectionHandler(selectedKey, set),
    [selectedKey],
  );

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

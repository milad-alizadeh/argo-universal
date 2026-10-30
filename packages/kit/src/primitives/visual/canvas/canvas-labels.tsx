import { View } from 'react-native';
import { CanvasLabel } from './canvas-label';
import { isTextEntry } from './canvas-label-containers';
import { labelBox } from './canvas-label-layout';
import type { LabelsProps } from './canvas-label-props';
import type { Bounds } from './canvas-props';
import type { SceneEntry } from './canvas-scene-types';

function visibleLabel(
  entry: SceneEntry,
  props: LabelsProps,
): React.JSX.Element[] {
  if (!isTextEntry(entry)) return [];
  const box = labelBox(entry, props);

  if (!fitsBox(box)) return [];

  const label = {
    entry,
    box,
    angle: Math.atan2(entry.matrix[3], entry.matrix[0]),
    onBounds: props.onBounds,
  };

  return [<CanvasLabel key={entry.address} {...label} />];
}

function fitsBox(box: Bounds): boolean {
  return box.width > 0 && box.height > 0;
}

export function CanvasLabels(props: LabelsProps): React.JSX.Element {
  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={{ position: 'absolute', inset: 0 }}
    >
      {props.entries.flatMap((entry) => visibleLabel(entry, props))}
    </View>
  );
}

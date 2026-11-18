import type * as React from 'react';
import { useState } from 'react';
import { useWindowDimensions } from 'react-native';
import type { FrameMeasures } from './frame-layout';
import { listWidthForText } from './frame-layout-measures';

export interface PreferredWidths {
  preferredListWidth: number;
  preferredInspectorWidth: number;
  setPreferredListWidth: (width: number) => void;
  setPreferredInspectorWidth: React.Dispatch<React.SetStateAction<number>>;
  draggedContentFloor: number | undefined;
  setDraggedContentFloor: (width: number | undefined) => void;
}

type InspectorWidths = Pick<
  PreferredWidths,
  | 'preferredInspectorWidth'
  | 'setPreferredInspectorWidth'
  | 'draggedContentFloor'
  | 'setDraggedContentFloor'
>;

// Keep the floor that goes with the dragged width. The layout uses its normal floor while the Inspector is closed.
function useInspectorWidths(defaultWidth: number): InspectorWidths {
  const [preferredInspectorWidth, setPreferredInspectorWidth] =
    useState(defaultWidth);

  const [draggedContentFloor, setDraggedContentFloor] = useState<number>();

  return {
    preferredInspectorWidth,
    setPreferredInspectorWidth,
    draggedContentFloor,
    setDraggedContentFloor,
  };
}

export function usePreferredWidths(measures: FrameMeasures): PreferredWidths {
  const [draggedListWidth, setPreferredListWidth] = useState<number>();
  const fontScale = useWindowDimensions().fontScale;

  const preferredListWidth =
    draggedListWidth ?? listWidthForText(measures.listWidth, fontScale);

  return {
    preferredListWidth,
    setPreferredListWidth,
    ...useInspectorWidths(measures.inspectorWidth),
  };
}

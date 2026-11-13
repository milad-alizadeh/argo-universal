import { useState } from 'react';
import { useWindowDimensions } from 'react-native';
import type { FrameMeasures } from './frame-layout';
import { listWidthForText } from './frame-layout-measures';

export interface PreferredWidths {
  preferredListWidth: number;
  preferredInspectorWidth: number;
  setPreferredListWidth: (width: number) => void;
  setPreferredInspectorWidth: (width: number) => void;
  draggedContentFloor: number | undefined;
  setDraggedContentFloor: (width: number) => void;
}

type InspectorWidths = Pick<
  PreferredWidths,
  | 'preferredInspectorWidth'
  | 'setPreferredInspectorWidth'
  | 'draggedContentFloor'
  | 'setDraggedContentFloor'
>;

// The Inspector's dragged width, and the page's width that drag left.
function useInspectorWidths(measures: FrameMeasures): InspectorWidths {
  const [preferredInspectorWidth, setPreferredInspectorWidth] = useState(
    measures.inspectorWidth,
  );

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
    ...useInspectorWidths(measures),
  };
}

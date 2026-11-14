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

type State<Value> = [Value, React.Dispatch<React.SetStateAction<Value>>];

// A closed Inspector gives the content its floor back, but keeps the width it had, so it reopens where it was.
function restoreContentFloor([floor, setFloor]: State<
  number | undefined
>): void {
  if (floor !== undefined) setFloor(undefined);
}

// The Inspector's dragged width, and the page's width that drag left, which it keeps only while it stays open.
function useInspectorWidths(
  measures: FrameMeasures,
  closed: boolean,
): InspectorWidths {
  const width = useState(measures.inspectorWidth);
  const floor = useState<number>();

  if (closed) restoreContentFloor(floor);

  return {
    preferredInspectorWidth: width[0],
    setPreferredInspectorWidth: width[1],
    draggedContentFloor: floor[0],
    setDraggedContentFloor: floor[1],
  };
}

export function usePreferredWidths(
  measures: FrameMeasures,
  inspectorClosed: boolean,
): PreferredWidths {
  const [draggedListWidth, setPreferredListWidth] = useState<number>();
  const fontScale = useWindowDimensions().fontScale;

  const preferredListWidth =
    draggedListWidth ?? listWidthForText(measures.listWidth, fontScale);

  return {
    preferredListWidth,
    setPreferredListWidth,
    ...useInspectorWidths(measures, inspectorClosed),
  };
}

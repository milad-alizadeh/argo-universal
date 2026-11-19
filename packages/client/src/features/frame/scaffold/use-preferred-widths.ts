import { useState } from 'react';
import { useWindowDimensions } from 'react-native';
import type { FrameMeasures } from './frame-layout';
import { listWidthForText } from './frame-layout-measures';
import { defaultInspector, type InspectorWidth } from './inspector-width';
import type { ScaffoldProps } from './scaffold-props';

export interface PreferredWidths {
  preferredListWidth: number;
  preferredInspectorWidth: number;
  inspectorUndragged: boolean;
  setPreferredListWidth: (width: number) => void;
  draggedContentFloor: number | undefined;
  setInspectorWidth: (width: InspectorWidth) => void;
}

type InspectorWidths = Pick<
  PreferredWidths,
  | 'preferredInspectorWidth'
  | 'inspectorUndragged'
  | 'draggedContentFloor'
  | 'setInspectorWidth'
>;

type InspectorWidthProps = Pick<
  ScaffoldProps,
  'inspectorWidth' | 'onInspectorWidthChange'
>;

// The caller's width when it keeps one, else the Scaffold's own. The floor goes with the dragged width; the layout uses its normal floor while the Inspector is closed.
function useInspectorWidths(
  { inspectorWidth, onInspectorWidthChange }: InspectorWidthProps,
  minimum: number,
): InspectorWidths {
  const [local, setLocal] = useState(defaultInspector);
  const held = inspectorWidth ?? local;

  return {
    preferredInspectorWidth: Math.max(minimum, held.width),
    inspectorUndragged: held === defaultInspector,
    draggedContentFloor: held.contentFloor,
    setInspectorWidth: onInspectorWidthChange ?? setLocal,
  };
}

export function usePreferredWidths(
  measures: FrameMeasures,
  scaffold: InspectorWidthProps,
): PreferredWidths {
  const [draggedListWidth, setPreferredListWidth] = useState<number>();
  const fontScale = useWindowDimensions().fontScale;

  const preferredListWidth =
    draggedListWidth ?? listWidthForText(measures.listWidth, fontScale);

  return {
    preferredListWidth,
    setPreferredListWidth,
    ...useInspectorWidths(scaffold, measures.inspectorWidth),
  };
}

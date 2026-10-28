import type { ReactNode, RefObject } from 'react';
import type { ViewInstance } from 'react-native';
import type { PressTarget } from './list-row-press';

// The view a movable row draws in, which turns a press on it into a drag of row `id`, drawn as `ghost` once lifted.
export interface RowDragProps extends PressTarget {
  // The row's resting view, which the drag measures.
  viewRef: RefObject<ViewInstance | null>;
  children: ReactNode;
}

import type { ReactNode, RefObject } from 'react';
import type { ViewInstance } from 'react-native';
import type { ListDrag } from './list-drag-controller';

// The view a movable row draws in, which turns a press on it into a drag of row `id`.
export interface RowDragProps {
  drag: ListDrag;
  id: string;
  // What the lifted copy draws.
  ghost: ReactNode;
  // The row's resting view, which the drag measures.
  viewRef: RefObject<ViewInstance | null>;
  children: ReactNode;
}

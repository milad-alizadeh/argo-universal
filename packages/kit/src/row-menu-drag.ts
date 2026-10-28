import { createContext } from 'react';
import type { PanGesture } from 'react-native-gesture-handler';
import type { ListenerSet } from './listener-set';

/*
 * The drag a movable row's context menu sits in. On Android the menu's long press runs beside the row's Pan and the
 * menu closes when the Pan lifts the row, so a long press opens the menu and a move then drags the row.
 */
export interface RowMenuDrag {
  gesture: PanGesture;
  onLift: ListenerSet['subscribe'];
}

export const RowMenuDragContext = createContext<RowMenuDrag | undefined>(
  undefined,
);

import { createContext } from 'react';
import type { LongPressGestureConfig } from 'react-native-gesture-handler';

// Any one gesture a long press can run beside.
type Beside = Exclude<
  NonNullable<LongPressGestureConfig['simultaneousWith']>,
  unknown[]
>;

/*
 * A gesture an element's context menu shares the touch with. On Android the menu's long press runs beside it, and the
 * menu closes when the peer takes the touch over, so a long press opens the menu and a later move hands the touch on.
 */
export interface ContextMenuPeer<Gesture extends Beside = Beside> {
  gesture: Gesture;
  // Calls `listener` each time the peer takes the touch over; returns what stops it.
  onTakeOver: (listener: () => void) => () => void;
}

export const ContextMenuPeerContext = createContext<
  ContextMenuPeer | undefined
>(undefined);

import type { RefObject } from 'react';
import { AccessibilityInfo, type ViewInstance } from 'react-native';

/*
 * iOS and Android: the screen reader's focus moves to the row. A screen reader's focus cannot be read, so a row only
 * takes it when asked outright, never `ifLost`.
 */
export function focusView(
  view: RefObject<ViewInstance | null>,
  ifLost: boolean,
): void {
  const current = view.current;

  if (current && !ifLost)
    AccessibilityInfo.sendAccessibilityEvent(current, 'focus');
}

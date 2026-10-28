import type { RefObject } from 'react';
import { AccessibilityInfo, type ViewInstance } from 'react-native';

// iOS and Android: the screen reader's focus moves to the row.
export function focusView(view: RefObject<ViewInstance | null>): void {
  const current = view.current;

  if (current) AccessibilityInfo.sendAccessibilityEvent(current, 'focus');
}

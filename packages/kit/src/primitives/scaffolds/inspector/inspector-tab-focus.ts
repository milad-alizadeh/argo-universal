import { useLayoutEffect, useRef, type RefObject } from 'react';
import type { ViewInstance } from 'react-native';
import type { InspectorTabsProps } from './inspector-props';

export interface TabFocus {
  selected: RefObject<ViewInstance | null>;
  close: (key: string) => void;
}

// Closing removes the focused button; put focus on the tab the owner selects in its place.
export function useTabFocus(tabs: InspectorTabsProps): TabFocus {
  const selected = useRef<ViewInstance>(null);
  const closing = useRef(false);

  useLayoutEffect(() => {
    if (closing.current) selected.current?.focus();
    closing.current = false;
  }, [tabs.selected]);

  return {
    selected,
    close: (key) => {
      closing.current = true;
      tabs.onClose(key);
    },
  };
}

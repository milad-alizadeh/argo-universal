import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { useCSSVariable } from 'uniwind';

/*
 * The native root view shows wherever no screen covers the window: rotation,
 * the keyboard, a sheet's presentation, transitions. It takes the content
 * surface, and follows it between light and dark.
 */
export function useWindowBackground(): void {
  const content = useCSSVariable('--color-content');

  useEffect(() => {
    if (typeof content === 'string') {
      void SystemUI.setBackgroundColorAsync(content);
    }
  }, [content]);
}

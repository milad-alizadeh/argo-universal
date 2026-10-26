import { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { usePageFocused } from '#kit/use-shown-page';
import type { ContentSelection } from './list-content-selection';

// A Screen covered by another one stays mounted in its stack, so only the focused one may take Back.
const takesBack = (
  focused: boolean,
  selection: ContentSelection | null,
): boolean => focused && selection?.selecting === true;

export function useSelectionBack(selection: ContentSelection | null): void {
  const selecting = takesBack(usePageFocused(), selection);
  const close = selection?.close;

  useEffect(() => {
    if (!selecting || !close) return;

    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      close();

      return true;
    });

    return (): void => listener.remove();
  }, [selecting, close]);
}

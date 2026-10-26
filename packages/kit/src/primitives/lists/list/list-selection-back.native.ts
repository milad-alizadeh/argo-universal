import { useEffect } from 'react';
import { BackHandler } from 'react-native';
import type { ContentSelection } from './list-content-selection';

export function useSelectionBack(selection: ContentSelection | null): void {
  useEffect(() => {
    if (!selection?.editing) return;

    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      selection.change([]);
      selection.setEditing(false);

      return true;
    });

    return (): void => listener.remove();
  }, [selection]);
}

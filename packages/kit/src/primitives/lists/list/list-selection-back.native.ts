import { useEffect } from 'react';
import { BackHandler } from 'react-native';
import type { ContentSelection } from './list-content-selection';

export function useSelectionBack(selection: ContentSelection | null): void {
  const editing = selection?.editing;
  const close = selection?.close;

  useEffect(() => {
    if (!editing || !close) return;

    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      close();

      return true;
    });

    return (): void => listener.remove();
  }, [editing, close]);
}

import { NavigationContext } from 'expo-router/react-navigation';
import { use, useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import type { ContentSelection } from './list-content-selection';

// A Screen covered by another one stays mounted in its stack, so only the focused one may take Back.
function useScreenFocused(): boolean {
  const navigation = use(NavigationContext);
  const [focused, setFocused] = useState(() => navigation?.isFocused() ?? true);

  useEffect(() => {
    if (!navigation) return;
    const offFocus = navigation.addListener('focus', () => setFocused(true));
    const offBlur = navigation.addListener('blur', () => setFocused(false));

    return (): void => {
      offFocus();
      offBlur();
    };
  }, [navigation]);

  return focused;
}

const takesBack = (
  focused: boolean,
  selection: ContentSelection | null,
): boolean => focused && selection?.selecting === true;

export function useSelectionBack(selection: ContentSelection | null): void {
  const selecting = takesBack(useScreenFocused(), selection);
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

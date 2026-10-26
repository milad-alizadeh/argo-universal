import { NavigationContext } from 'expo-router/react-navigation';
import { use, useMemo, useSyncExternalStore } from 'react';
import { useWide } from './use-wide/use-wide';

type Navigation = NonNullable<React.ContextType<typeof NavigationContext>>;

const idle = (): void => {};

const never = (): (() => void) => idle;

function subscriberTo(
  navigation: Navigation | undefined,
): (notify: () => void) => () => void {
  if (!navigation) return never;

  return (notify) => {
    const offFocus = navigation.addListener('focus', notify);
    const offBlur = navigation.addListener('blur', notify);

    return (): void => {
      offFocus();
      offBlur();
    };
  };
}

// A page its navigator keeps behind the shown one is not focused. Without a navigator, as in a preview, a page always is.
export function usePageFocused(): boolean {
  const navigation = use(NavigationContext);
  const subscribe = useMemo(() => subscriberTo(navigation), [navigation]);

  return useSyncExternalStore(subscribe, () => navigation?.isFocused() ?? true);
}

// The one rule for every Place: only the shown page may hold it, and only on a wide window.
export function useShownPage(): boolean {
  const wide = useWide();

  return usePageFocused() && wide;
}

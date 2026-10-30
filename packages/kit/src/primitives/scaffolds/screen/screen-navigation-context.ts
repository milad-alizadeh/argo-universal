import { NavigationContext } from 'expo-router/react-navigation';
import { createContext, use } from 'react';

// Previews have no page navigator of their own; the App enables stock headers by default.
export const ScreenNavigationEnabled = createContext(true);

// A ListDetail marks the detail it shows beside its list, which needs no Back to reach the list.
export const ScreenBesideList = createContext(false);

/*
 * The Back a host gives every Screen under it that declares none of its own, such as a Plugin's pages: the App knows
 * its own stack, and a Plugin never declares navigation. A host supplies one only for a page it pushed.
 */
export const ScreenDefaultBack = createContext<(() => void) | null>(null);

// Whether a navigator draws this Screen's narrow header, so the Screen leaves its own heading out.
export function useScreenNavigator(): boolean {
  const enabled = use(ScreenNavigationEnabled);
  const navigation = use(NavigationContext);

  return enabled && Boolean(navigation);
}

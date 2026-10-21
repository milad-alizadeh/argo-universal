import { NavigationContext } from 'expo-router/react-navigation';
import { createContext, use } from 'react';

// Previews have no page navigator of their own; the App enables stock headers by default.
export const PageNavigationEnabled = createContext(true);

// A ListDetail marks the detail it shows beside its list, which needs no Back to reach the list.
export const PageBesideList = createContext(false);

// Whether a navigator draws this Page's narrow header, so the Page leaves its own heading out.
export function usePageNavigator(): boolean {
  const enabled = use(PageNavigationEnabled);
  const navigation = use(NavigationContext);

  return enabled && Boolean(navigation);
}

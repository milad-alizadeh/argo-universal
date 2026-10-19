import { NavigationContext } from 'expo-router/react-navigation';
import { createContext, use } from 'react';

// Previews have no page navigator of their own; the App enables stock headers by default.
export const PageNavigationEnabled = createContext(true);

// Whether a navigator draws this Page's narrow header, so the Page leaves its own heading out.
export function usePageNavigator(): boolean {
  const enabled = use(PageNavigationEnabled);
  const navigation = use(NavigationContext);

  return enabled && Boolean(navigation);
}

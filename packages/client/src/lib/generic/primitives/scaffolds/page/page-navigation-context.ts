import { NavigationContext } from 'expo-router/react-navigation';
import { createContext, use } from 'react';
import { useWide } from '#lib/generic/use-wide/use-wide';
import { pageHeaderHost, type PageHeaderHost } from './page-header-host';

// Previews have no page navigator of their own; the App enables stock headers by default.
export const PageNavigationEnabled = createContext(true);

// The App's navigation marks a Page whose narrow header its drawer draws, as an Android Plugin root's is.
export const PageAtDrawerRoot = createContext(false);

// A ListDetail marks the detail it shows beside its list, which needs no Back to reach the list.
export const PageBesideList = createContext(false);

// Whether a navigator draws this Page's narrow header, so the Page leaves its own heading out.
export function usePageNavigator(): boolean {
  const enabled = use(PageNavigationEnabled);
  const navigation = use(NavigationContext);

  return enabled && Boolean(navigation);
}

export function usePageHeaderHost(): PageHeaderHost {
  const place = {
    navigator: usePageNavigator(),
    atDrawerRoot: use(PageAtDrawerRoot),
    wide: useWide(),
  };

  return pageHeaderHost(place);
}

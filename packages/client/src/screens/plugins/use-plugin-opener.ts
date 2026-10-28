import { router, usePathname } from 'expo-router';
import { useCallback, useLayoutEffect, useRef } from 'react';
import { sectionOf } from '../../lib/product/navigation/sections';
import {
  pageUnavailable,
  type OpenPluginPage,
} from '../../lib/product/plugin-actions';
import { pluginPageRoute } from './plugin-page-route';
import { usePluginSections } from './use-plugin-sections';

// The Session a page opens for rides in the route's params, so the page's view names it to the Plugin.
const routeParams = (
  route: string[],
  sessionId: string | undefined,
): { path: string[]; sessionId?: string } =>
  sessionId === undefined ? { path: route } : { path: route, sessionId };

const pushPage = (route: string[], sessionId: string | undefined): void =>
  router.push({
    pathname: '/plugins/[...path]',
    params: routeParams(route, sessionId),
  });

/*
 * Opens a Plugin's pages for the Plugin whose tree fired the event, from whatever the App is showing. A page opened
 * from a Session, such as by a Session header action, opens for that Session.
 */
export function usePluginOpener(): (
  pluginId: string,
  sessionId?: string,
) => OpenPluginPage {
  const sections = usePluginSections();
  const current = sectionOf(usePathname());

  return (pluginId, sessionId) => (path) => {
    const route = pluginPageRoute(sections, { pluginId, current }, path);

    if (route) pushPage(route, sessionId);
    else pageUnavailable(path);
  };
}

/*
 * Opens one Plugin's page by path, for a list whose rows hold the callback: it stays the same function across renders,
 * so a memoised row is not redrawn when the App moves to another page, and it opens from wherever the App is then.
 */
export function useOpenPluginPage(): (pluginId: string, path: string) => void {
  const opener = usePluginOpener();
  const latest = useRef(opener);

  useLayoutEffect(() => {
    latest.current = opener;
  });

  return useCallback(
    (pluginId: string, path: string) => latest.current(pluginId)(path),
    [],
  );
}

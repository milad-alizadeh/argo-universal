import { router, usePathname } from 'expo-router';
import { useCallback, useLayoutEffect, useRef } from 'react';
import { sectionOf } from '../../lib/product/navigation/sections';
import {
  pageUnavailable,
  type OpenPluginPage,
} from '../../lib/product/plugin-actions';
import { pluginPageRoute } from './plugin-page-route';
import { usePluginSections } from './use-plugin-sections';

/*
 * What a page opens for: the Session behind a Session header action, or the Project behind a Project details row
 * (ADR-0046). It rides in the route's params, so the page's view names it to the Plugin.
 */
export interface PluginOpening {
  sessionId?: string;
  projectId?: string;
}

type RouteParams = {
  path: string[];
  sessionId?: string;
  projectId?: string;
};

function routeParams(
  route: string[],
  { sessionId, projectId }: PluginOpening,
): RouteParams {
  const params: RouteParams = { path: route };

  if (sessionId !== undefined) params.sessionId = sessionId;

  if (projectId !== undefined) params.projectId = projectId;

  return params;
}

const pushPage = (route: string[], opening: PluginOpening): void =>
  router.push({
    pathname: '/plugins/[...path]',
    params: routeParams(route, opening),
  });

/*
 * Opens a Plugin's pages for the Plugin whose tree fired the event, from whatever the App is showing. A page opened
 * from a Session, such as by a Session header action, opens for that Session; one opened from a Project details row
 * opens for that Project.
 */
export function usePluginOpener(): (
  pluginId: string,
  opening?: PluginOpening,
) => OpenPluginPage {
  const sections = usePluginSections();
  const current = sectionOf(usePathname());

  return (pluginId, opening = {}) =>
    (path) => {
      const route = pluginPageRoute(sections, { pluginId, current }, path);

      if (route) pushPage(route, opening);
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

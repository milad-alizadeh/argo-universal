import { useCallback, useLayoutEffect, useRef } from 'react';
import {
  type PluginOpening,
  pushPluginPage,
} from '../../../lib/product/navigation/plugin-page';
import { sectionOf } from '../../../lib/product/navigation/sections';
import { pathShown } from '../../../lib/product/navigation/shown-page';
import {
  pageUnavailable,
  type OpenPluginPage,
} from '../../../lib/product/plugin-actions';
import { pluginPageRoute } from '../utils/plugin-page-route';
import { usePluginSections } from './use-plugin-sections';

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

  // The section is read at the press: a page kept behind the shown one is not redrawn when the path changes.
  return (pluginId, opening = {}) =>
    (path) => {
      const current = sectionOf(pathShown());
      const route = pluginPageRoute(sections, { pluginId, current }, path);

      if (route) pushPluginPage(route, opening);
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

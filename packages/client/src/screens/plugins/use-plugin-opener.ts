import { router, usePathname } from 'expo-router';
import { sectionOf } from '../../lib/product/navigation/sections';
import {
  pageUnavailable,
  type OpenPluginPage,
} from '../../lib/product/plugin-actions';
import { pluginPageRoute } from './plugin-page-route';
import { usePluginSections } from './use-plugin-sections';

// Opens a Plugin's pages for the Plugin whose tree fired the event, from whatever the App is showing.
export function usePluginOpener(): (pluginId: string) => OpenPluginPage {
  const sections = usePluginSections();
  const current = sectionOf(usePathname());

  return (pluginId) => (path) => {
    const route = pluginPageRoute(sections, { pluginId, current }, path);

    if (route)
      router.push({ pathname: '/plugins/[...path]', params: { path: route } });
    else pageUnavailable(path);
  };
}

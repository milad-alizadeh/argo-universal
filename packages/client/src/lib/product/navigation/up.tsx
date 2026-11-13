import { type Href, router } from 'expo-router';
import { isPluginSection, listAbove, type Section } from './sections';

// A section's list: a core section's own route, or a Plugin's root page.
const sectionHref = (section: Section): Href =>
  isPluginSection(section)
    ? {
        pathname: '/plugins/[...path]',
        params: { path: section.split('/').slice(1) },
      }
    : `/${section}`;

// Up from a page to its section's list, swapping the page out, for a window with no history to go back through; a list has nowhere up.
export function upFrom(path: string): (() => void) | null {
  const list = listAbove(path);

  return list ? () => router.replace(sectionHref(list)) : null;
}

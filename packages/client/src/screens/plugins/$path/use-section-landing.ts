import { useLayoutEffect } from 'react';
import { pluginPageRoute } from '../plugin-page-route';
import { landingOf } from '../plugin-section-tree';
import { usePluginSections, type PluginSection } from '../use-plugin-sections';
import type { PluginView } from '../use-plugin-view';
import type { SectionStackPage } from './use-section-stack';

// As one string, so the effect below reads no change while the route stays the same.
function useLandingRoute(
  section: PluginSection,
  root: PluginView['root'] | undefined,
): string | undefined {
  const sections = usePluginSections();
  const landing = landingOf(root);
  const origin = { pluginId: section.pluginId, current: section.id };

  if (landing === undefined) return undefined;

  return pluginPageRoute(sections, origin, landing)?.join('/');
}

// The page a section's root declares takes the root's place in the stack as soon as the root is shown, so a wide window never lands on an empty detail.
export function useSectionLanding(
  section: PluginSection,
  view: PluginView | undefined,
  { shown, showOnly }: SectionStackPage,
): boolean {
  const opening = useLandingRoute(section, view?.root);

  useLayoutEffect(() => {
    if (shown && opening !== undefined) showOnly(opening.split('/'));
  }, [shown, opening, showOnly]);

  return opening !== undefined;
}

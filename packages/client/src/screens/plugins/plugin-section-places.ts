import { useClaimed, type Place } from '@repo/kit/place';
import { createContext, use } from 'react';
import type { PluginSection } from './use-plugin-sections';
import type { PluginView } from './use-plugin-view';

// What the shown page tells its section's list: the section's stack, shown page first, and how to make one page the whole of it.
export interface ShownSectionPage {
  pages: readonly string[];
  showOnly: (route: readonly string[]) => void;
}

// The live root view, for the root's own page to draw instead of opening a second view of the same path.
export interface SectionRoot {
  section: PluginSection;
  view: PluginView;
}

export interface SectionPlaces {
  root: Place<SectionRoot>;
  shown: Place<ShownSectionPage>;
}

export const SectionPlacesContext = createContext<SectionPlaces | undefined>(
  undefined,
);

export function useSectionPlaces(): SectionPlaces {
  const places = use(SectionPlacesContext);

  if (!places) throw new Error('A Plugin page sits outside PluginSectionLists');

  return places;
}

export const useShownPagePlace = (): Place<ShownSectionPage> =>
  useSectionPlaces().shown;

// The section's live root view, while that section is the one a wide window shows.
export function useSectionRoot(section: PluginSection): PluginView | undefined {
  const shown = useClaimed(useSectionPlaces().root);

  return shown?.section.id === section.id ? shown.view : undefined;
}

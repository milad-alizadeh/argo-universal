import type { ReactNode } from 'react';
import { createContext, use } from 'react';
import type { FirstPage } from '#lib/product/navigation/navigation';
import type { ScreenHeaderProps } from '#lib/product/navigation/screen-header';
import type { CoreSection } from '../../../lib/product/navigation/sections';

// What a section hands the Frame: its list, and what goes with it.
export interface SectionList {
  // The list's own part of the sidebar's header row.
  header: ReactNode;
  list: ReactNode;
  // The header over the list when the list is the section's root page, as Android's drawer header and the web's JS header draw it.
  rootHeader: ScreenHeaderProps;
  // The root page's own stock header items and search bar (`Stack.Toolbar`, `Stack.SearchBar`), which iOS shows instead of `rootHeader`'s.
  rootToolbar?: ReactNode;
  /*
   * The page a window with the list beside it opens at the section's root, or undefined while
   * it is still being chosen; without one, the root keeps its own page. Called as a hook.
   */
  useFirstPage?: () => FirstPage | undefined;
}

export type SectionLists = Record<CoreSection, SectionList>;

export const SectionListsContext = createContext<SectionLists | null>(null);

export function useSectionList(section: CoreSection): SectionList {
  const lists = use(SectionListsContext);

  if (!lists) throw new Error('Render inside a Frame.');

  return lists[section];
}

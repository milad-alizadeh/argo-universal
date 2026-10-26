import type { ScreenProps } from '@repo/kit/primitives/scaffolds/screen';
import type { EmptyStateProps } from '@repo/kit/primitives/status/empty-state';
import type { ReactNode } from 'react';
import { createContext, use } from 'react';
import type { FirstPage } from '#lib/product/navigation/navigation';
import type { CoreSection } from '../../../lib/product/navigation/sections';

// What a section hands the Frame: its list, and what goes with it.
export interface SectionList {
  // The list under its own Screen, which declares its header: drawn above the list in the sidebar on a wide window, and in the stack's header under wide. Null where the section's pages hold the sidebar with their own ListDetail, as Settings' SettingsLayout does.
  list: ReactNode;
  // Where the section's pages hold the sidebar, the Screen their ListDetail draws around the list, which holds the search the pages narrow it by.
  screen?: Omit<ScreenProps, 'children'>;
  // A narrow window's root page: the list under its Screen, which declares the root's header itself.
  rootPage: ReactNode;
  /*
   * The page a window with the list beside it opens at the section's root, or undefined while
   * it is still being chosen; without one, the root keeps its own page. Called as a hook.
   */
  useFirstPage?: () => FirstPage | undefined;
  // What the detail beside the list shows at the section's root, where nothing is selected yet; without it, the root opens the first page.
  emptyPage?: Pick<EmptyStateProps, 'title' | 'description'>;
}

export type SectionLists = Record<CoreSection, SectionList>;

export const SectionListsContext = createContext<SectionLists | null>(null);

export function useSectionList(section: CoreSection): SectionList {
  const lists = use(SectionListsContext);

  if (!lists) throw new Error('Render inside a Frame.');

  return lists[section];
}

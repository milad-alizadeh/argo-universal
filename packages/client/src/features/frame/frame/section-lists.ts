import type { EmptyStateProps } from '@repo/kit/primitives/status/empty-state';
import type { ReactNode } from 'react';
import { createContext, use } from 'react';
import type { FirstPage } from '#lib/product/navigation/navigation';
import type {
  CoreSection,
  NavigationSection,
  Section,
} from '../../../lib/product/navigation/sections';

// What a section hands the Frame: its list, and what goes with it.
export interface SectionList {
  // The list under its own Screen, which declares its header: drawn above the list in the sidebar on a wide window, and as the root page of the section's stack under wide.
  list: ReactNode;
  /*
   * The page a window with the list beside it opens at the section's root, or undefined while
   * it is still being chosen; without one, the root keeps its own page. Called as a hook.
   */
  useFirstPage?: () => FirstPage | undefined;
  // What the detail beside the list shows at the section's root, where nothing is selected yet; without it, the root opens the first page.
  emptyPage?: Pick<EmptyStateProps, 'title' | 'description'>;
}

export type SectionLists = Record<CoreSection, SectionList>;

// The sections the navigator shows: the open one, every core section's list, and the rail's items.
export interface FrameSections {
  section: Section;
  lists: SectionLists;
  items: readonly NavigationSection[];
}

export const SectionListsContext = createContext<SectionLists | null>(null);

export function useSectionList(section: CoreSection): SectionList {
  const lists = use(SectionListsContext);

  if (!lists) throw new Error('Render inside a Frame.');

  return lists[section];
}

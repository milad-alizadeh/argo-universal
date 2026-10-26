import {
  createListDetailSidebar,
  type ListDetailSidebar,
  ListDetailSidebarContext,
  useListDetailSidebarHeld,
  useListDetailSidebarList,
} from '@repo/kit/primitives/scaffolds/list-detail';
import { createContext, use, useState, type ReactNode } from 'react';
import { useScreenFocused } from '#lib/product/navigation/navigation';
import {
  isCoreSection,
  type Section,
} from '../../../lib/product/navigation/sections';
import type { ScaffoldProps } from '../scaffold/scaffold';
import type { SectionLists } from './section-lists';

// The Frame's sidebar, which a Plugin page's ListDetail may hold on a wide window.
export const FrameListDetailSidebar = createContext<
  ListDetailSidebar | undefined
>(undefined);

export interface SectionListDetailProps {
  children: ReactNode;
}

// Offers the Frame's sidebar to a page's ListDetail while the page is shown, as a Plugin page's or Settings' is.
export function SectionListDetail({
  children,
}: SectionListDetailProps): React.JSX.Element {
  const sidebar = use(FrameListDetailSidebar);
  const focused = useScreenFocused();

  return (
    <ListDetailSidebarContext value={focused ? sidebar : undefined}>
      {children}
    </ListDetailSidebarContext>
  );
}

// The list a Plugin page's ListDetail holds the Frame's sidebar with.
function ClaimedList(props: { sidebar: ListDetailSidebar }): React.JSX.Element {
  return <>{useListDetailSidebarList(props.sidebar)}</>;
}

type SectionScaffold = Pick<ScaffoldProps, 'list'> &
  Partial<Pick<ScaffoldProps, 'sidebarShown' | 'inspectorState'>>;

export interface FrameListDetail {
  sidebar: ListDetailSidebar;
  // Whether the shown page's ListDetail holds the sidebar.
  held: boolean;
}

// The Frame's one sidebar store, made once, and whether a ListDetail holds it now.
export function useFrameListDetail(): FrameListDetail {
  const [sidebar] = useState(createListDetailSidebar);

  return { sidebar, held: useListDetailSidebarHeld(sidebar) };
}

interface ShownSection {
  section: Section;
  lists: SectionLists;
}

const noList: SectionScaffold = {
  list: null,
  sidebarShown: false,
  inspectorState: 'closed',
};

// A core section's own list, or the one its pages' ListDetail holds the sidebar with; a Plugin section's only while its page's ListDetail holds it.
export function sectionScaffold(
  shown: ShownSection,
  listDetail: FrameListDetail,
): SectionScaffold {
  const { section, lists } = shown;

  if (!isCoreSection(section)) return pluginSectionScaffold(listDetail);

  return { list: lists[section].list ?? claimedList(listDetail) };
}

const claimedList = ({ sidebar, held }: FrameListDetail): ReactNode =>
  held && <ClaimedList sidebar={sidebar} />;

// The list's own Screen, claimed with it, draws its heading, as a core section's list does.
function pluginSectionScaffold({
  sidebar,
  held,
}: FrameListDetail): SectionScaffold {
  if (!held) return noList;

  return { list: <ClaimedList sidebar={sidebar} />, inspectorState: 'closed' };
}

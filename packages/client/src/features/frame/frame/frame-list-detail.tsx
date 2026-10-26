import {
  createPlace,
  useClaimed,
  usePlaceHeld,
  type Place,
} from '@repo/kit/place';
import { ListDetailSidebarPlace } from '@repo/kit/primitives/scaffolds/list-detail';
import { createContext, use, type ReactNode, useState } from 'react';
import {
  isCoreSection,
  type Section,
} from '../../../lib/product/navigation/sections';
import type { ScaffoldProps } from '../scaffold/scaffold';
import type { SectionLists } from './section-lists';

// The Frame's sidebar, which a Plugin page's ListDetail may hold on a wide window.
export const FrameListDetailSidebar = createContext<
  Place<ReactNode> | undefined
>(undefined);

export interface SectionListDetailProps {
  children: ReactNode;
}

// Offers the Frame's sidebar to a page's ListDetail, as a Plugin page's is; the kit holds it only while the page is shown.
export function SectionListDetail({
  children,
}: SectionListDetailProps): React.JSX.Element {
  return (
    <ListDetailSidebarPlace value={use(FrameListDetailSidebar)}>
      {children}
    </ListDetailSidebarPlace>
  );
}

// The list a Plugin page's ListDetail holds the Frame's sidebar with.
function ClaimedList(props: { sidebar: Place<ReactNode> }): React.JSX.Element {
  return <>{useClaimed(props.sidebar)}</>;
}

type SectionScaffold = Pick<ScaffoldProps, 'list'> &
  Partial<Pick<ScaffoldProps, 'sidebarShown' | 'inspectorState'>>;

export interface FrameListDetail {
  sidebar: Place<ReactNode>;
  // Whether the shown page's ListDetail holds the sidebar.
  held: boolean;
}

// The Frame's one sidebar store, made once, and whether a ListDetail holds it now.
export function useFrameListDetail(): FrameListDetail {
  const [sidebar] = useState(() => createPlace<ReactNode>());

  return { sidebar, held: usePlaceHeld(sidebar) };
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

// A core section's own list; a Plugin section's only while its page's ListDetail holds the sidebar with its own.
export function sectionScaffold(
  shown: ShownSection,
  listDetail: FrameListDetail,
): SectionScaffold {
  const { section, lists } = shown;

  if (!isCoreSection(section)) return pluginSectionScaffold(listDetail);

  return { list: lists[section].list };
}

// The list's own Screen, claimed with it, draws its heading, as a core section's list does.
function pluginSectionScaffold({
  sidebar,
  held,
}: FrameListDetail): SectionScaffold {
  if (!held) return noList;

  return { list: <ClaimedList sidebar={sidebar} />, inspectorState: 'closed' };
}

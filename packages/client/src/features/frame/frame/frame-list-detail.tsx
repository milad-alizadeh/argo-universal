import {
  createPlace,
  useClaim,
  useClaimed,
  usePlaceHeld,
  type Place,
} from '@repo/kit/place';
import { ListDetailSidebarPlaceOffer } from '@repo/kit/primitives/scaffolds/list-detail';
import { useIsShownPage } from '@repo/kit/use-shown-page';
import {
  createContext,
  use,
  type ReactNode,
  useLayoutEffect,
  useState,
} from 'react';
import {
  isCoreSection,
  type Section,
} from '../../../lib/product/navigation/sections';
import type { ScaffoldProps } from '../scaffold/scaffold';
import type { FrameSections } from './section-lists';

// The Frame's sidebar, which a Plugin page's ListDetail may hold on a wide window.
export const FrameListDetailSidebar = createContext<
  Place<ReactNode> | undefined
>(undefined);

// Held by a Plugin page that is waiting for its first drawing, so the sidebar keeps the list the page before it drew.
const FrameListDetailPending = createContext<Place<true> | undefined>(
  undefined,
);

export const FrameListDetailPendingOffer = FrameListDetailPending.Provider;

// A Plugin page's drawing arrives after its route opens. Until it does, the sidebar keeps the list the shown section last drew, since a claim only lives with a drawn ListDetail and would blank the list in between.
export function useKeepSidebarWhilePending(): void {
  const pending = use(FrameListDetailPending);

  useClaim(useIsShownPage() ? pending : undefined, true);
}

export interface SectionListDetailProps {
  children: ReactNode;
}

// Offers the Frame's sidebar to a page's ListDetail, as a Plugin page's is; the kit holds it only while the page is shown.
export function SectionListDetail({
  children,
}: SectionListDetailProps): React.JSX.Element {
  return (
    <ListDetailSidebarPlaceOffer value={use(FrameListDetailSidebar)}>
      {children}
    </ListDetailSidebarPlaceOffer>
  );
}

// The list a Plugin page's ListDetail holds the Frame's sidebar with.
function ClaimedList(props: {
  sidebar: Place<ReactNode>;
  kept?: ReactNode;
}): ReactNode {
  return useClaimed(props.sidebar) ?? props.kept;
}

type SectionScaffold = Pick<ScaffoldProps, 'list'> &
  Partial<Pick<ScaffoldProps, 'sidebarShown' | 'inspectorState'>>;

export interface FrameListDetail {
  sidebar: Place<ReactNode>;
  // The Place a page waiting for its drawing holds.
  pending: Place<true>;
  // Whether the shown page's ListDetail holds the sidebar, or the list it drew is kept for the page that follows.
  held: boolean;
  // The list the section drew last, while its next page is pending.
  kept?: ReactNode;
}

interface Remembered {
  section: Section;
  list: ReactNode;
}

// Remembers what the sidebar is claimed with now, and each claim after. A page that claimed in the same commit did so before this subscribed.
function rememberClaims(
  sidebar: Place<ReactNode>,
  section: Section,
  memory: { last?: Remembered },
): () => void {
  const remember = (): void => {
    const list = sidebar.claims.current();

    if (list !== undefined) memory.last = { section, list };
  };

  remember();

  return sidebar.claims.subscribe(remember);
}

// The list the sidebar showed last in `section`, kept across the claim that lets go with its page. It is read as the claim shows, not rendered with it, so a list that redraws does not redraw the Frame.
function useRemembered(sidebar: Place<ReactNode>, section: Section): ReactNode {
  const [memory] = useState<{ last?: Remembered }>(() => ({}));

  useLayoutEffect(
    () => rememberClaims(sidebar, section, memory),
    [sidebar, section, memory],
  );

  return memory.last?.section === section ? memory.last.list : undefined;
}

// The Frame's one sidebar store, made once, and whether a ListDetail holds it now, or its list is kept while the next page draws.
export function useFrameListDetail(section: Section): FrameListDetail {
  const [sidebar] = useState(() => createPlace<ReactNode>());
  const [pending] = useState(() => createPlace<true>());
  const kept = useKeptList({ sidebar, pending }, section);

  return {
    sidebar,
    pending,
    held: usePlaceHeld(sidebar) || kept !== undefined,
    kept,
  };
}

// The remembered list, while the section's next page is pending and no page holds the sidebar.
function useKeptList(
  places: Pick<FrameListDetail, 'sidebar' | 'pending'>,
  section: Section,
): ReactNode {
  const remembered = useRemembered(places.sidebar, section);
  const pending = usePlaceHeld(places.pending);
  const held = usePlaceHeld(places.sidebar);

  return pending && !held ? remembered : undefined;
}

const noList: SectionScaffold = {
  list: null,
  sidebarShown: false,
  inspectorState: 'closed',
};

// A core section's own list; a Plugin section's only while its page's ListDetail holds the sidebar with its own.
export function sectionScaffold(
  shown: Pick<FrameSections, 'section' | 'lists'>,
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
  kept,
}: FrameListDetail): SectionScaffold {
  if (!held) return noList;

  return {
    list: <ClaimedList sidebar={sidebar} kept={kept} />,
    inspectorState: 'closed',
  };
}

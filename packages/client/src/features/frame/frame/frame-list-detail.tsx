import {
  createPlace,
  useClaim,
  usePlaceHeld,
  type Place,
} from '@repo/kit/place';
import { ListDetailSidebarPlaceOffer } from '@repo/kit/primitives/scaffolds/list-detail';
import { useIsShownPage } from '@repo/kit/use-shown-page';
import {
  createContext,
  use,
  type PropsWithChildren,
  type ReactNode,
  useLayoutEffect,
  useState,
} from 'react';
import type { Section } from '../../../lib/product/navigation/sections';

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

// Held by the shown section's Plugin page for the whole of its life, drawn or not.
const FrameListDetailPage = createContext<Place<true> | undefined>(undefined);

export const FrameListDetailPageOffer = FrameListDetailPage.Provider;

/*
 * A section's page mounts a few frames after the path names the section, and until it does the Frame has no page to
 * ask whether the section has a list. Holding this says one is here: before it the Frame keeps the sidebar it had
 * rather than reading the gap as a section with no list, which it would close the pane for and open again.
 */
export function useKeepSidebarWhileOpening(): void {
  const page = use(FrameListDetailPage);

  useClaim(useIsShownPage() ? page : undefined, true);
}

export type FrameListDetailOffersProps = PropsWithChildren<{
  listDetail: FrameListDetail;
}>;

// The Places a section's pages fill: the sidebar a drawn ListDetail claims, and the two a page holds to say it is here and that it is waiting for its drawing.
export function FrameListDetailOffers({
  listDetail,
  children,
}: FrameListDetailOffersProps): ReactNode {
  return (
    <FrameListDetailSidebar value={listDetail.sidebar}>
      <FrameListDetailPendingOffer value={listDetail.pending}>
        <FrameListDetailPageOffer value={listDetail.page}>
          {children}
        </FrameListDetailPageOffer>
      </FrameListDetailPendingOffer>
    </FrameListDetailSidebar>
  );
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

export interface FrameListDetail {
  sidebar: Place<ReactNode>;
  // The Places a page holds: one while it waits for its drawing, one for the whole of its life.
  pending: Place<true>;
  page: Place<true>;
  // Whether the shown page's ListDetail holds the sidebar, or a page that cannot answer yet keeps it open until it can.
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

// The pane stays although no list holds it while the section's page is not here yet, and while the page here waits for its drawing.
const keepsPane = (
  pageHere: boolean,
  pageWaiting: boolean,
  listHeld: boolean,
): boolean => !pageHere || (pageWaiting && !listHeld);

/*
 * The Frame's one sidebar store, made once, and whether a ListDetail holds it now, or a page that cannot answer for
 * the section yet keeps it. Only a drawn ListDetail claims the sidebar, so between the path naming a section and
 * that section's page drawing there is nothing to read it from: closing the pane there and opening it again when the
 * drawing lands is what the Frame plays as a pane the person closed, sliding the glass, the list and the page twice.
 */
export function useFrameListDetail(section: Section): FrameListDetail {
  const [sidebar] = useState(() => createPlace<ReactNode>());
  const [pending] = useState(() => createPlace<true>());
  const [page] = useState(() => createPlace<true>());
  const held = usePlaceHeld(sidebar);
  const waiting = keepsPane(usePlaceHeld(page), usePlaceHeld(pending), held);
  const remembered = useRemembered(sidebar, section);

  return {
    sidebar,
    pending,
    page,
    held: held || waiting,
    // A page waiting in the section that drew the list keeps it; one opening a section anew waits with an empty pane.
    kept: waiting ? remembered : undefined,
  };
}

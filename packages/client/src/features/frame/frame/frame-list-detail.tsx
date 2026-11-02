import { createPlace, usePlaceHeld, type Place } from '@repo/kit/place';
import {
  createContext,
  type PropsWithChildren,
  type ReactNode,
  useState,
} from 'react';

// The Frame's sidebar, which a section's root ListDetail holds on a wide window.
export const FrameListDetailSidebar = createContext<
  Place<ReactNode> | undefined
>(undefined);

// Held while the shown Plugin section is known to have no list, which only its root can say once its first snapshot has come.
export const FrameSectionWithoutList = createContext<Place<true> | undefined>(
  undefined,
);

export type FrameListDetailOffersProps = PropsWithChildren<{
  listDetail: FrameListDetail;
}>;

// The Place a section's live list fills.
export function FrameListDetailOffers({
  listDetail,
  children,
}: FrameListDetailOffersProps): ReactNode {
  return (
    <FrameListDetailSidebar value={listDetail.sidebar}>
      <FrameSectionWithoutList value={listDetail.withoutList}>
        {children}
      </FrameSectionWithoutList>
    </FrameListDetailSidebar>
  );
}

export interface FrameListDetail {
  sidebar: Place<ReactNode>;
  withoutList: Place<true>;
  /*
   * Whether the section keeps the sidebar's pane: until its root says it has no list. A section's root mounts in the
   * commit after the Frame reads the path, and a commit without the pane starts the pane's close motion even if no
   * frame paints it, so the pane cannot wait for the root to ask for it.
   */
  listed: boolean;
}

// The Frame's one sidebar store, made once, and whether the shown section keeps its pane.
export function useFrameListDetail(): FrameListDetail {
  const [sidebar] = useState(() => createPlace<ReactNode>());
  const [withoutList] = useState(() => createPlace<true>());

  return { sidebar, withoutList, listed: !usePlaceHeld(withoutList) };
}

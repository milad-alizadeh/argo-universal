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
      {children}
    </FrameListDetailSidebar>
  );
}

export interface FrameListDetail {
  sidebar: Place<ReactNode>;
  // Whether the section's list holds the sidebar, or its root view is still finding out whether it has one.
  held: boolean;
}

// The Frame's one sidebar store, made once, and whether anything holds it now.
export function useFrameListDetail(): FrameListDetail {
  const [sidebar] = useState(() => createPlace<ReactNode>());

  return { sidebar, held: usePlaceHeld(sidebar) };
}

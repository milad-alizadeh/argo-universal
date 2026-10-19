import { createContext, useSyncExternalStore, type ReactNode } from 'react';
import {
  type ClaimStore,
  createClaimStore,
  useClaimed,
} from '#lib/generic/claim-store';

/*
 * The App Frame's sidebar, offered to a section's root ListDetail on a wide window so its list sits beside the Rail
 * (Paper ListDetail, wide). The newest claim shows its list.
 */
export type ListDetailSidebar = ClaimStore<ReactNode>;

export const createListDetailSidebar = (): ListDetailSidebar =>
  createClaimStore<ReactNode>(null);

// Offered by the App around a section's root pages; absent in previews and nested pages, where ListDetail splits itself.
export const ListDetailSidebarContext = createContext<
  ListDetailSidebar | undefined
>(undefined);

// The list a ListDetail holds the sidebar with, for the Frame to draw.
export function useListDetailSidebarList(
  sidebar: ListDetailSidebar,
): ReactNode | undefined {
  return useClaimed(sidebar);
}

// Whether a ListDetail holds the sidebar; changes only when a claim starts or ends.
export function useListDetailSidebarHeld(sidebar: ListDetailSidebar): boolean {
  return useSyncExternalStore(
    sidebar.subscribe,
    () => sidebar.current() !== undefined,
  );
}

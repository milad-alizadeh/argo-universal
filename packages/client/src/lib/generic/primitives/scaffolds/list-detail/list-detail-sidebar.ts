import { createContext, useSyncExternalStore, type ReactNode } from 'react';

/*
 * The App Frame's sidebar, offered to a section's root ListDetail on a wide window so its list sits beside the Rail
 * (Paper ListDetail, wide). The newest claim shows; a claim gives the sidebar back only while it still holds it.
 */
export interface ListDetailSidebar {
  // Holds the sidebar, empty until the claim shows its list.
  claim: () => SidebarClaim;
  subscribe: (listener: () => void) => () => void;
  current: () => ReactNode | undefined;
}

export interface SidebarClaim {
  // Shows the list as it is now, while this claim holds the sidebar.
  show: (list: ReactNode) => void;
  release: () => void;
}

interface Held {
  list: ReactNode;
}

class SidebarStore implements ListDetailSidebar {
  #held: Held | undefined;

  readonly #listeners = new Set<() => void>();

  claim = (): SidebarClaim => {
    const claim: Held = { list: null };
    this.#held = claim;
    this.#notify();

    return {
      show: (list) => this.#show(claim, list),
      release: () => this.#release(claim),
    };
  };

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);

    return () => this.#listeners.delete(listener);
  };

  current = (): ReactNode | undefined => this.#held?.list;

  #show(claim: Held, list: ReactNode): void {
    claim.list = list;

    if (this.#held === claim) this.#notify();
  }

  #release(claim: Held): void {
    if (this.#held !== claim) return;

    this.#held = undefined;
    this.#notify();
  }

  #notify(): void {
    for (const listener of this.#listeners) listener();
  }
}

export const createListDetailSidebar = (): ListDetailSidebar =>
  new SidebarStore();

// Offered by the App around a section's root pages; absent in previews and nested pages, where ListDetail splits itself.
export const ListDetailSidebarContext = createContext<
  ListDetailSidebar | undefined
>(undefined);

// The list a ListDetail holds the sidebar with, for the Frame to draw.
export function useListDetailSidebarList(
  sidebar: ListDetailSidebar,
): ReactNode | undefined {
  return useSyncExternalStore(sidebar.subscribe, sidebar.current);
}

// Whether a ListDetail holds the sidebar; changes only when a claim starts or ends.
export function useListDetailSidebarHeld(sidebar: ListDetailSidebar): boolean {
  return useSyncExternalStore(
    sidebar.subscribe,
    () => sidebar.current() !== undefined,
  );
}

import { createContext, useContext } from 'react';

/*
 * What a page holding a grouped list asks of the screen around it. On iOS the app gives the
 * screen's header and content the stock grouped background, which SwiftUI's Form draws under its
 * sections, so the header meets the list with no seam. Elsewhere it does nothing. The app supplies
 * it, so this package stays free of the router.
 */
export const GroupedPageContext =
  createContext<(active: boolean) => void>(ignoreGroupedPage);

function ignoreGroupedPage(): void {}

export function useGroupedPage(active: boolean): void {
  useContext(GroupedPageContext)(active);
}

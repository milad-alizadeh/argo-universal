import { createContext, useContext } from 'react';
import type { GroupedListProps } from '#primitives/lists/grouped-list';
import { useWide } from '../../../use-wide/use-wide';

export const FieldLayout = createContext<
  GroupedListProps['variant'] | 'overlay'
>('grouped');

export function useSidebarList(): boolean {
  return useContext(FieldLayout) === 'sidebar';
}

// A wide window's sidebar keeps its page selected; on a phone the same rows drill in instead.
export function useWideSidebarList(): boolean {
  const sidebar = useSidebarList();

  return useWide() && sidebar;
}

// Fitted desktop groups are compact popover rows; phones keep their grouped settings drawing.
export function useOverlayList(): boolean {
  const overlay = useContext(FieldLayout) === 'overlay';

  return useWide() && overlay;
}

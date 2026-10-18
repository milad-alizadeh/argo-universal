import { createContext, useContext } from 'react';
import { useWide } from '../../../use-wide/use-wide';

/*
 * 'overlay' is a fitted web group, drawn as compact popover rows when wide; 'stacked' is a fitted
 * native group, whose rows stack in a plain native column instead of a scrolling list.
 */
export const FieldLayout = createContext<
  'grouped' | 'sidebar' | 'overlay' | 'stacked'
>('grouped');

export function useSidebarList(): boolean {
  return useContext(FieldLayout) === 'sidebar';
}

// A content-sized native group: its rows draw their own cell, as no Form draws it for them.
export function useStackedList(): boolean {
  return useContext(FieldLayout) === 'stacked';
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

/*
 * A container sized to its content, such as an iPad popover, has no height for a list to fill, so
 * every list inside it fits its content.
 */
export const SizedToContent = createContext(false);

export function useSizedToContent(): boolean {
  return useContext(SizedToContent);
}

import { createContext, useContext } from 'react';
import { useWide } from '../../use-wide/use-wide';
import type { FieldGroupProps } from './field-props';

export const FieldLayout = createContext<FieldGroupProps['variant']>('grouped');

export function useNavigationFields(): boolean {
  return useContext(FieldLayout) === 'navigation';
}

// A wide window's sidebar keeps its page selected; a phone's navigation rows drill in instead.
export function useSidebarFields(): boolean {
  const navigation = useNavigationFields();

  return useWide() && navigation;
}

/*
 * Whether a virtualised list's row ends its section. The list holds each row in a container of
 * its own, where every row is a last child, so the row learns its place from here instead.
 */
export const FieldRowEnd = createContext<boolean | undefined>(undefined);

/*
 * A card row's place in its card. Each row is in a container of its own, so the row rounds its own
 * corners rather than relying on a wrapper's clip.
 */
export const FieldRowCorners = createContext<
  { first: boolean; last: boolean } | undefined
>(undefined);

/*
 * A virtualised list's hover link between neighbours: the row above a hovered or pressed row hides
 * its separator, as CSS cannot reach a previous row held in a container of its own.
 */
export interface RowHover {
  separatorHidden: boolean;
  onHover: (hovering: boolean) => void;
  onPressing: (pressing: boolean) => void;
}

export const FieldRowHover = createContext<RowHover | undefined>(undefined);

// A grouped list's gutters, and the space between its sections, on a phone and a wide window.
export const fieldGroupPadding = 'px-4 pb-8 pt-4 wide:px-0 wide:pb-6 wide:pt-0';

export const fieldGroupGap = 'gap-8 wide:gap-6';

import { createContext, useContext } from 'react';
import { useWide } from '../use-wide';
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

// A grouped list's gutters, and the space between its sections, on a phone and a wide window.
export const fieldGroupPadding = 'px-4 pb-8 pt-4 wide:px-0 wide:pb-6 wide:pt-0';
export const fieldGroupGap = 'gap-8 wide:gap-6';

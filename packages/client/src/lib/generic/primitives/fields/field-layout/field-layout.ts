import { createContext, useContext } from 'react';
import type { FieldGroupProps } from '#primitives/fields/field-group';
import { useWide } from '../../../use-wide/use-wide';

export const FieldLayout = createContext<FieldGroupProps['variant']>('grouped');

export function useNavigationFields(): boolean {
  return useContext(FieldLayout) === 'navigation';
}

// A wide window's sidebar keeps its page selected; a phone's navigation rows drill in instead.
export function useSidebarFields(): boolean {
  const navigation = useNavigationFields();

  return useWide() && navigation;
}

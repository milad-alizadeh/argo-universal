import { createContext, useContext } from 'react';
import { useWide } from '../../use-wide/use-wide';
import type { FieldGroupProps } from './field-group/field-group-props';

export const FieldLayout = createContext<FieldGroupProps['variant']>('grouped');

export function useNavigationFields(): boolean {
  return useContext(FieldLayout) === 'navigation';
}

// A wide window's sidebar keeps its page selected; a phone's navigation rows drill in instead.
export function useSidebarFields(): boolean {
  const navigation = useNavigationFields();

  return useWide() && navigation;
}

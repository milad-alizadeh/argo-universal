import { createContext, useContext } from 'react';
import type { FieldGroupProps } from './field-props';

export const FieldLayout = createContext<FieldGroupProps['variant']>('grouped');

export function useNavigationFields(): boolean {
  return useContext(FieldLayout) === 'navigation';
}

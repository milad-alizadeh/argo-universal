import { useContext } from 'react';
import { OpenContext } from './collapsible-context';

export interface CollapsibleStateData {
  dataSet: { state: 'open' | 'closed' };
}

// React Native Web drops Radix's `data-state`, which the open and close animations key on, and draws `dataSet`.
export function useStateData(): CollapsibleStateData {
  return { dataSet: { state: useContext(OpenContext) ? 'open' : 'closed' } };
}

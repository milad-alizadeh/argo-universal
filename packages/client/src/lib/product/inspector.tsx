import { createContext, useContext } from 'react';

// The wide window's Inspector, for a header button in a feature to open and close it.
export interface InspectorControl {
  open: boolean;
  toggle: () => void;
}

const InspectorContext = createContext<InspectorControl | null>(null);

export const InspectorProvider = InspectorContext.Provider;

// Null outside the wide shell, where no Inspector exists.
export function useInspector(): InspectorControl | null {
  return useContext(InspectorContext);
}

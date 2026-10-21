import { createContext, useContext, type ReactNode } from 'react';

const InCentredOverlay = createContext(false);

// Inside a centred dialog or sheet, controls keep the wide layout even on a medium window.
export function CentredOverlayScope(props: { children: ReactNode }): ReactNode {
  return (
    <InCentredOverlay.Provider value>
      {props.children}
    </InCentredOverlay.Provider>
  );
}

export function useInCentredOverlay(): boolean {
  return useContext(InCentredOverlay);
}

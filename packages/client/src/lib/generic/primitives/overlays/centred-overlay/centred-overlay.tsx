import { createContext, useContext, type ReactNode } from 'react';
import { useSizeClass } from '../../../use-size-class/use-size-class';

// A dialog, or a sheet the app opens itself, centres on the window from the medium size class up; a compact window raises it from the bottom edge.
export function useCentresOverlays(): boolean {
  return useSizeClass() !== 'compact';
}

const InCentredOverlay = createContext(false);

// Inside a centred dialog or sheet, controls keep the wide layout even on a medium window.
export function CentredOverlayScope(props: { children: ReactNode }): ReactNode {
  return (
    <InCentredOverlay.Provider value>{props.children}</InCentredOverlay.Provider>
  );
}

export function useInCentredOverlay(): boolean {
  return useContext(InCentredOverlay);
}

import { createContext, useContext, type ReactNode } from 'react';
import { useInCentredOverlay } from '#primitives/overlays/centred-overlay';
import { useWide } from '../../../use-wide/use-wide';

const FormLabels = createContext(false);

// Elicitation forms keep their whole question above the input on desktop.
export function FieldLabelScope(props: { children: ReactNode }): ReactNode {
  return <FormLabels.Provider value>{props.children}</FormLabels.Provider>;
}

export function useFieldLabelAbove(): boolean {
  const form = useContext(FormLabels);
  const modal = useInCentredOverlay();
  const wide = useWide();

  return modal || (form && wide);
}

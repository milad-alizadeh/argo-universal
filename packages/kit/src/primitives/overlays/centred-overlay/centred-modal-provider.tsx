import { type ReactElement, useMemo } from 'react';
import type { CentredModalRootProps } from './centred-modal-props';
import { CentredModalContext } from './centred-modal-state';

// Hands the modal's open state to its trigger and parts, on every platform.
export function CentredModalProvider(
  props: CentredModalRootProps,
): ReactElement {
  const { open, onOpenChange } = props;
  const state = useMemo(() => ({ open, onOpenChange }), [open, onOpenChange]);

  return (
    <CentredModalContext.Provider value={state}>
      {props.children}
    </CentredModalContext.Provider>
  );
}

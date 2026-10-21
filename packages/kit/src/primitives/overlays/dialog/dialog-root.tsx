import type { ReactElement } from 'react';
import { useOpenState } from '#primitives/overlays/open-state';
import { DialogContext } from './dialog-context';
import { DialogRootView } from './dialog-parts';
import type { DialogRootProps } from './dialog-props';

// Every drawing and named region shares the dialog's controlled or local open state.
export function DialogRoot(props: DialogRootProps): ReactElement {
  const state = useOpenState(props);

  return (
    <DialogContext.Provider value={state}>
      <DialogRootView {...props} />
    </DialogContext.Provider>
  );
}

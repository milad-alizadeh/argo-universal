import type { ReactElement } from 'react';
import { WindowBand } from '#lib/product/window-band';
import type { SessionHeaderProps } from './session-header-props';
import { SessionWorkbenchColumn } from './session-workbench';

// Draws nothing itself. On a wide window the Session's overview claims the band; its title and menu are its Screen's header, which the kit draws there.
export function SessionBandClaim({
  workbench,
}: SessionHeaderProps): ReactElement {
  return (
    <WindowBand
      workbench={
        workbench && <SessionWorkbenchColumn sections={workbench.sections} />
      }
      onInspectorToggle={workbench?.onOpenInspector}
    />
  );
}

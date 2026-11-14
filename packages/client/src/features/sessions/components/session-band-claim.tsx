import type { ReactElement, ReactNode } from 'react';
import { WindowBand } from '#lib/product/window-band';
import type { SessionHeaderProps } from './session-header-props';
import { SessionWorkbenchColumn } from './session-workbench';

type Workbench = SessionHeaderProps['workbench'];

// A Session's cards mount fresh, so another Session's cards take their height at once instead of folding or growing from the last one's.
const workbenchColumn = (
  workbench: Workbench,
  sessionId: string | undefined,
): ReactNode =>
  workbench && (
    <SessionWorkbenchColumn key={sessionId} sections={workbench.sections} />
  );

// Draws nothing itself. On a wide window the Session's overview claims the band; its title and menu are its Screen's header, which the kit draws there.
export function SessionBandClaim({
  workbench,
  sessionId,
}: SessionHeaderProps): ReactElement {
  return (
    <WindowBand
      sessionId={sessionId}
      workbench={workbenchColumn(workbench, sessionId)}
      onInspectorToggle={workbench?.onOpenInspector}
    />
  );
}

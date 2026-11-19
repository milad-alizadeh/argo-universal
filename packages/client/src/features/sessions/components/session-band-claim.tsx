import type { ReactElement, ReactNode } from 'react';
import { WindowBand } from '#lib/product/window-band';
import type { SessionHeaderProps } from './session-header-props';
import { SessionWorkbenchColumn } from './session-workbench';

type Workbench = SessionHeaderProps['workbench'];

/*
 * A Session's cards mount fresh, so another Session's cards take their height at once instead of folding or growing
 * from the last one's. A Session with no cards gives the band no Workbench: it is not drawn and the Frame lays the
 * page out as if it had none.
 */
const workbenchColumn = (
  workbench: Workbench,
  sessionId: string | undefined,
): ReactNode =>
  workbench?.sections.length ? (
    <SessionWorkbenchColumn key={sessionId} sections={workbench.sections} />
  ) : undefined;

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

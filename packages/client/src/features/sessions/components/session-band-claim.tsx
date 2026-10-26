import type { ReactElement } from 'react';
import { WindowBand } from '../../../lib/product/window-band';
import type { SessionHeaderProps } from './session-header-props';
import { workbenchCards } from './session-workbench-cards';
import { WorkbenchColumn } from './workbench-column';

function workbenchColumn({
  panels,
}: SessionHeaderProps): ReactElement | undefined {
  return panels ? (
    <WorkbenchColumn cards={workbenchCards(panels)} />
  ) : undefined;
}

function inspectorToggle({
  panels,
}: SessionHeaderProps): (() => void) | undefined {
  if (!panels) return undefined;

  return () => (panels.onSelect ?? panels.onToggle)('changes');
}

// Draws nothing itself. On a wide window the Session's overview claims the band; its title and menu are its Screen's header, which the kit draws there.
export function SessionBandClaim(props: SessionHeaderProps): ReactElement {
  return (
    <WindowBand
      workbench={workbenchColumn(props)}
      onInspectorToggle={inspectorToggle(props)}
    />
  );
}

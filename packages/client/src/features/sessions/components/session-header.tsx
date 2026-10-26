import type { ReactElement } from 'react';
import { WindowBand } from '../../../lib/product/window-band';
import type { SessionHeaderProps } from './session-header-props';
import { SessionWorkbench } from './session-workbench';

export type {
  SessionHeaderProps,
  SessionHeaderStatus,
} from './session-header-props';

function headerWorkbench({
  panels,
}: SessionHeaderProps): ReactElement | undefined {
  return panels ? <SessionWorkbench panels={panels} /> : undefined;
}

function stageToggle({ panels }: SessionHeaderProps): (() => void) | undefined {
  if (!panels) return undefined;

  return () => (panels.onSelect ?? panels.onToggle)('changes');
}

// On a wide window the Session's overview claims the band; its title and menu are its Screen's header, which the kit draws there.
export function SessionHeader(props: SessionHeaderProps): ReactElement {
  return (
    <WindowBand
      workbench={headerWorkbench(props)}
      onStageToggle={stageToggle(props)}
    />
  );
}

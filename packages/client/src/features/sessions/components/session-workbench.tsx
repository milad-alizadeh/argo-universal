import type { ReactElement } from 'react';
import type { SessionHeaderPanels } from './session-header-props';
import { workbenchCards } from './session-workbench-cards';
import { WorkbenchColumn } from './workbench-column';

// Paper 24JC-0: the Session's section cards, previewed in the column beside its Feed.
export function SessionWorkbench({
  panels,
}: {
  panels: SessionHeaderPanels;
}): ReactElement {
  return <WorkbenchColumn cards={workbenchCards(panels)} />;
}

import type { ReactElement } from 'react';
import type { SessionHeaderPanels } from './session-header-props';
import { workbenchCards } from './session-workbench-cards';
import { WorkbenchColumn } from './workbench-column';

// The Session's section cards, previewed in the column beside its Feed.
export function SessionWorkbench({
  panels,
}: {
  panels: SessionHeaderPanels;
}): ReactElement {
  return <WorkbenchColumn cards={workbenchCards(panels)} />;
}

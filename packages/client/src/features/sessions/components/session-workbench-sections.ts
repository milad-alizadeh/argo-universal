import type { SessionPanel } from '../stores/session-panels';
import type { SessionHeaderPanels } from './session-header-props';

// The sections the Workbench can draw, in the order they stack by default.
export const workbenchPanels = ['changes', 'subagents', 'shells'] as const;

const itemCount = (panel: SessionPanel, panels: SessionHeaderPanels): number =>
  panels.counts?.[panel] ?? 0;

const fileCount = (panels: SessionHeaderPanels): number =>
  panels.changesSummary?.files ?? 0;

const changesCount = (panels: SessionHeaderPanels): number =>
  Math.max(fileCount(panels), itemCount('changes', panels));

function sectionCount(
  panel: SessionPanel,
  panels: SessionHeaderPanels,
): number {
  if (panel === 'changes') return changesCount(panels);

  return itemCount(panel, panels);
}

// A section the Session has nothing in is not drawn, so an empty Workbench is an empty column.
export const hasSection = (
  panel: SessionPanel,
  panels: SessionHeaderPanels,
): boolean => sectionCount(panel, panels) > 0;

export { itemCount };

export const hasPreview = (panels: SessionHeaderPanels): boolean =>
  !!panels.pullRequests?.length;

const selectSection = (
  panel: SessionPanel,
  panels: SessionHeaderPanels,
): void => (panels.onSelect ?? panels.onToggle)(panel);

function openChangesSection(panels: SessionHeaderPanels): void {
  if (hasPreview(panels) && panels.onOpenChanges) return panels.onOpenChanges();

  selectSection('changes', panels);
}

// Pressing a card's body opens its section in full, in the Inspector.
export function openSection(
  panel: SessionPanel,
  panels: SessionHeaderPanels,
): void {
  if (panel === 'changes') return openChangesSection(panels);

  selectSection(panel, panels);
}

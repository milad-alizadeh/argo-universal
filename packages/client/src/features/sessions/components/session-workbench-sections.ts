import type { SessionPanel } from '../stores/session-panels';
import type { SessionHeaderPanels } from './session-header-props';

// The sections the Workbench can draw, in the order they stack by default.
export const workbenchPanels = ['changes', 'subagents', 'shells'] as const;

// One section of the Workbench: the Inspector panel it opens, and what the Session has for it.
export interface Section {
  panel: SessionPanel;
  panels: SessionHeaderPanels;
}

export const itemCount = ({ panel, panels }: Section): number =>
  panels.counts?.[panel] ?? 0;

const changesCount = (section: Section): number =>
  Math.max(section.panels.changesSummary?.files ?? 0, itemCount(section));

export const hasPreview = ({ panels }: Section): boolean =>
  !!panels.pullRequests?.length;

const selectSection = ({ panel, panels }: Section): void =>
  (panels.onSelect ?? panels.onToggle)(panel);

function openChanges(section: Section): void {
  const { onOpenChanges } = section.panels;

  if (hasPreview(section) && onOpenChanges) return onOpenChanges();

  selectSection(section);
}

// How each section counts what the Session has in it and how it opens in full; Changes is the one that differs.
const sectionRules: Record<
  SessionPanel,
  { count: (section: Section) => number; open: (section: Section) => void }
> = {
  changes: { count: changesCount, open: openChanges },
  subagents: { count: itemCount, open: selectSection },
  shells: { count: itemCount, open: selectSection },
};

// A section the Session has nothing in is not drawn, so an empty Workbench is an empty column.
export const hasSection = (section: Section): boolean =>
  sectionRules[section.panel].count(section) > 0;

// Pressing a card's body opens its section in full, in the Inspector.
export const openSection = (section: Section): void =>
  sectionRules[section.panel].open(section);

import type { ReactNode } from 'react';
import type { ComposerProps } from '#features/composer';
import type { SessionPanel, SessionPanels } from '#features/sessions';
import type { SessionInspectorContent } from './session-inspector';
import {
  shellsPanel,
  subagentsPanel,
  useWorkSheet,
  type WorkHome,
  type WorkPresentation,
} from './session-work-sheet';

interface WorkPanels {
  composer: ComposerProps;
  sheets: ReactNode;
}

type WorkProps = SessionInspectorContent & { composer: ComposerProps };

// A phone sheet and its Inspector tab are one panel: opening either shows the work at that width.
const panelOpening =
  (panels: SessionPanels, panel: SessionPanel) =>
  (open: boolean): void =>
    open ? panels.select(panel) : panels.close(panel);

// Where a panel's pill and sheet live: this Composer, and the sheet the pill opens.
const workHome = (
  composer: ComposerProps,
  panels: SessionPanels,
  panel: SessionPanel,
): WorkHome => ({
  composer,
  sheet: {
    open: panels.state.shown === panel,
    onOpenChange: panelOpening(panels, panel),
  },
});

/*
 * The Session's Subagents and Shells: a Composer pill and a sheet each on a phone, the Inspector's
 * tabs when wide. The pills chain, so the Composer carries both.
 */
export function useWorkPanels(
  props: WorkProps,
  panels: SessionPanels,
): WorkPanels {
  const home = workHome(props.composer, panels, 'subagents');
  const subagents = useWorkSheet(subagentsPanel, props.subagents, home);
  const next = workHome(subagents.composer, panels, 'shells');
  const shells = useWorkSheet(shellsPanel, props.shells, next);

  return { composer: shells.composer, sheets: bothSheets(subagents, shells) };
}

// Both work sheets mount together; each draws only at its own width and when its panel is shown.
const bothSheets = (
  subagents: WorkPresentation,
  shells: WorkPresentation,
): ReactNode => (
  <>
    {subagents.sheet}
    {shells.sheet}
  </>
);

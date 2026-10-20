import type { JSX, ReactNode } from 'react';
import type { ComposerProps } from '#features/composer';
import type { SessionPanel, SessionPanels } from '#features/sessions';
import type { SessionInspectorContent } from './session-inspector';
import { useSessionShells } from './session-shells';
import { useSessionSubagents } from './session-subagents';

interface WorkPanels {
  composer: ComposerProps;
  sheets: ReactNode;
}

// How a panel's phone sheet opens and closes.
interface WorkSheet {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type WorkProps = SessionInspectorContent & { composer: ComposerProps };

// A phone sheet and its Inspector tab are one panel: opening either shows the work at that width.
const panelOpening =
  (panels: SessionPanels, panel: SessionPanel) =>
  (open: boolean): void =>
    open ? panels.select(panel) : panels.close(panel);

const sheetProps = (panels: SessionPanels, panel: SessionPanel): WorkSheet => ({
  open: panels.state.shown === panel,
  onOpenChange: panelOpening(panels, panel),
});

/*
 * The Session's Subagents and Shells: a Composer pill and a sheet each on a phone, the Inspector's
 * tabs when wide. The pills chain, so the Composer carries both.
 */
export function useWorkPanels(
  props: WorkProps,
  panels: SessionPanels,
): WorkPanels {
  const sub = sheetProps(panels, 'subagents');
  const subagents = useSessionSubagents(props.composer, props.subagents, sub);
  const open = sheetProps(panels, 'shells');
  const shells = useSessionShells(subagents.composer, props.shells, open);

  return { composer: shells.composer, sheets: bothSheets(subagents, shells) };
}

type WorkSheets = { sheet: JSX.Element | null };

// Both work sheets mount together; each draws only at its own width and when its panel is shown.
const bothSheets = (subagents: WorkSheets, shells: WorkSheets): ReactNode => (
  <>
    {subagents.sheet}
    {shells.sheet}
  </>
);

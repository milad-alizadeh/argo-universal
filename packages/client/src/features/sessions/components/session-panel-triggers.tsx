import type * as React from 'react';
import { IconButton } from '#primitives/actions/icon-button';
import type { IconName } from '../../../lib/generic/symbols/icon-names';
import { sessionPanelOrder, type SessionPanel } from '../stores/session-panels';
import { headerActionAppearance } from './session-header-menu';
import type { SessionHeaderPanels } from './session-header-props';

// Each panel's name and icon, on its header trigger and its Inspector tab.
export const sessionPanelLabels = {
  subagents: { label: 'Subagents', icon: 'agent' },
  shells: { label: 'Shells', icon: 'terminal' },
  changes: { label: 'Changes', icon: 'diff' },
} as const satisfies Record<SessionPanel, { label: string; icon: IconName }>;

interface PanelTriggerProps {
  panel: SessionPanel;
  panels: SessionHeaderPanels;
}

function PanelTrigger({ panel, panels }: PanelTriggerProps): React.JSX.Element {
  const { label, icon } = sessionPanelLabels[panel];

  return (
    <IconButton
      {...headerActionAppearance}
      accessibilityLabel={label}
      selected={panels.shown === panel}
      aria-expanded={panels.shown === panel}
      onPress={() => panels.onToggle(panel)}
      icon={icon}
    />
  );
}

// Subagents, Shells and Changes, each pressed while the Inspector shows its tab; a panel the Session lacks has none.
export function SessionPanelTriggers({
  panels,
}: {
  panels: SessionHeaderPanels | undefined;
}): React.JSX.Element[] | null {
  if (!panels) return null;

  return sessionPanelOrder
    .filter((panel) => panels.offered.includes(panel))
    .map((panel) => <PanelTrigger key={panel} panel={panel} panels={panels} />);
}

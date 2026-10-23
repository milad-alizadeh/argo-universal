import type { ChangesSummary } from '@repo/contracts';
import { Button } from '@repo/kit/primitives/actions/button';
import { IconButton } from '@repo/kit/primitives/actions/icon-button';
import type { IconName } from '@repo/kit/symbols/icon-names';
import type * as React from 'react';
import { sessionPanelOrder, type SessionPanel } from '../stores/session-panels';
import { headerActionAppearance } from './session-header-menu';
import type { SessionHeaderPanels } from './session-header-props';

// Each panel's name and icon, on its header trigger and its Inspector tab.
export const sessionPanelLabels = {
  subagents: { label: 'Agents', icon: 'agent' },
  shells: { label: 'Shells', icon: 'terminal' },
  changes: { label: 'Changes', icon: 'diff' },
} as const satisfies Record<SessionPanel, { label: string; icon: IconName }>;

interface PanelTriggerProps {
  panel: SessionPanel;
  panels: SessionHeaderPanels;
}

function PanelTrigger({ panel, panels }: PanelTriggerProps): React.JSX.Element {
  const props = panelTriggerProps({ panel, panels });

  if (panel === 'changes' && panels.changesSummary)
    return (
      <Button
        variant="text"
        size="sm"
        onPress={props.onPress}
        {...countedChangeLabels(panels.changesSummary)}
      />
    );

  return <IconButton {...headerActionAppearance} {...props} />;
}

interface PanelTriggerControl {
  accessibilityLabel: string;
  onPress: () => void;
  icon: IconName;
}

const panelTriggerProps = ({
  panel,
  panels,
}: PanelTriggerProps): PanelTriggerControl => ({
  accessibilityLabel: sessionPanelLabels[panel].label,
  onPress: () => panels.onToggle(panel),
  icon: sessionPanelLabels[panel].icon,
});

function countedChangeLabels({
  files,
  additions,
  deletions,
}: ChangesSummary): Pick<React.ComponentProps<typeof Button>, 'label'> {
  return { label: `${files} +${additions} −${deletions}` };
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

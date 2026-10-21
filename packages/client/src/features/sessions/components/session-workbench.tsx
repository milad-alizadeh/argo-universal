import type { ComponentProps, ReactElement } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/content/text';
import type { SessionPanel } from '../stores/session-panels';
import type { SessionHeaderPanels } from './session-header-props';
import { sessionPanelLabels } from './session-panel-triggers';
import { WorkbenchAgents } from './session-workbench-agents';
import { WorkbenchCard } from './session-workbench-card';
import {
  WorkbenchChangesSection,
  WorkbenchChangesTotal,
} from './session-workbench-change-section';

// ADR-0039: a summary per section; its list lives in the Stage tab that pressing the card opens.
export function SessionWorkbench({
  panels,
}: {
  panels: SessionHeaderPanels;
}): ReactElement {
  return (
    <View testID="session-workbench" className="gap-2">
      {(['changes', 'subagents', 'shells'] as const).flatMap((panel) =>
        panels.offered.includes(panel) && hasSection(panel, panels)
          ? [<SectionCard key={panel} panel={panel} panels={panels} />]
          : [],
      )}
    </View>
  );
}

type SectionProps = { panel: SessionPanel; panels: SessionHeaderPanels };

function SectionCard(props: SectionProps): ReactElement {
  return (
    <WorkbenchCard {...sectionCardProps(props)}>
      <SectionSummary {...props} />
    </WorkbenchCard>
  );
}

function sectionCardProps({
  panel,
  panels,
}: SectionProps): Omit<ComponentProps<typeof WorkbenchCard>, 'children'> {
  return {
    title: panel === 'subagents' ? 'Agents' : sessionPanelLabels[panel].label,
    icon: sessionPanelLabels[panel].icon,
    onOpen: (): void => openSection(panel, panels),
    collapsible: panel !== 'shells',
    interactive: panel === 'changes' && hasPreview(panels),
    summary: <SectionHeaderSummary panel={panel} panels={panels} />,
    testID: `workbench-${panel}`,
  };
}

function SectionHeaderSummary({
  panel,
  panels,
}: SectionProps): ReactElement | null {
  return panel === 'changes' ? <WorkbenchChangesTotal panels={panels} /> : null;
}

const hasPreview = (panels: SessionHeaderPanels): boolean =>
  !!panels.pullRequests?.length;

function openSection(panel: SessionPanel, panels: SessionHeaderPanels): void {
  if (panel === 'changes') return openChangesSection(panels);

  selectSection(panel, panels);
}

function openChangesSection(panels: SessionHeaderPanels): void {
  if (hasPreview(panels) && panels.onOpenChanges) return panels.onOpenChanges();

  selectSection('changes', panels);
}

const selectSection = (
  panel: SessionPanel,
  panels: SessionHeaderPanels,
): void => (panels.onSelect ?? panels.onToggle)(panel);

function sectionCount(
  panel: SessionPanel,
  panels: SessionHeaderPanels,
): number {
  if (panel === 'changes') return changesCount(panels);

  return itemCount(panel, panels);
}

function hasSection(panel: SessionPanel, panels: SessionHeaderPanels): boolean {
  return sectionCount(panel, panels) > 0;
}

function SectionSummary({ panel, panels }: SectionProps): ReactElement {
  if (panel === 'changes')
    return (
      <WorkbenchChangesSection
        panels={panels}
        onOpen={() => openSection('changes', panels)}
      />
    );

  if (panel === 'subagents') return <AgentsSummary panels={panels} />;

  return (
    <View className="px-4 pb-3">
      <Text tone="muted">{sectionCount(panel, panels)}</Text>
    </View>
  );
}

function AgentsSummary({ panels }: Pick<SectionProps, 'panels'>): ReactElement {
  return panels.agents ? (
    <WorkbenchAgents {...panels.agents} />
  ) : (
    <View className="px-4 pb-3">
      <Text tone="muted">{itemCount('subagents', panels)}</Text>
    </View>
  );
}

const changesCount = (panels: SessionHeaderPanels): number =>
  Math.max(fileCount(panels), itemCount('changes', panels));

const fileCount = (panels: SessionHeaderPanels): number =>
  panels.changesSummary?.files ?? 0;

const itemCount = (panel: SessionPanel, panels: SessionHeaderPanels): number =>
  panels.counts?.[panel] ?? 0;

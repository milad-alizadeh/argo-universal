import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/content/text';
import type { SessionPanel } from '../stores/session-panels';
import { PullRequestChecks } from './pull-request-checks';
import type { SessionHeaderPanels } from './session-header-props';
import { sessionPanelLabels } from './session-panel-triggers';
import { WorkbenchAgents } from './session-workbench-agents';
import { WorkbenchCard } from './session-workbench-card';

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

function SectionCard({ panel, panels }: SectionProps): ReactElement {
  const title =
    panel === 'subagents' ? 'Agents' : sessionPanelLabels[panel].label;

  return (
    <WorkbenchCard
      title={title}
      icon={sessionPanelLabels[panel].icon}
      onOpen={() => (panels.onSelect ?? panels.onToggle)(panel)}
      collapsible={panel === 'subagents'}
      testID={`workbench-${panel}`}
    >
      <SectionSummary panel={panel} panels={panels} />
    </WorkbenchCard>
  );
}

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
  if (panel === 'changes') return <ChangesSection panels={panels} />;

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

function ChangesSummary({
  panels,
}: Pick<SectionProps, 'panels'>): ReactElement | null {
  const summary = panels.changesSummary;

  if (!summary) return null;

  return (
    <View className="flex-row items-center gap-2">
      <Text tone="muted">{summary.files} files</Text>
      <Text tone="success">+{summary.additions}</Text>
      <Text tone="danger">−{summary.deletions}</Text>
    </View>
  );
}

const changesCount = (panels: SessionHeaderPanels): number =>
  Math.max(fileCount(panels), itemCount('changes', panels));

const fileCount = (panels: SessionHeaderPanels): number =>
  panels.changesSummary?.files ?? 0;

const itemCount = (panel: SessionPanel, panels: SessionHeaderPanels): number =>
  panels.counts?.[panel] ?? 0;

function ChangesSection({
  panels,
}: Pick<SectionProps, 'panels'>): ReactElement {
  return (
    <View className="gap-2 px-4 pb-3">
      <ChangesSummary panels={panels} />
      {panels.checks && <PullRequestChecks {...panels.checks} />}
    </View>
  );
}

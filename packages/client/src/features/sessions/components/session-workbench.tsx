import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import { Card } from '#primitives/layout/card';
import type { SessionPanel } from '../stores/session-panels';
import type { SessionHeaderPanels } from './session-header-props';
import { sessionPanelLabels } from './session-panel-triggers';

// ADR-0039: a summary per section; its list lives in the Stage tab that pressing the card opens.
export function SessionWorkbench({
  panels,
}: {
  panels: SessionHeaderPanels;
}): ReactElement {
  return (
    <View testID="session-workbench" className="gap-2">
      {(['changes', 'subagents', 'shells'] as const)
        .filter(
          (panel) =>
            panels.offered.includes(panel) && hasSection(panel, panels),
        )
        .map((panel) => (
          <Card
            key={panel}
            title={
              panel === 'subagents' ? 'Agents' : sessionPanelLabels[panel].label
            }
            icon={<Icon name={sessionPanelLabels[panel].icon} role="body" />}
            onPress={() => (panels.onSelect ?? panels.onToggle)(panel)}
          >
            <SectionSummary panel={panel} panels={panels} />
          </Card>
        ))}
    </View>
  );
}

function hasSection(panel: SessionPanel, panels: SessionHeaderPanels): boolean {
  return panel === 'changes'
    ? (panels.changesSummary?.files ?? 0) > 0
    : (panels.counts?.[panel] ?? 0) > 0;
}

function SectionSummary({
  panel,
  panels,
}: {
  panel: SessionPanel;
  panels: SessionHeaderPanels;
}): ReactElement {
  if (panel !== 'changes')
    return <Text tone="muted">{panels.counts?.[panel]}</Text>;

  const summary = panels.changesSummary;

  return (
    <View className="flex-row items-center gap-2">
      <Text tone="muted">{summary?.files} files</Text>
      <Text tone="success">+{summary?.additions}</Text>
      <Text tone="danger">−{summary?.deletions}</Text>
    </View>
  );
}

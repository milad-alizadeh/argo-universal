import { Card } from '@repo/kit/primitives/layout/card';
import type { ComponentProps, ReactElement, ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import type { SessionPanel } from '../stores/session-panels';
import type { SessionHeaderPanels } from './session-header-props';
import { sessionPanelLabels } from './session-panel-triggers';
import { WorkbenchAgents } from './session-workbench-agents';
import {
  WorkbenchChangesFooter,
  WorkbenchChangesSection,
} from './session-workbench-change-section';
import {
  hasPreview,
  hasSection,
  itemCount,
  openSection,
  workbenchPanels,
} from './session-workbench-sections';
import type { WorkbenchColumnCard } from './workbench-column';
import { WorkbenchCountSummary } from './workbench-count-summary';

type SectionProps = { panel: SessionPanel; panels: SessionHeaderPanels };

const sectionTitle = (panel: SessionPanel): string =>
  panel === 'subagents' ? 'Agents' : sessionPanelLabels[panel].label;

// The cards the Session has something for, in the Workbench's default order.
export function workbenchCards(
  panels: SessionHeaderPanels,
): WorkbenchColumnCard[] {
  return workbenchPanels
    .filter(
      (panel) => panels.offered.includes(panel) && hasSection(panel, panels),
    )
    .map((panel) => ({
      id: panel,
      label: sectionTitle(panel),
      render: (handle) => (
        <SectionCard panel={panel} panels={panels} handle={handle} />
      ),
    }));
}

type CardProps = ComponentProps<typeof Card>;

// Paper / WorkbenchGlass: each section owns its glass plate; the generic collapsible card draws it. Rows carry 4 of their own beside their hover tile, so the body and footer pull 4 out to line the rows' text up with the title.
const sectionCardProps = (
  props: SectionProps & { handle: ReactNode },
): CardProps => ({
  kind: 'glass',
  density: 'compact',
  collapsible: true,
  defaultOpen: true,
  title: sectionTitle(props.panel),
  actions: props.handle,
  footer: <SectionFooter {...props} />,
});

function SectionCard(
  props: SectionProps & { handle: ReactNode },
): ReactElement {
  return (
    <View testID={`workbench-${props.panel}`}>
      <Card {...sectionCardProps(props)}>
        <View className="-mx-1">
          <SectionBody {...props} />
        </View>
      </Card>
    </View>
  );
}

function SectionFooter({ panel, panels }: SectionProps): ReactElement | null {
  if (panel !== 'changes') return null;

  return (
    <View className="-mx-1">
      <WorkbenchChangesFooter
        panels={panels}
        onOpen={() => openSection('changes', panels)}
      />
    </View>
  );
}

// Changes with a preview carry their own presses on rows; every other body is one press that opens its section.
function SectionBody(props: SectionProps): ReactElement {
  const content = <SectionSummary {...props} />;

  if (props.panel === 'changes' && hasPreview(props.panels)) return content;

  return (
    <Pressable
      role="button"
      accessibilityLabel={`Open ${sectionTitle(props.panel)} overview`}
      onPress={() => openSection(props.panel, props.panels)}
    >
      {content}
    </Pressable>
  );
}

function SectionSummary(props: SectionProps): ReactElement {
  if (props.panel === 'changes') return <ChangesSummary {...props} />;

  if (props.panel === 'subagents') return <AgentsSummary {...props} />;

  return <CountSummary {...props} />;
}

function AgentsSummary(props: SectionProps): ReactElement {
  return props.panels.agents ? (
    <WorkbenchAgents {...props.panels.agents} />
  ) : (
    <CountSummary {...props} />
  );
}

function ChangesSummary({ panels }: SectionProps): ReactElement {
  return (
    <WorkbenchChangesSection
      panels={panels}
      onOpen={() => openSection('changes', panels)}
    />
  );
}

function CountSummary({ panel, panels }: SectionProps): ReactElement {
  return (
    <WorkbenchCountSummary
      count={itemCount(panel, panels)}
      icon={sessionPanelLabels[panel].icon}
      noun={panel === 'subagents' ? 'agent' : 'shell'}
    />
  );
}

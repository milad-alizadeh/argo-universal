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
  type Section,
  workbenchPanels,
} from './session-workbench-sections';
import type { WorkbenchColumnCard } from './workbench-column';
import { WorkbenchCountSummary } from './workbench-count-summary';

const sectionTitle = (panel: SessionPanel): string =>
  sessionPanelLabels[panel].label;

// The cards the Session has something for, in the Workbench's default order.
export function workbenchCards(
  panels: SessionHeaderPanels,
): WorkbenchColumnCard[] {
  return workbenchPanels
    .map((panel): Section => ({ panel, panels }))
    .filter((section) => panels.offered.includes(section.panel))
    .filter(hasSection)
    .map((section) => ({
      id: section.panel,
      label: sectionTitle(section.panel),
      render: (handle) => <SectionCard {...section} handle={handle} />,
    }));
}

// What each section draws: its summary, and the footer under it where it has one.
const sectionViews: Record<
  SessionPanel,
  {
    Summary: (section: Section) => ReactElement;
    Footer?: (section: Section) => ReactElement;
  }
> = {
  changes: { Summary: ChangesSummary, Footer: ChangesFooter },
  subagents: { Summary: AgentsSummary },
  shells: { Summary: ShellsSummary },
};

type CardProps = ComponentProps<typeof Card>;

// Each section owns its glass plate; the generic collapsible card draws it. Rows carry 4 of their own beside their hover tile, so the body and footer pull 4 out to line the rows' text up with the title.
const sectionCardProps = (section: Section, handle: ReactNode): CardProps => ({
  kind: 'glass',
  density: 'compact',
  collapsible: true,
  defaultOpen: true,
  title: sectionTitle(section.panel),
  actions: handle,
  footer: <SectionFooter {...section} />,
});

function SectionCard({
  handle,
  ...section
}: Section & { handle: ReactNode }): ReactElement {
  return (
    <View testID={`workbench-${section.panel}`}>
      <Card {...sectionCardProps(section, handle)}>
        <View className="-mx-1">
          <SectionBody {...section} />
        </View>
      </Card>
    </View>
  );
}

function SectionFooter(section: Section): ReactElement | null {
  const { Footer } = sectionViews[section.panel];

  if (!Footer) return null;

  return (
    <View className="-mx-1">
      <Footer {...section} />
    </View>
  );
}

// Changes with a preview carry their own presses on rows; every other body is one press that opens its section.
function SectionBody(section: Section): ReactElement {
  const { Summary } = sectionViews[section.panel];

  if (section.panel === 'changes' && hasPreview(section))
    return <Summary {...section} />;

  return (
    <Pressable
      role="button"
      accessibilityLabel={`Open ${sectionTitle(section.panel)} overview`}
      onPress={() => openSection(section)}
    >
      <Summary {...section} />
    </Pressable>
  );
}

function ChangesFooter(section: Section): ReactElement {
  return (
    <WorkbenchChangesFooter
      panels={section.panels}
      onOpen={() => openSection(section)}
    />
  );
}

function ChangesSummary(section: Section): ReactElement {
  return (
    <WorkbenchChangesSection
      panels={section.panels}
      onOpen={() => openSection(section)}
    />
  );
}

function AgentsSummary(section: Section): ReactElement {
  const { agents } = section.panels;

  return agents ? (
    <WorkbenchAgents {...agents} />
  ) : (
    <CountSummary {...section} noun="agent" />
  );
}

function ShellsSummary(section: Section): ReactElement {
  return <CountSummary {...section} noun="shell" />;
}

function CountSummary({
  noun,
  ...section
}: Section & { noun: 'agent' | 'shell' }): ReactElement {
  return (
    <WorkbenchCountSummary
      count={itemCount(section)}
      icon={sessionPanelLabels[section.panel].icon}
      noun={noun}
    />
  );
}

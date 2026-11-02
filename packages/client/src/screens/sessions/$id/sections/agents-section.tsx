import type { ReactNode } from 'react';
import { WorkbenchAgents, WorkbenchMoreAgents } from '#features/sessions';
import type { SubagentListProps } from '#features/sessions';
import { SessionAgentsTab } from '../session-agents-tab';
import type { SessionInspectorContent } from '../session-inspector-content';
import { agentsFacts } from './agents-facts';
import type { SectionTabHandle, SessionSection } from './session-section';

const noAgents: SubagentListProps = { subagents: [] };

// A row opens that Agent's Feed in the tab, or sends the person to its own page if the Session can't show it read-only.
const agentsSummary = (
  { subagents = noAgents }: SessionInspectorContent,
  tab: SectionTabHandle,
): ReactNode => (
  <WorkbenchAgents
    {...subagents}
    onOpen={(agent) => {
      subagents.onSelect?.(agent);

      if (agent.readOnly) tab.open();
    }}
  />
);

// The footer opens the list, so it first closes any open Feed.
const agentsFooter = (
  { subagents = noAgents, openSubagentFeed }: SessionInspectorContent,
  tab: SectionTabHandle,
): ReactNode => (
  <WorkbenchMoreAgents
    subagents={subagents.subagents}
    onOpen={() => {
      openSubagentFeed?.onBack();
      tab.open();
    }}
  />
);

export const agentsSection: SessionSection = {
  ...agentsFacts,
  card: (content, tab) => ({
    summary: agentsSummary(content, tab),
    footer: agentsFooter(content, tab),
  }),
  tab: ({ subagents = noAgents, renderSubagentFeed, openSubagentFeed }) => ({
    count: subagents.subagents.length,
    countTone: subagents.subagents.some((one) => one.state !== 'idle')
      ? 'success'
      : 'muted',
    body: (
      <SessionAgentsTab
        {...subagents}
        renderFeed={renderSubagentFeed}
        open={openSubagentFeed}
      />
    ),
  }),
};

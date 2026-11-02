import {
  WorkbenchAgents,
  WorkbenchMoreAgents,
  type SubagentListProps,
} from '#features/sessions';
import { SessionAgentsTab } from '../session-agents-tab';
import { agentsFacts } from './agents-facts';
import type { SessionSection } from './session-section';

const noAgents: SubagentListProps = { subagents: [] };

// Picking an Agent opens its Feed in the tab; one the Session can't show read-only leaves for its own page instead.
export const agentsSection: SessionSection = {
  ...agentsFacts,
  card: ({ subagents = noAgents }, tab) => ({
    summary: (
      <WorkbenchAgents
        {...subagents}
        onOpen={(agent) => {
          subagents.onSelect?.(agent);

          if (agent.readOnly) tab.open();
        }}
      />
    ),
    footer: (
      <WorkbenchMoreAgents subagents={subagents.subagents} onOpen={tab.open} />
    ),
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

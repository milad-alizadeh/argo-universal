import { WorkbenchAgents } from '#features/sessions';
import { SessionAgentsTab } from '../session-agents-tab';
import { agentsFacts } from './agents-facts';
import type { SessionSection } from './session-section';

const noAgents = { subagents: [] };

export const agentsSection: SessionSection = {
  ...agentsFacts,
  card: ({ subagents = noAgents }, tab) => ({
    summary: <WorkbenchAgents {...subagents} />,
    onOpen: tab.open,
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

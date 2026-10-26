import { WorkbenchAgents } from '#features/sessions';
import { SessionAgentsStage } from '../session-agents-stage';
import { agentsFacts } from './agents-facts';
import type { SessionSection } from './session-section';

const noAgents = { subagents: [] };

export const agentsSection: SessionSection = {
  ...agentsFacts,
  card: ({ subagents = noAgents }, tab) => ({
    summary: <WorkbenchAgents {...subagents} />,
    onOpen: tab.open,
  }),
  tab: ({ subagents = noAgents, renderSubagentFeed }) => ({
    count: subagents.subagents.length,
    countTone: subagents.subagents.some((one) => one.state !== 'idle')
      ? 'success'
      : 'muted',
    body: <SessionAgentsStage {...subagents} renderFeed={renderSubagentFeed} />,
  }),
};

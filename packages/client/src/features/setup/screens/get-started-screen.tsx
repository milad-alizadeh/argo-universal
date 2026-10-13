import { useQuery } from '@tanstack/react-query';
import type * as React from 'react';
import { runsSessions, useAgents, useInstalledAgents } from '#features/agents';
import { useTRPC } from '#features/connection';
import { useNavigate } from '#lib/product/navigation/context';
import { GetStartedView } from '../components/get-started-view/get-started-view';
import { type AgentStep, agentStep } from '../state/get-started';

function useAgentStep(): AgentStep & { checkAgain: () => void } {
  const agents = useAgents();
  const rows = useInstalledAgents();
  const runners =
    agents.data === undefined ? undefined : rows.filter(runsSessions);
  return { ...agentStep(runners, agents.retrying), checkAgain: agents.retry };
}

// Get started on the Server: GitHub sign-in and Add Project are not built yet, so the view shows them disabled.
export function GetStartedScreen(): React.JSX.Element {
  const navigate = useNavigate();
  const { checkAgain, ...agent } = useAgentStep();
  const serverInfo = useQuery(useTRPC().system.info.queryOptions());
  return (
    <GetStartedView
      serverName={serverInfo.data?.name}
      agent={agent}
      github={{ status: 'not-connected' }}
      onChangeAgent={() => navigate({ to: 'settings-agents' })}
      onCheckAgentAgain={checkAgain}
      onUseOnPhone={() => navigate({ to: 'settings-devices' })}
    />
  );
}

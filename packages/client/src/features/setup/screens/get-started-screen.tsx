import { useQuery } from '@tanstack/react-query';
import type * as React from 'react';
import { runsSessions, useAgents, useInstalledAgents } from '#features/agents';
import { useTRPC } from '#features/connection';
import {
  type ErrorToast,
  useErrorToast,
} from '#lib/generic/primitives/overlays/toast/toast';
import { useNavigate } from '#lib/product/navigation/context';
import type { GetStartedViewProps } from '../components/get-started-view/get-started-props';
import { GetStartedView } from '../components/get-started-view/get-started-view';
import { type AgentStep, agentStep } from '../state/get-started';

const agentsFailed: ErrorToast = {
  title: 'Couldn’t load your Agents',
  message: 'The Server didn’t respond. Check that it’s running.',
};

// The installed rows once the list has loaded or failed; `undefined` while it loads.
const loadedRows = <Row,>(
  agents: { data?: unknown; isError: boolean },
  rows: Row[],
): Row[] | undefined =>
  agents.data !== undefined || agents.isError ? rows : undefined;

// A failed load shows the toast and leaves step 1 on Check again.
function useAgentStep(): { step?: AgentStep; checkAgain: () => void } {
  const agents = useAgents();
  const rows = useInstalledAgents();
  useErrorToast(agents.isError ? agentsFailed : undefined);
  const runners = loadedRows(agents, rows)?.filter(runsSessions);
  return {
    step: agentStep(runners, agents.retrying),
    checkAgain: agents.retry,
  };
}

const useServerName = (): string | undefined =>
  useQuery(useTRPC().system.info.queryOptions()).data?.name;

function useSetupLinks(): Pick<
  GetStartedViewProps,
  'onChangeAgent' | 'onUseOnPhone'
> {
  const navigate = useNavigate();
  return {
    onChangeAgent: () => navigate({ to: 'settings-agents' }),
    onUseOnPhone: () => navigate({ to: 'settings-devices' }),
  };
}

// Get started on the Server: GitHub sign-in and Add Project are not built yet, so the view shows them disabled; it draws once the Agents are known.
export function GetStartedScreen(): React.JSX.Element | null {
  const links = useSetupLinks();
  const { step, checkAgain } = useAgentStep();
  const serverName = useServerName();
  if (!step) return null;
  return (
    <GetStartedView
      serverName={serverName}
      agent={step}
      github={{ status: 'not-connected' }}
      onCheckAgentAgain={checkAgain}
      {...links}
    />
  );
}

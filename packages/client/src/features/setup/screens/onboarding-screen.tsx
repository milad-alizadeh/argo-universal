import { useQuery } from '@tanstack/react-query';
import type * as React from 'react';
import { runsSessions, useAgents, useInstalledAgents } from '#features/agents';
import { useTRPC } from '#features/connection';
import {
  type ErrorToast,
  useErrorToast,
} from '#lib/generic/primitives/overlays/toast/toast';
import { useNavigate } from '#lib/product/navigation/context';
import { OnboardingView } from '../components/onboarding-view/onboarding-view';
import { type AgentStep, agentStep } from '../state/onboarding';

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

type AgentStepState = { step?: AgentStep; checkAgain: () => void };

// A failed load shows the toast and leaves step 1 on Check again.
function useAgentStep(): AgentStepState {
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

function useChangeAgent(): () => void {
  const navigate = useNavigate();

  return () => navigate({ to: 'settings-agents' });
}

// Onboarding on the Server: GitHub sign-in and Add Project are not built yet, so the view shows them disabled; it draws once the Agents are known.
export function OnboardingScreen(): React.JSX.Element | null {
  const onChangeAgent = useChangeAgent();
  const { step, checkAgain } = useAgentStep();
  const serverName = useServerName();

  if (!step) return null;

  return (
    <OnboardingView
      serverName={serverName}
      agent={step}
      github={{ status: 'not-connected' }}
      onCheckAgentAgain={checkAgain}
      onChangeAgent={onChangeAgent}
    />
  );
}

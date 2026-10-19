import { useQuery } from '@tanstack/react-query';
import type * as React from 'react';
import { loadedAgents, useInstalledAgents } from '#features/agents';
import { useTRPC } from '#features/connection';
import { agentStep } from '#features/setup';
import { useNavigate } from '#lib/product/navigation/navigation';
import type { OnboardingViewProps } from './onboarding-props';
import { OnboardingView } from './onboarding-view';

function useOnboarding(): OnboardingViewProps {
  // The step has no loading look, so it stays open until the Server lists an Installed Agent.
  const installed = loadedAgents(useInstalledAgents());
  const serverName = useQuery(useTRPC().system.info.queryOptions()).data?.name;
  const navigate = useNavigate();

  return {
    serverName,
    agent: agentStep(installed),
    github: { status: 'not-connected' },
    onAddAgent: () => navigate('/settings/agents'),
  };
}

export function OnboardingScreen(): React.JSX.Element {
  return <OnboardingView {...useOnboarding()} />;
}

import { useQuery } from '@tanstack/react-query';
import type * as React from 'react';
import {
  type InstalledAgents,
  loadedAgents,
  useRegistryAgents,
  useRememberedAgent,
} from '#features/agents';
import { useTRPC } from '#features/connection';
import { type AgentStep, agentStep } from '#features/setup';
import type { OnboardingViewProps } from './onboarding-props';
import { OnboardingView } from './onboarding-view';

// The step has no loading look, so it stays open until the Server lists an Installed Agent.
const installedStep = (installed: InstalledAgents): AgentStep =>
  agentStep(loadedAgents(installed));

function useOnboarding(): OnboardingViewProps {
  // An Agent installed here becomes New Session's Agent.
  const agents = useRegistryAgents(useRememberedAgent().select);
  const serverName = useQuery(useTRPC().system.info.queryOptions()).data?.name;

  return {
    serverName,
    agent: installedStep(agents.installed),
    github: { status: 'not-connected' },
    featured: agents.featured,
    onInstallAgent: agents.install,
    onRemoveAgent: agents.remove,
    onRetry: agents.retry,
  };
}

export function OnboardingScreen(): React.JSX.Element {
  return <OnboardingView {...useOnboarding()} />;
}

import { useQuery } from '@tanstack/react-query';
import type * as React from 'react';
import {
  useAgentCatalog,
  useAgentManagement,
  useInstalledAgents,
  useRememberedAgent,
  type CatalogLoad,
} from '#features/agents';
import { useTRPC } from '#features/connection';
import { agentStep, featuredAgents } from '#features/setup';
import type { OnboardingViewProps } from './onboarding-props';
import { OnboardingView } from './onboarding-view';

const featured = (load: CatalogLoad): OnboardingViewProps['featured'] =>
  load.status === 'loaded' ? featuredAgents(load.catalog) : [];

function useOnboarding(): OnboardingViewProps {
  const catalog = useAgentCatalog(),
    installed = useInstalledAgents();

  const management = useAgentManagement(useRememberedAgent().select);
  const serverName = useQuery(useTRPC().system.info.queryOptions()).data?.name;

  return {
    serverName,
    ...installedStep(installed),
    github: { status: 'not-connected' },
    featured: featured(catalog.load),
    catalog: catalog.load,
    onInstallAgent: management.install,
    onRetry: catalog.retry,
  };
}

export function OnboardingScreen(): React.JSX.Element {
  return <OnboardingView {...useOnboarding()} />;
}

const installedStep = (
  installed: ReturnType<typeof useInstalledAgents>,
): Pick<OnboardingViewProps, 'agent' | 'installed'> => ({
  agent: agentStep(installed),
  installed: installed.map(({ id }) => id),
});

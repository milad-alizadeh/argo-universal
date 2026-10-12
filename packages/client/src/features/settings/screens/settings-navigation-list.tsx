import type * as React from 'react';
import { needsAction, useAgents, useInstalledAgents } from '#features/agents';
import { useConnectionState } from '#features/connection';
import {
  type NavigationDestination,
  useNavigate,
} from '#lib/product/navigation/context';
import {
  SettingsList,
  type SettingsListProps,
} from '../components/settings-list/settings-list';
import { useProjects } from '../hooks/use-projects';

export interface SettingsNavigationListProps {
  selectedDestination?: NavigationDestination;
  // The sidebar's search.
  query?: string;
}

type ServerCounts = Pick<
  SettingsListProps,
  'projectCount' | 'agentCount' | 'agentsNeedAttention'
>;

/*
 * The Server's Projects and Agents the sidebar counts, and whether an Agent
 * needs the user. Each stays undefined until the Server has answered once, so
 * the list never counts 0 for what it does not know yet; once answered, the
 * cached answer stays while the Connection is down.
 */
function useServerCounts(): ServerCounts {
  const agents = useInstalledAgents();
  const agentsKnown = useAgents().data !== undefined;
  return {
    projectCount: useProjects().data?.length,
    agentCount: agentsKnown ? agents.length : undefined,
    agentsNeedAttention: agents.some(needsAction),
  };
}

export function SettingsNavigationList({
  selectedDestination,
  query,
}: SettingsNavigationListProps): React.JSX.Element {
  return (
    <SettingsList
      {...useServerCounts()}
      selectedDestination={selectedDestination}
      query={query}
      onSelect={useNavigate()}
      status={connectionStatus(useConnectionState())}
    />
  );
}

function connectionStatus(
  connection: ReturnType<typeof useConnectionState>,
): React.ComponentProps<typeof SettingsList>['status'] {
  if (connection === 'open') return 'ready';
  return connection === 'connecting' ? 'loading' : 'disconnected';
}

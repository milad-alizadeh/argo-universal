import type * as React from 'react';
import { useInstalledAgents } from '#features/agents';
import { useConnectionState } from '#features/connection';
import {
  SettingsList,
  type SettingsListProps,
  useProjects,
} from '#features/settings';
import { useNavigate } from '#lib/product/navigation/navigation';
import { usePluginEntries } from './plugins/use-plugins';

export interface SettingsNavigationListProps {
  // The path of the page shown, whose row the sidebar marks.
  selectedPath?: string;
  // The sidebar's search.
  query?: string;
}

type ServerCounts = Pick<
  SettingsListProps,
  'projectCount' | 'agentCount' | 'pluginCount'
>;

/*
 * The Server's Projects, Agents and Plugins the sidebar counts. Each stays undefined until the Server has answered once, so
 * the list never counts 0 for what it does not know yet; once answered, the
 * cached answer stays while the Connection is down.
 */
function useServerCounts(): ServerCounts {
  const agents = useInstalledAgents();
  const { plugins } = usePluginEntries();

  return {
    projectCount: useProjects().data?.length,
    agentCount: agents.status === 'loaded' ? agents.agents.length : undefined,
    pluginCount: plugins?.length,
  };
}

export function SettingsNavigationList({
  selectedPath,
  query,
}: SettingsNavigationListProps): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <SettingsList
      {...useServerCounts()}
      selectedPath={selectedPath}
      query={query}
      onSelect={(href) => navigate(href)}
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

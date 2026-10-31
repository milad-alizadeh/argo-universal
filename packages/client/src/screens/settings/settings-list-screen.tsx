import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import { usePathname } from 'expo-router';
import type * as React from 'react';
import { Platform } from 'react-native';
import { useInstalledAgents } from '#features/agents';
import { useConnectionState } from '#features/connection';
import { useProjects, useThemeChoice } from '#features/settings';
import { useNavigate } from '#lib/product/navigation/navigation';
import { type ServerScope, useServerScope } from '#lib/product/server-scope';
import { sections } from '../../lib/product/navigation/sections';
import { usePluginEntries } from './plugins/use-plugins';
import { connectionStatus } from './settings-connection-status';
import {
  SettingsListView,
  type SettingsListViewProps,
} from './settings-list/settings-list-view';

type ServerCounts = Pick<
  SettingsListViewProps,
  'projectCount' | 'agentCount' | 'pluginCount'
>;

/*
 * The Server's Projects, Agents and Plugins the list counts. Each stays undefined until the Server has answered once,
 * so the list never counts 0 for what it does not know yet; once answered, the cached answer stays while the
 * Connection is down.
 */
function useServerCounts(): ServerCounts {
  return {
    projectCount: useProjects().data?.length,
    agentCount: useAgentCount(),
    pluginCount: usePluginEntries().plugins?.length,
  };
}

function useAgentCount(): number | undefined {
  const agents = useInstalledAgents();

  return agents.status === 'loaded' ? agents.agents.length : undefined;
}

// The Settings pages as the Server and this device know them, narrowed by the search; a row opens its page.
function useSettingsList(query?: string): SettingsListViewProps {
  const navigate = useNavigate();
  const theme = useThemeChoice();

  return {
    ...useServerCounts(),
    selectedPath: usePathname(),
    query,
    onSelect: (href) => navigate(href),
    status: connectionStatus(useConnectionState()),
    theme: theme.choice,
    onThemeChange: theme.choose,
    ...lookedAtServer(useServerScope()),
  };
}

// Which Server the pages are of: a Server this Device paired with has Settings of its own (ADR-0022).
const lookedAtServer = (
  server: ServerScope,
): Pick<SettingsListViewProps, 'serverName' | 'paired'> => ({
  serverName: server.name,
  paired: !server.serverDevice,
});

export interface SettingsListScreenProps {
  query: string;
  onQueryChange: (query: string) => void;
}

// Native Settings has no search, at any size; the web searches.
const settingsSearch =
  Platform.OS === 'web' ? { label: 'Search Settings' } : undefined;

/*
 * Settings' list under its own Screen, which declares its title and, on the web, the search holding what narrows the
 * pages. The Frame places it, as it places the Sessions list: in the sidebar beside the pages on a wide window, as the
 * root of the stack under wide.
 */
export function SettingsListScreen(
  props: SettingsListScreenProps,
): React.JSX.Element {
  return (
    <Screen
      title={sections.settings.title}
      search={settingsSearch}
      value={props.query}
      onChangeText={props.onQueryChange}
    >
      <SettingsListView {...useSettingsList(props.query)} />
    </Screen>
  );
}

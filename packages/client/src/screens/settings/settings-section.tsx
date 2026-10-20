import { usePathname } from 'expo-router';
import type * as React from 'react';
import type { ReactNode } from 'react';
import { useInstalledAgents } from '#features/agents';
import { useConnectionState } from '#features/connection';
import { SectionListDetail, useSectionList } from '#features/frame';
import {
  themeChoiceLabel,
  useProjects,
  useThemeChoice,
} from '#features/settings';
import { useNavigate } from '#lib/product/navigation/navigation';
import { usePluginEntries } from './plugins/use-plugins';
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

function connectionStatus(
  connection: ReturnType<typeof useConnectionState>,
): SettingsListViewProps['status'] {
  if (connection === 'open') return 'ready';

  return connection === 'connecting' ? 'loading' : 'disconnected';
}

// The Settings pages as the Server and this device know them, narrowed by the search; a row opens its page.
function useSettingsList(query?: string): SettingsListViewProps {
  const navigate = useNavigate();

  return {
    ...useServerCounts(),
    selectedPath: usePathname(),
    query,
    onSelect: (href) => navigate(href),
    status: connectionStatus(useConnectionState()),
    appearanceState: themeChoiceLabel(useThemeChoice().choice),
  };
}

/*
 * Settings' stack in SettingsLayout: on a wide window the pages' list takes the Frame's sidebar while Settings is
 * shown, beside the page; under wide the stack is the screen and its root lists the pages.
 */
export function SettingsSection(props: {
  children: ReactNode;
}): React.JSX.Element {
  const pages = useSettingsList(useSectionList('settings').query);

  return (
    <SectionListDetail>
      <SettingsListView {...pages}>{props.children}</SettingsListView>
    </SectionListDetail>
  );
}

// A narrow window's Settings root: the pages alone.
export function SettingsRootList(props: { query?: string }): React.JSX.Element {
  return <SettingsListView {...useSettingsList(props.query)} />;
}

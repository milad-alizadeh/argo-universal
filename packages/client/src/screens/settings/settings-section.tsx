import { usePathname } from 'expo-router';
import type * as React from 'react';
import type { ReactNode } from 'react';
import { useInstalledAgents } from '#features/agents';
import { useConnectionState } from '#features/connection';
import { SectionListDetail, useSectionList } from '#features/frame';
import { useProjects } from '#features/settings';
import { useNavigate } from '#lib/product/navigation/navigation';
import { usePluginEntries } from './plugins/use-plugins';
import {
  SettingsPages,
  type SettingsPagesProps,
} from './settings-pages/settings-pages';

type ServerCounts = Pick<
  SettingsPagesProps,
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
): SettingsPagesProps['status'] {
  if (connection === 'open') return 'ready';

  return connection === 'connecting' ? 'loading' : 'disconnected';
}

// The Settings pages as the Server and this device know them, narrowed by the search; a row opens its page.
function useSettingsPages(query?: string): SettingsPagesProps {
  const navigate = useNavigate();

  return {
    ...useServerCounts(),
    selectedPath: usePathname(),
    query,
    onSelect: (href) => navigate(href),
    status: connectionStatus(useConnectionState()),
  };
}

/*
 * Settings' stack in SettingsLayout: on a wide window the pages' list takes the Frame's sidebar while Settings is
 * shown, beside the page; under wide the stack is the screen and its root lists the pages.
 */
export function SettingsSection(props: {
  children: ReactNode;
}): React.JSX.Element {
  const pages = useSettingsPages(useSectionList('settings').query);

  return (
    <SectionListDetail>
      <SettingsPages {...pages}>{props.children}</SettingsPages>
    </SectionListDetail>
  );
}

// A narrow window's Settings root: the pages alone.
export function SettingsRootList(props: { query?: string }): React.JSX.Element {
  return <SettingsPages {...useSettingsPages(props.query)} />;
}

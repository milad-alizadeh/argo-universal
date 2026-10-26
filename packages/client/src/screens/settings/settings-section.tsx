import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import { usePathname } from 'expo-router';
import type * as React from 'react';
import type { ReactNode } from 'react';
import { Platform } from 'react-native';
import { useInstalledAgents } from '#features/agents';
import { useConnectionState } from '#features/connection';
import { SectionListDetail, useSectionList } from '#features/frame';
import { useProjects, useThemeChoice } from '#features/settings';
import { useNavigate } from '#lib/product/navigation/navigation';
import { sections } from '../../lib/product/navigation/sections';
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
  const theme = useThemeChoice();

  return {
    ...useServerCounts(),
    selectedPath: usePathname(),
    query,
    onSelect: (href) => navigate(href),
    status: connectionStatus(useConnectionState()),
    theme: theme.choice,
    onThemeChange: theme.choose,
  };
}

/*
 * Settings' stack in SettingsLayout: on a wide window the pages' list takes the Frame's sidebar while Settings is
 * shown, beside the page; under wide the stack is the screen and its root lists the pages.
 */
export function SettingsSection(props: {
  children: ReactNode;
}): React.JSX.Element {
  const { screen } = useSectionList('settings');
  const pages = useSettingsList(screen?.value);

  return (
    <SectionListDetail>
      <SettingsListView {...pages} screen={screen}>
        {props.children}
      </SettingsListView>
    </SectionListDetail>
  );
}

interface SettingsRootScreenProps {
  query: string;
  onQueryChange: (query: string) => void;
}

// Native Settings has no search, at any size; the web searches.
const settingsSearch =
  Platform.OS === 'web' ? { label: 'Search Settings' } : undefined;

// Settings' Screen, declared once: its title, and the web's search holding what narrows the pages.
export const settingsScreen = (
  props: SettingsRootScreenProps,
): NonNullable<SettingsListViewProps['screen']> => ({
  title: sections.settings.title,
  search: settingsSearch,
  value: props.query,
  onChangeText: props.onQueryChange,
});

// A narrow window's Settings root: the pages under Settings' Screen.
export function SettingsRootScreen(
  props: SettingsRootScreenProps,
): React.JSX.Element {
  return (
    <Screen {...settingsScreen(props)}>
      <SettingsListView {...useSettingsList(props.query)} />
    </Screen>
  );
}

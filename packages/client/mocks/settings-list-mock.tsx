import { useState } from 'react';
import { View } from 'react-native';
import { DesktopShell } from '../src/components/DesktopShell';
import { PhoneShell, type ShellSection } from '../src/components/PhoneShell';
import { SettingsList } from '../src/components/SettingsList';
import {
  type NavigationDestination,
  useNavigate,
} from '../src/navigation/context';
import { useWide } from '../src/navigation/use-wide';
import { Button } from '../src/primitives/button';
import { Text } from '../src/primitives/text';
import {
  AccountsScreen,
  AtlasScreen,
  IssuesScreen,
  ProjectSettingsScreen,
} from '../src/screens/PlaceholderScreens';

export const settingsListMocks = {
  projects: [{ name: 'example-project' }],
  agents: [
    { agent: 'first-agent', label: 'First Agent' },
    { agent: 'second-agent', label: 'Second Agent' },
  ],
};

export type PlaceholderPage =
  | 'issues'
  | 'atlas'
  | 'accounts'
  | 'project'
  | 'settings';

export function SettingsListMock({
  page = 'settings',
}: {
  page?: PlaceholderPage;
}) {
  const wide = useWide();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarShown, setSidebarShown] = useState(true);
  const [destination, setDestination] = useState<
    NavigationDestination | undefined
  >(() =>
    page === 'accounts'
      ? { to: 'settings-accounts' }
      : page === 'project'
        ? { to: 'settings-project', name: 'example-project' }
        : undefined,
  );
  const section = page === 'issues' || page === 'atlas' ? page : 'settings';
  const title = section.charAt(0).toUpperCase() + section.slice(1);
  const selectedDestination: NavigationDestination | undefined =
    destination ?? (wide ? { to: 'settings-accounts' } : undefined);
  const list = (
    <SettingsList
      {...settingsListMocks}
      selectedDestination={selectedDestination}
      onSelect={(next) => {
        navigate(next);
        setDestination(next);
      }}
    />
  );
  const detail =
    page === 'issues' ? (
      <IssuesScreen />
    ) : page === 'atlas' ? (
      <AtlasScreen />
    ) : selectedDestination?.to === 'settings-projects' ? (
      <View className="gap-2 p-4">
        <Text role="heading">Projects</Text>
        {settingsListMocks.projects.map(({ name }) => (
          <Button
            key={name}
            variant="ghost"
            accessibilityLabel={name}
            onPress={() => {
              const next: NavigationDestination = {
                to: 'settings-project',
                name,
              };
              navigate(next);
              setDestination(next);
            }}
          >
            <Text>{name}</Text>
          </Button>
        ))}
      </View>
    ) : selectedDestination?.to === 'settings-agents' ? (
      <View className="gap-2 p-4">
        <Text role="heading">Agents</Text>
        {settingsListMocks.agents.map(({ agent, label }) => (
          <Button
            key={agent}
            variant="ghost"
            accessibilityLabel={label}
            onPress={() => {
              const next: NavigationDestination = {
                to: 'settings-agent',
                agent,
              };
              navigate(next);
              setDestination(next);
            }}
          >
            <Text>{label}</Text>
          </Button>
        ))}
      </View>
    ) : selectedDestination?.to === 'settings-project' ? (
      <ProjectSettingsScreen name={selectedDestination.name} />
    ) : selectedDestination?.to === 'settings-agent' ? (
      <Text className="p-6">
        Settings for {selectedDestination.agent} will appear here.
      </Text>
    ) : selectedDestination &&
      selectedDestination.to !== 'settings-accounts' ? (
      <Text className="p-6">
        {selectedDestination.to === 'settings-connection'
          ? 'Connection'
          : selectedDestination.to === 'settings-devices'
            ? 'Devices'
            : selectedDestination.to === 'settings-appearance'
              ? 'Appearance'
              : 'Notifications'}{' '}
        will appear here.
      </Text>
    ) : (
      <AccountsScreen />
    );

  function selectSection(next: ShellSection) {
    navigate(next === 'settings' ? { to: 'settings-accounts' } : { to: next });
  }

  if (wide) {
    return (
      <DesktopShell
        selectedSection={section}
        attentionCount={0}
        sidebarShown={sidebarShown}
        onSidebarShownChange={setSidebarShown}
        onSectionChange={selectSection}
        listHeader={<Text className="text-base font-semibold">{title}</Text>}
        list={
          section === 'settings' ? (
            list
          ) : (
            <Text className="p-6 text-muted-foreground">
              {title} list will appear here.
            </Text>
          )
        }
        detailHeader={<Text className="text-sm font-semibold">{title}</Text>}
        inspectorState="closed"
        onInspectorStateChange={() => {}}
        inspectorHeader={null}
        inspector={null}
      >
        {detail}
      </DesktopShell>
    );
  }
  if (section === 'settings' && destination) {
    return (
      <View className="flex-1 bg-background">
        <Button
          variant="ghost"
          accessibilityLabel="Back to Settings"
          onPress={() => {
            setDestination(undefined);
          }}
        >
          <Text>Back to Settings</Text>
        </Button>
        {detail}
      </View>
    );
  }
  return (
    <PhoneShell
      selectedSection={section}
      attentionCount={0}
      drawerOpen={drawerOpen}
      onDrawerOpenChange={setDrawerOpen}
      onSectionChange={selectSection}
      onSearch={() => {}}
      onFilter={() => {}}
    >
      {section === 'settings' ? list : detail}
    </PhoneShell>
  );
}
